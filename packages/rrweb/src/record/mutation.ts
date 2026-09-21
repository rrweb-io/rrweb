import {
  serializeNodeWithId,
  transformAttribute,
  IGNORED_NODE,
  ignoreAttribute,
  isShadowRoot,
  needMaskingText,
  maskInputValue,
  isNativeShadowDom,
  getInputType,
  toLowerCase,
} from 'rrweb-snapshot';
import type { observerParam, MutationBufferParam } from '../types';
import type {
  mutationRecord,
  attributeMutation,
  removedNodeMutation,
  addedNodeMutation,
  styleOMValue,
} from '@rrweb/types';
import {
  isBlocked,
  isAncestorRemoved,
  isIgnored,
  isSerialized,
  hasShadowRoot,
  isSerializedIframe,
  isSerializedStylesheet,
  inDom,
  getShadowHost,
  closestElementOfNode,
  nowTimestamp,
} from '../utils';
import dom from '@rrweb/utils';

type MutatingAttributes = Map<string, string | true | null>;

const moveKey = (id: number, parentId: number) => `${id}@${parentId}`;

/**
 * controls behaviour of a MutationObserver
 */
export default class MutationBuffer {
  private frozen = false;
  private locked = false;

  private throttleMs = 0;
  private lastEmit = new WeakMap<Node, number>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  private textsMap = new Map<Node, string | null>();
  private attributesMap = new Map<HTMLElement, MutatingAttributes>();
  private removes: removedNodeMutation[] = [];
  private mapRemoves: Node[] = [];

  private movedMap: Record<string, true> = {};

  /**
   * the browser MutationObserver emits multiple mutations after
   * a delay for performance reasons, making tracing added nodes hard
   * in our `processMutations` callback function.
   * For example, if we append an element el_1 into body, and then append
   * another element el_2 into el_1, these two mutations may be passed to the
   * callback function together when the two operations were done.
   * Generally we need to trace child nodes of newly added nodes, but in this
   * case if we count el_2 as el_1's child node in the first mutation record,
   * then we will count el_2 again in the second mutation record which was
   * duplicated.
   * To avoid of duplicate counting added nodes, we use a Set to store
   * added nodes and its child nodes during iterate mutation records. Then
   * collect added nodes from the Set which have no duplicate copy. But
   * this also causes newly added nodes will not be serialized with id ASAP,
   * which means all the id related calculation should be lazy too.
   */
  private addedSet = new Set<Node>();
  private movedSet = new Set<Node>();
  private droppedSet = new Set<Node>();
  private removesSubTreeCache = new Set<Node>();

  private mutationCb: observerParam['mutationCb'];
  private blockClass: observerParam['blockClass'];
  private blockSelector: observerParam['blockSelector'];
  private maskTextClass: observerParam['maskTextClass'];
  private maskTextSelector: observerParam['maskTextSelector'];
  private inlineStylesheet: observerParam['inlineStylesheet'];
  private maskInputOptions: observerParam['maskInputOptions'];
  private maskTextFn: observerParam['maskTextFn'];
  private maskInputFn: observerParam['maskInputFn'];
  private keepIframeSrcFn: observerParam['keepIframeSrcFn'];
  private recordCanvas: observerParam['recordCanvas'];
  private inlineImages: observerParam['inlineImages'];
  private slimDOMOptions: observerParam['slimDOMOptions'];
  private sampling: observerParam['sampling'];
  private dataURLOptions: observerParam['dataURLOptions'];
  private doc: observerParam['doc'];
  private mirror: observerParam['mirror'];
  private iframeManager: observerParam['iframeManager'];
  private stylesheetManager: observerParam['stylesheetManager'];
  private shadowDomManager: observerParam['shadowDomManager'];
  private canvasManager: observerParam['canvasManager'];
  private processedNodeManager: observerParam['processedNodeManager'];
  private unattachedDoc: HTMLDocument;

  public init(options: MutationBufferParam) {
    (
      [
        'mutationCb',
        'blockClass',
        'blockSelector',
        'maskTextClass',
        'maskTextSelector',
        'inlineStylesheet',
        'maskInputOptions',
        'maskTextFn',
        'maskInputFn',
        'keepIframeSrcFn',
        'recordCanvas',
        'inlineImages',
        'slimDOMOptions',
        'sampling',
        'dataURLOptions',
        'doc',
        'mirror',
        'iframeManager',
        'stylesheetManager',
        'shadowDomManager',
        'canvasManager',
        'processedNodeManager',
      ] as const
    ).forEach((key) => {
      // just a type trick, the runtime result is correct
      this[key] = options[key] as never;
    });

    this.throttleMs = this.sampling.mutation || 0;
  }

  public freeze() {
    this.frozen = true;
    this.canvasManager.freeze();
  }

  public unfreeze() {
    this.frozen = false;
    this.canvasManager.unfreeze();
    this.emit(true);
  }

  public isFrozen() {
    return this.frozen;
  }

  public lock() {
    this.locked = true;
    this.canvasManager.lock();
  }

  public unlock() {
    this.locked = false;
    this.canvasManager.unlock();
    this.emit(true);
  }

  public reset() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.shadowDomManager.reset();
    this.canvasManager.reset();
  }

  public processMutations = (mutations: mutationRecord[]) => {
    mutations.forEach(this.processMutation); // adds mutations to the buffer
    this.emit(); // clears buffer if not locked/frozen
  };

  public emit = (force = false) => {
    if (this.frozen || this.locked) {
      return;
    }

    // delay any modification of the mirror until this function
    // so that the mirror for takeFullSnapshot doesn't get mutated while it's event is being processed

    const adds: addedNodeMutation[] = [];
    const addedIds = new Set<number>();

    while (this.mapRemoves.length) {
      this.mirror.removeNodeFromMap(this.mapRemoves.shift()!);
    }

    for (const n of this.movedSet) {
      const parentNode = dom.parentNode(n);
      if (
        this.removesSubTreeCache.has(parentNode as Node) &&
        !this.movedSet.has(parentNode as Node)
      ) {
        continue;
      }
      this.addedSet.add(n);
    }

    let n: Node | null = null;
    let parentNode: Node | null = null;
    let parentId = -1;
    let nextSibling: Node | null = null;
    let ancestorBad = false;
    const missingParents = new Set<Node>();
    const iter = this.addedSet.values();
    let curr = iter.next();
    while (this.addedSet.size) {
      if (n !== null && this.addedSet.has(dom.previousSibling(n) as Node)) {
        // reuse parentNode, parentId, ancestorBad
        nextSibling = n; // n is a good next sibling
        n = dom.previousSibling(n) as Node;
      } else {
        if (!this.addedSet.has(curr.value as Node)) {
          // having the `iter` here rather than picking directly from this.addedSet
          // ensures we don't get caught re-traversing 'tombstones' in the Set
          // (we reuse curr in multiple iterations until it's ancestors and nextSiblings are serialized)
          curr = iter.next();
        }
        n = curr.value as Node;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          parentNode = dom.parentNode(n);
          if (this.addedSet.has(parentNode as Node)) {
            // start at top of added tree so as not to serialize children before their parents (parentId requirement)
            n = parentNode as Node;
            continue;
          }
          break;
        }

        if (missingParents.has(parentNode as Node)) {
          parentNode = null;
        } else if (parentNode) {
          // we have a new parentNode for a 'row' of DOM children
          // perf: we reuse these calculations across all child nodes

          if (!inDom(parentNode)) {
            ancestorBad = true;
          } else {
            ancestorBad =
              isSelfOrAncestorInSet(this.droppedSet, parentNode) ||
              this.removesSubTreeCache.has(parentNode);

            if (ancestorBad && isSelfOrAncestorInSet(this.movedSet, n)) {
              // not bad, just moved
              ancestorBad = false;
            }
          }

          if (this.addedSet.has(dom.lastChild(parentNode) as Node)) {
            // jump instead of crawling nextSibling to nextSibling
            n = dom.lastChild(parentNode) as Node;
            nextSibling = null;
          } else {
            // eslint-disable-next-line no-constant-condition
            while (true) {
              nextSibling = dom.nextSibling(n);
              if (this.addedSet.has(nextSibling as Node)) {
                // keep going as we can't serialize a node before it's next sibling (nextId requirement)
                n = nextSibling as Node;
                continue;
              }
              break;
            }
          }

          parentId = isShadowRoot(parentNode)
            ? this.mirror.getId(getShadowHost(n))
            : this.mirror.getId(parentNode);

          // If the node is the direct child of a shadow root, we treat the shadow host as its parent node.
          if (
            parentId === -1 &&
            parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE
          ) {
            const shadowHost = dom.host(parentNode as ShadowRoot);
            parentId = this.mirror.getId(shadowHost);
          }
        }
      }

      this.addedSet.delete(n); // don't re-iterate

      if (!parentNode || parentId === -1) {
        missingParents.add(n); // ensure any added child nodes can also early-out
        continue;
      } else if (ancestorBad) {
        // it's possible we could unify missingParents and this.droppedSet
        // but would need to check the subtleties
        this.droppedSet.add(n);
        continue;
      }

      let cssCaptured = false;
      if (n.nodeType === Node.TEXT_NODE) {
        const parentTag = (parentNode as Element).tagName;
        if (parentTag === 'TEXTAREA') {
          // enqueueTextAreaValueMutation already called via parent
          continue;
        } else if (parentTag === 'STYLE' && addedIds.has(parentId)) {
          // css content will be recorded via parent's _cssText attribute when
          // mutation adds entire <style> element
          cssCaptured = true;
        }
      }

      let nextId = nextSibling ? this.mirror.getId(nextSibling) : null;
      while (nextId === IGNORED_NODE) {
        nextSibling = nextSibling && dom.nextSibling(nextSibling);
        nextId = nextSibling && this.mirror.getId(nextSibling);
      }
      if (nextId === -1) {
        // sibling not included in addedNodes, but
        // no id as not yet serialized?
        console.warn(
          "Couldn't record new node. Couldn't find mirror id for nextSibling:",
          nextSibling,
        );
        n = null; // don't iterate to previousSibling as we haven't successful serialized this node
        continue;
      }
      const sn = serializeNodeWithId(n, {
        doc: this.doc,
        mirror: this.mirror,
        blockClass: this.blockClass,
        blockSelector: this.blockSelector,
        maskTextClass: this.maskTextClass,
        maskTextSelector: this.maskTextSelector,
        skipChild: true,
        newlyAddedElement: true,
        inlineStylesheet: this.inlineStylesheet,
        maskInputOptions: this.maskInputOptions,
        maskTextFn: this.maskTextFn,
        maskInputFn: this.maskInputFn,
        slimDOMOptions: this.slimDOMOptions,
        dataURLOptions: this.dataURLOptions,
        recordCanvas: this.recordCanvas,
        inlineImages: this.inlineImages,
        onSerialize: (currentN) => {
          if (isSerializedIframe(currentN, this.mirror)) {
            this.iframeManager.addIframe(currentN as HTMLIFrameElement);
          }
          if (isSerializedStylesheet(currentN, this.mirror)) {
            this.stylesheetManager.trackLinkElement(
              currentN as HTMLLinkElement,
            );
          }
          if (hasShadowRoot(n as Node)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.shadowDomManager.addShadowRoot(
              dom.shadowRoot(n as Node)!,
              this.doc,
            );
          }
        },
        onIframeLoad: (iframe, childSn) => {
          this.iframeManager.attachIframe(iframe, childSn);
          this.shadowDomManager.observeAttachShadow(iframe);
        },
        onStylesheetLoad: (link, childSn) => {
          this.stylesheetManager.attachLinkElement(link, childSn);
        },
        cssCaptured,
      });
      if (sn) {
        adds.push({
          parentId,
          nextId,
          node: sn,
        });
        addedIds.add(sn.id);
      }
    }

    const now = nowTimestamp();
    const heldTextsMap = new Map<Node, string | null>();
    const heldAttributesMap = new Map<HTMLElement, MutatingAttributes>();
    const forceDueAttrs = new Set<Node>();
    let nextDueAt = Infinity;

    const isDue = (node: Node): boolean => {
      if (force || !this.throttleMs) {
        return true;
      }
      const last = this.lastEmit.get(node);
      if (last === undefined || now - last >= this.throttleMs) {
        return true;
      }
      nextDueAt = Math.min(nextDueAt, last + this.throttleMs);
      return false;
    };

    const dueTexts: [Node, string | null][] = [];
    for (const entry of this.textsMap) {
      if (isDue(entry[0])) {
        this.lastEmit.set(entry[0], now);
        dueTexts.push(entry);
      } else {
        heldTextsMap.set(entry[0], entry[1]);
      }
    }

    const texts = dueTexts
      .map(([target, value]) => {
        const parent = dom.parentNode(target);
        if (parent && (parent as Element).tagName === 'TEXTAREA') {
          // the node is being ignored as it isn't in the mirror, so shift mutation to attributes on parent textarea
          // this will be immediately picked up in resolveAttributes below
          this.enqueueTextAreaValueMutation(parent as HTMLTextAreaElement);
          forceDueAttrs.add(parent);
        }
        return {
          id: this.mirror.getId(target),
          value,
        };
      })
      // no need to include them on added elements, as they have just been serialized with up to date attribubtes
      .filter((text) => !addedIds.has(text.id))
      // text mutation's id was not in the mirror map means the target node has been removed
      .filter((text) => this.mirror.has(text.id));

    const dueAttributes: [HTMLElement, MutatingAttributes][] = [];
    for (const entry of this.attributesMap) {
      if (forceDueAttrs.has(entry[0]) || isDue(entry[0])) {
        this.lastEmit.set(entry[0], now);
        dueAttributes.push(entry);
      } else {
        heldAttributesMap.set(entry[0], entry[1]);
      }
    }

    const attributes = dueAttributes
      .map(([target, mutatingAttributes]) => ({
        id: this.mirror.getId(target),
        attributes: this.resolveAttributes(target, mutatingAttributes),
      }))
      // no need to include them on added elements, as they have just been serialized with up to date attribubtes
      .filter((attribute) => !addedIds.has(attribute.id))
      // attribute mutation's id was not in the mirror map means the target node has been removed
      .filter((attribute) => this.mirror.has(attribute.id))
      .filter((attribute) => Object.keys(attribute.attributes).length > 0);

    const payload = {
      texts,
      attributes,
      removes: this.removes,
      adds,
    };

    this.textsMap = heldTextsMap;
    this.attributesMap = heldAttributesMap;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (nextDueAt !== Infinity) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.emit();
      }, Math.max(0, nextDueAt - now));
    }

    // payload may be empty if the mutations happened in some blocked elements
    if (
      !payload.texts.length &&
      !payload.attributes.length &&
      !payload.removes.length &&
      !payload.adds.length
    ) {
      return;
    }

    // reset
    this.removes = [];
    this.addedSet = new Set<Node>();
    this.movedSet = new Set<Node>();
    this.droppedSet = new Set<Node>();
    this.removesSubTreeCache = new Set<Node>();
    this.movedMap = {};

    this.mutationCb(payload);
  };

  private enqueueTextAreaValueMutation = (textarea: HTMLTextAreaElement) => {
    let mutatingAttributes = this.attributesMap.get(textarea);
    if (!mutatingAttributes) {
      mutatingAttributes = new Map();
      this.attributesMap.set(textarea, mutatingAttributes);
    }
    // we don't know real 'oldValue' because it comes from childnodes, so this is a sentinel
    mutatingAttributes.set('value', true);
  };

  private resolveAttributes = (
    target: HTMLElement,
    mutatingAttributes: MutatingAttributes,
  ): attributeMutation['attributes'] => {
    const tagNameLower = toLowerCase(target.tagName);
    const attributes: attributeMutation['attributes'] = {};
    const styleDiff: styleOMValue = {};
    const unchangedStyles: styleOMValue = {};

    for (let [name, maybeSentinel] of mutatingAttributes) {
      const oldValue: string | null =
        maybeSentinel === true ? '' : maybeSentinel;
      let value = target.getAttribute(name);

      if (name === 'value') {
        if (target.tagName === 'TEXTAREA') {
          if (maybeSentinel !== true) {
            // an actual mutation on the value attribute doesn't affect
            // the textarea content and needs to be ignored
            continue;
          }
          value = Array.from(
            dom.childNodes(target),
            (cn) => dom.textContent(cn) || '',
          ).join('');
        }
        value = maskInputValue({
          element: target,
          maskInputOptions: this.maskInputOptions,
          tagName: target.tagName,
          type: getInputType(target),
          value,
          maskInputFn: this.maskInputFn,
        });
      }

      let rr_open_mode = null;
      if (name === 'open' && tagNameLower === 'dialog') {
        // we don't know what the oldValue was for rr_open_mode
        // so always emit { open, rr_open_mode }
        if (target.matches('dialog:modal')) {
          rr_open_mode = 'modal';
        } else {
          rr_open_mode = 'non-modal';
        }
      } else if (name === 'value' && tagNameLower === 'textarea') {
        // we don't have a good idea of oldValue as value is derived from childNodes so always emit
      } else if (value === oldValue) {
        // no net change
        continue;
      }

      if (
        tagNameLower === 'iframe' &&
        name === 'src' &&
        !this.keepIframeSrcFn(value as string)
      ) {
        if (!(target as HTMLIFrameElement).contentDocument) {
          // we can't record it directly as we can't see into it
          // preserve the src attribute so a decision can be taken at replay time
          name = 'rr_src';
        } else {
          continue;
        }
      }
      if (ignoreAttribute(tagNameLower, name, value)) {
        continue;
      }
      attributes[name] = transformAttribute(
        this.doc,
        tagNameLower,
        toLowerCase(name),
        value,
      );
      if (name === 'style') {
        if (!this.unattachedDoc) {
          try {
            // avoid upsetting original document from a Content Security point of view
            this.unattachedDoc = document.implementation.createHTMLDocument();
          } catch (e) {
            // fallback to more direct method
            this.unattachedDoc = this.doc;
          }
        }
        const old = this.unattachedDoc.createElement('span');
        if (oldValue) {
          old.setAttribute('style', oldValue);
        }
        for (const pname of Array.from(target.style)) {
          const newValue = target.style.getPropertyValue(pname);
          const newPriority = target.style.getPropertyPriority(pname);
          if (
            newValue !== old.style.getPropertyValue(pname) ||
            newPriority !== old.style.getPropertyPriority(pname)
          ) {
            if (newPriority === '') {
              styleDiff[pname] = newValue;
            } else {
              styleDiff[pname] = [newValue, newPriority];
            }
          } else {
            // for checking
            unchangedStyles[pname] = [newValue, newPriority];
          }
        }
        for (const pname of Array.from(old.style)) {
          if (target.style.getPropertyValue(pname) === '') {
            // "if not set, returns the empty string"
            styleDiff[pname] = false; // delete
          }
        }
      }
      if (rr_open_mode) {
        attributes['rr_open_mode'] = rr_open_mode;
      }
    }

    if (typeof attributes.style === 'string') {
      const diffAsStr = JSON.stringify(styleDiff);
      const unchangedAsStr = JSON.stringify(unchangedStyles);
      // check if the style diff is actually shorter than the regular string based mutation
      // (which was the whole point of #464 'compact style mutation').
      if (diffAsStr.length < attributes.style.length) {
        // also: CSSOM fails badly when var() is present on shorthand properties, so only proceed with
        // the compact style mutation if these have all been accounted for
        if (
          (diffAsStr + unchangedAsStr).split('var(').length ===
          attributes.style.split('var(').length
        ) {
          attributes.style = styleDiff;
        }
      }
    }

    return attributes;
  };

  private processMutation = (m: mutationRecord) => {
    if (isIgnored(m.target, this.mirror, this.slimDOMOptions)) {
      return;
    }
    switch (m.type) {
      case 'characterData': {
        const value = dom.textContent(m.target);

        if (
          !isBlocked(m.target, this.blockClass, this.blockSelector, false) &&
          value !== m.oldValue
        ) {
          const maskedValue =
            needMaskingText(
              m.target,
              this.maskTextClass,
              this.maskTextSelector,
              true, // checkAncestors
            ) && value
              ? this.maskTextFn
                ? this.maskTextFn(value, closestElementOfNode(m.target))
                : value.replace(/[\S]/g, '*')
              : value;
          this.textsMap.set(m.target, maskedValue);
        }
        break;
      }
      case 'attributes': {
        const target = m.target as HTMLElement;
        const tagNameLower = toLowerCase(target.tagName);
        const attributeName = m.attributeName as string;

        if (isBlocked(m.target, this.blockClass, this.blockSelector, false)) {
          return;
        }

        // Keep this property on inputs that used to be password inputs
        // This is used to ensure we do not unmask value when using e.g. a "Show password" type button
        if (
          attributeName === 'type' &&
          tagNameLower === 'input' &&
          (m.oldValue || '').toLowerCase() === 'password'
        ) {
          target.setAttribute('data-rr-is-password', 'true');
        }

        let mutatingAttributes = this.attributesMap.get(target);
        if (!mutatingAttributes) {
          mutatingAttributes = new Map();
          this.attributesMap.set(target, mutatingAttributes);
        }
        // we're only interested in first old value while throttled/frozen
        if (!mutatingAttributes.has(attributeName)) {
          mutatingAttributes.set(attributeName, m.oldValue);
        }
        break;
      }
      case 'childList': {
        /**
         * Parent is blocked, ignore all child mutations
         */
        if (isBlocked(m.target, this.blockClass, this.blockSelector, true))
          return;

        if ((m.target as Element).tagName === 'TEXTAREA') {
          // children would be ignored in genAdds as they aren't in the mirror
          this.enqueueTextAreaValueMutation(m.target as HTMLTextAreaElement);
          return; // any removedNodes won't have been in mirror either
        }

        m.addedNodes.forEach((n) => this.genAdds(n, m.target));
        m.removedNodes.forEach((n) => {
          const nodeId = this.mirror.getId(n);
          const parentId = isShadowRoot(m.target)
            ? this.mirror.getId(dom.host(m.target))
            : this.mirror.getId(m.target);
          if (
            isBlocked(m.target, this.blockClass, this.blockSelector, false) ||
            isIgnored(n, this.mirror, this.slimDOMOptions) ||
            !isSerialized(n, this.mirror)
          ) {
            return;
          }
          // removed node has not been serialized yet, just remove it from the Set
          if (this.addedSet.has(n)) {
            deepDelete(this.addedSet, n);
            this.droppedSet.add(n);
          } else if (this.addedSet.has(m.target) && nodeId === -1) {
            /**
             * If target was newly added and removed child node was
             * not serialized, it means the child node has been removed
             * before callback fired, so we can ignore it because
             * newly added node will be serialized without child nodes.
             * TODO: verify this
             */
          } else if (isAncestorRemoved(m.target, this.mirror)) {
            /**
             * If parent id was not in the mirror map any more, it
             * means the parent node has already been removed. So
             * the node is also removed which we do not need to track
             * and replay.
             */
          } else if (
            this.movedSet.has(n) &&
            this.movedMap[moveKey(nodeId, parentId)]
          ) {
            deepDelete(this.movedSet, n);
          } else {
            this.removes.push({
              parentId,
              id: nodeId,
              isShadow:
                isShadowRoot(m.target) && isNativeShadowDom(m.target)
                  ? true
                  : undefined,
            });
            processRemoves(n, this.removesSubTreeCache);
          }
          this.textsMap.delete(n);
          this.attributesMap.delete(n as HTMLElement);
          this.mapRemoves.push(n);
        });
        break;
      }
      default:
        break;
    }
  };

  /**
   * Make sure you check if `n`'s parent is blocked before calling this function
   * */
  private genAdds = (n: Node, target?: Node) => {
    // this node was already recorded in other buffer, ignore it
    if (this.processedNodeManager.inOtherBuffer(n, this)) return;

    // if n is added to set, there is no need to travel it and its' children again
    if (this.addedSet.has(n) || this.movedSet.has(n)) return;

    if (this.mirror.hasNode(n)) {
      if (isIgnored(n, this.mirror, this.slimDOMOptions)) {
        return;
      }
      this.movedSet.add(n);
      let targetId: number | null = null;
      if (target && this.mirror.hasNode(target)) {
        targetId = this.mirror.getId(target);
      }
      if (targetId && targetId !== -1) {
        this.movedMap[moveKey(this.mirror.getId(n), targetId)] = true;
      }
    } else {
      this.addedSet.add(n);
      this.droppedSet.delete(n);
    }

    // if this node is blocked `serializeNode` will turn it into a placeholder element
    // but we have to remove it's children otherwise they will be added as placeholders too
    if (!isBlocked(n, this.blockClass, this.blockSelector, false)) {
      dom.childNodes(n).forEach((childN) => this.genAdds(childN));
      if (hasShadowRoot(n)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        dom.childNodes(dom.shadowRoot(n)!).forEach((childN) => {
          this.processedNodeManager.add(childN, this);
          this.genAdds(childN, n);
        });
      }
    }
  };
}

/**
 * Some utils to handle the mutation observer DOM records.
 * It should be more clear to extend the native data structure
 * like Set and Map, but currently Typescript does not support
 * that.
 */
function deepDelete(addsSet: Set<Node>, n: Node) {
  addsSet.delete(n);
  dom.childNodes(n).forEach((childN) => deepDelete(addsSet, childN));
}

function processRemoves(n: Node, cache: Set<Node>) {
  const queue = [n];

  while (queue.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const next = queue.pop()!;
    if (cache.has(next)) continue;
    cache.add(next);
    dom.childNodes(next).forEach((n) => queue.push(n));
  }

  return;
}

function isSelfOrAncestorInSet(set: Set<Node>, n: Node): boolean {
  if (set.size === 0) return false;
  return _isSelfOrAncestorInSet(set, n);
}

function _isSelfOrAncestorInSet(set: Set<Node>, n: Node): boolean {
  if (set.has(n)) {
    return true;
  }
  const parent = dom.parentNode(n);
  if (!parent) {
    return false;
  }
  return _isSelfOrAncestorInSet(set, parent);
}
