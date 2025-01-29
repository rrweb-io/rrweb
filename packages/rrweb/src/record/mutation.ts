import {
  serializeNodeWithId,
  transformAttribute,
  IGNORED_NODE,
  ignoreAttribute,
  isShadowRoot,
  needMaskingText,
  maskInputValue,
  Mirror,
  isNativeShadowDom,
  getInputType,
  toLowerCase,
} from '@saola.ai/rrweb-snapshot';
import type { observerParam, MutationBufferParam } from '../types';
import type {
  mutationRecord,
  textCursor,
  attributeCursor,
  removedNodeMutation,
  addedNodeMutation,
  Optional,
} from '@saola.ai/rrweb-types';
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
} from '../utils';
import dom from '@saola.ai/rrweb-utils';

type DoubleLinkedListNode = {
  previous: DoubleLinkedListNode | null;
  next: DoubleLinkedListNode | null;
  value: NodeInLinkedList;
};
type NodeInLinkedList = Node & {
  __ln: DoubleLinkedListNode;
};

function isNodeInLinkedList(n: Node | NodeInLinkedList): n is NodeInLinkedList {
  return '__ln' in n;
}

class DoubleLinkedList {
  public length = 0;
  public head: DoubleLinkedListNode | null = null;
  public tail: DoubleLinkedListNode | null = null;

  public get(position: number) {
    if (position >= this.length) {
      throw new Error('Position outside of list range');
    }

    let current = this.head;
    for (let index = 0; index < position; index++) {
      current = current?.next || null;
    }
    return current;
  }

  public addNode(n: Node) {
    const node: DoubleLinkedListNode = {
      value: n as NodeInLinkedList,
      previous: null,
      next: null,
    };
    (n as NodeInLinkedList).__ln = node;
    if (n.previousSibling && isNodeInLinkedList(n.previousSibling)) {
      const current = n.previousSibling.__ln.next;
      node.next = current;
      node.previous = n.previousSibling.__ln;
      n.previousSibling.__ln.next = node;
      if (current) {
        current.previous = node;
      }
    } else if (
      n.nextSibling &&
      isNodeInLinkedList(n.nextSibling) &&
      n.nextSibling.__ln.previous
    ) {
      const current = n.nextSibling.__ln.previous;
      node.previous = current;
      node.next = n.nextSibling.__ln;
      n.nextSibling.__ln.previous = node;
      if (current) {
        current.next = node;
      }
    } else {
      if (this.head) {
        this.head.previous = node;
      }
      node.next = this.head;
      this.head = node;
    }
    if (node.next === null) {
      this.tail = node;
    }
    this.length++;
  }

  public removeNode(n: NodeInLinkedList) {
    const current = n.__ln;
    if (!this.head) {
      return;
    }

    if (!current.previous) {
      this.head = current.next;
      if (this.head) {
        this.head.previous = null;
      } else {
        this.tail = null;
      }
    } else {
      current.previous.next = current.next;
      if (current.next) {
        current.next.previous = current.previous;
      } else {
        this.tail = current.previous;
      }
    }
    if (n.__ln) {
      delete (n as Optional<NodeInLinkedList, '__ln'>).__ln;
    }
    this.length--;
  }
}

const moveKey = (id: number, parentId: number) => `${id}@${parentId}`;

/**
 * controls behaviour of a MutationObserver
 */
export default class MutationBuffer {
  private frozen = false;
  private locked = false;

  private texts: textCursor[] = [];
  private attributes: attributeCursor[] = [];
  private attributeMap = new WeakMap<Node, attributeCursor>();
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
  }

  public freeze() {
    this.frozen = true;
    this.canvasManager.freeze();
  }

  public unfreeze() {
    this.frozen = false;
    this.canvasManager.unfreeze();
    this.emit();
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
    this.emit();
  }

  public reset() {
    this.shadowDomManager.reset();
    this.canvasManager.reset();
  }

  public processMutations = (mutations: mutationRecord[]) => {
    mutations.forEach(this.processMutation); // adds mutations to the buffer
    this.emit(); // clears buffer if not locked/frozen
  };

  public emit = () => {
    if (this.frozen || this.locked) {
      return;
    }

    // delay any modification of the mirror until this function
    // so that the mirror for takeFullSnapshot doesn't get mutated while it's event is being processed

    const adds: addedNodeMutation[] = [];
    const addedIds = new Set<number>();

    /**
     * Sometimes child node may be pushed before its newly added
     * parent, so we init a queue to store these nodes.
     */
    const addList = new DoubleLinkedList();
    const getNextId = (n: Node): number | null => {
      let ns: Node | null = n;
      let nextId: number | null = IGNORED_NODE; // slimDOM: ignored
      while (nextId === IGNORED_NODE) {
        ns = ns && ns.nextSibling;
        nextId = ns && this.mirror.getId(ns);
      }
      return nextId;
    };
    const pushAdd = (n: Node) => {
      const parent = dom.parentNode(n);
      if (!parent || !inDom(n)) {
        return;
      }
      let cssCaptured = false;
      if (n.nodeType === Node.TEXT_NODE) {
        const parentTag = (parent as Element).tagName;
        if (parentTag === 'TEXTAREA') {
          // genTextAreaValueMutation already called via parent
          return;
        } else if (parentTag === 'STYLE' && this.addedSet.has(parent)) {
          // css content will be recorded via parent's _cssText attribute when
          // mutation adds entire <style> element
          cssCaptured = true;
        }
      }

      const parentId = isShadowRoot(parent)
        ? this.mirror.getId(getShadowHost(n))
        : this.mirror.getId(parent);

      const nextId = getNextId(n);
      if (parentId === -1 || nextId === -1) {
        return addList.addNode(n);
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
          if (hasShadowRoot(n)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.shadowDomManager.addShadowRoot(dom.shadowRoot(n)!, this.doc);
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
    };

    while (this.mapRemoves.length) {
      this.mirror.removeNodeFromMap(this.mapRemoves.shift()!);
    }

    for (const n of this.movedSet) {
      if (
        isParentRemoved(this.removesSubTreeCache, n, this.mirror) &&
        !this.movedSet.has(dom.parentNode(n)!)
      ) {
        continue;
      }
      pushAdd(n);
    }

    for (const n of this.addedSet) {
      if (
        !isAncestorInSet(this.droppedSet, n) &&
        !isParentRemoved(this.removesSubTreeCache, n, this.mirror)
      ) {
        pushAdd(n);
      } else if (isAncestorInSet(this.movedSet, n)) {
        pushAdd(n);
      } else {
        this.droppedSet.add(n);
      }
    }

    let candidate: DoubleLinkedListNode | null = null;
    while (addList.length) {
      let node: DoubleLinkedListNode | null = null;
      if (candidate) {
        const parentId = this.mirror.getId(dom.parentNode(candidate.value));
        const nextId = getNextId(candidate.value);
        if (parentId !== -1 && nextId !== -1) {
          node = candidate;
        }
      }
      if (!node) {
        let tailNode = addList.tail;
        while (tailNode) {
          const _node = tailNode;
          tailNode = tailNode.previous;
          // ensure _node is defined before attempting to find value
          if (_node) {
            const parentId = this.mirror.getId(dom.parentNode(_node.value));
            const nextId = getNextId(_node.value);

            if (nextId === -1) continue;
            // nextId !== -1 && parentId !== -1
            else if (parentId !== -1) {
              node = _node;
              break;
            }
            // nextId !== -1 && parentId === -1 This branch can happen if the node is the child of shadow root
            else {
              const unhandledNode = _node.value;
              const parent = dom.parentNode(unhandledNode);
              // If the node is the direct child of a shadow root, we treat the shadow host as its parent node.
              if (parent && parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                const shadowHost = dom.host(parent as ShadowRoot);
                const parentId = this.mirror.getId(shadowHost);
                if (parentId !== -1) {
                  node = _node;
                  break;
                }
              }
            }
          }
        }
      }
      if (!node) {
        /**
         * If all nodes in queue could not find a serialized parent,
         * it may be a bug or corner case. We need to escape the
         * dead while loop at once.
         */
        while (addList.head) {
          addList.removeNode(addList.head.value);
        }
        break;
      }
      candidate = node.previous;
      addList.removeNode(node.value);
      pushAdd(node.value);
    }

    const payload = {
      texts: this.texts
        .map((text) => {
          const n = text.node;
          const parent = dom.parentNode(n);
          if (parent && (parent as Element).tagName === 'TEXTAREA') {
            // the node is being ignored as it isn't in the mirror, so shift mutation to attributes on parent textarea
            this.genTextAreaValueMutation(parent as HTMLTextAreaElement);
          }
          return {
            id: this.mirror.getId(n),
            value: text.value,
          };
        })
        // no need to include them on added elements, as they have just been serialized with up to date attribubtes
        .filter((text) => !addedIds.has(text.id))
        // text mutation's id was not in the mirror map means the target node has been removed
        .filter((text) => this.mirror.has(text.id)),
      attributes: this.attributes
        .map((attribute) => {
          const { attributes } = attribute;
          if (typeof attributes.style === 'string') {
            const diffAsStr = JSON.stringify(attribute.styleDiff);
            const unchangedAsStr = JSON.stringify(attribute._unchangedStyles);
            // check if the style diff is actually shorter than the regular string based mutation
            // (which was the whole point of #464 'compact style mutation').
            if (diffAsStr.length < attributes.style.length) {
              // also: CSSOM fails badly when var() is present on shorthand properties, so only proceed with
              // the compact style mutation if these have all been accounted for
              if (
                (diffAsStr + unchangedAsStr).split('var(').length ===
                attributes.style.split('var(').length
              ) {
                attributes.style = attribute.styleDiff;
              }
            }
          }
          return {
            id: this.mirror.getId(attribute.node),
            attributes: attributes,
          };
        })
        // no need to include them on added elements, as they have just been serialized with up to date attribubtes
        .filter((attribute) => !addedIds.has(attribute.id))
        // attribute mutation's id was not in the mirror map means the target node has been removed
        .filter((attribute) => this.mirror.has(attribute.id)),
      removes: this.removes,
      adds,
    };
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
    this.texts = [];
    this.attributes = [];
    this.attributeMap = new WeakMap<Node, attributeCursor>();
    this.removes = [];
    this.addedSet = new Set<Node>();
    this.movedSet = new Set<Node>();
    this.droppedSet = new Set<Node>();
    this.removesSubTreeCache = new Set<Node>();
    this.movedMap = {};

    this.mutationCb(payload);
  };

  private genTextAreaValueMutation = (textarea: HTMLTextAreaElement) => {
    let item = this.attributeMap.get(textarea);
    if (!item) {
      item = {
        node: textarea,
        attributes: {},
        styleDiff: {},
        _unchangedStyles: {},
      };
      this.attributes.push(item);
      this.attributeMap.set(textarea, item);
    }
    item.attributes.value = Array.from(
      dom.childNodes(textarea),
      (cn) => dom.textContent(cn) || '',
    ).join('');
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
          this.texts.push({
            value:
              needMaskingText(
                m.target,
                this.maskTextClass,
                this.maskTextSelector,
                true, // checkAncestors
              ) && value
                ? this.maskTextFn
                  ? this.maskTextFn(value, closestElementOfNode(m.target))
                  : value.replace(/[\S]/g, '*')
                : value,
            node: m.target,
          });
        }
        break;
      }
      case 'attributes': {
        const target = m.target as HTMLElement;
        let attributeName = m.attributeName as string;
        let value = (m.target as HTMLElement).getAttribute(attributeName);

        if (attributeName === 'value') {
          const type = getInputType(target);

          value = maskInputValue({
            element: target,
            maskInputOptions: this.maskInputOptions,
            tagName: target.tagName,
            type,
            value,
            maskInputFn: this.maskInputFn,
          });
        }
        if (
          isBlocked(m.target, this.blockClass, this.blockSelector, false) ||
          value === m.oldValue
        ) {
          return;
        }

        let item = this.attributeMap.get(m.target);
        if (
          target.tagName === 'IFRAME' &&
          attributeName === 'src' &&
          !this.keepIframeSrcFn(value as string)
        ) {
          if (!(target as HTMLIFrameElement).contentDocument) {
            // we can't record it directly as we can't see into it
            // preserve the src attribute so a decision can be taken at replay time
            attributeName = 'rr_src';
          } else {
            return;
          }
        }
        if (!item) {
          item = {
            node: m.target,
            attributes: {},
            styleDiff: {},
            _unchangedStyles: {},
          };
          this.attributes.push(item);
          this.attributeMap.set(m.target, item);
        }

        // Keep this property on inputs that used to be password inputs
        // This is used to ensure we do not unmask value when using e.g. a "Show password" type button
        if (
          attributeName === 'type' &&
          target.tagName === 'INPUT' &&
          (m.oldValue || '').toLowerCase() === 'password'
        ) {
          target.setAttribute('data-rr-is-password', 'true');
        }

        if (!ignoreAttribute(target.tagName, attributeName, value)) {
          // overwrite attribute if the mutations was triggered in same time
          item.attributes[attributeName] = transformAttribute(
            this.doc,
            toLowerCase(target.tagName),
            toLowerCase(attributeName),
            value,
          );
          if (attributeName === 'style') {
            if (!this.unattachedDoc) {
              try {
                // avoid upsetting original document from a Content Security point of view
                this.unattachedDoc =
                  document.implementation.createHTMLDocument();
              } catch (e) {
                // fallback to more direct method
                this.unattachedDoc = this.doc;
              }
            }
            const old = this.unattachedDoc.createElement('span');
            if (m.oldValue) {
              old.setAttribute('style', m.oldValue);
            }
            for (const pname of Array.from(target.style)) {
              const newValue = target.style.getPropertyValue(pname);
              const newPriority = target.style.getPropertyPriority(pname);
              if (
                newValue !== old.style.getPropertyValue(pname) ||
                newPriority !== old.style.getPropertyPriority(pname)
              ) {
                if (newPriority === '') {
                  item.styleDiff[pname] = newValue;
                } else {
                  item.styleDiff[pname] = [newValue, newPriority];
                }
              } else {
                // for checking
                item._unchangedStyles[pname] = [newValue, newPriority];
              }
            }
            for (const pname of Array.from(old.style)) {
              if (target.style.getPropertyValue(pname) === '') {
                // "if not set, returns the empty string"
                item.styleDiff[pname] = false; // delete
              }
            }
          } else if (attributeName === 'open' && target.tagName === 'DIALOG') {
            if (target.matches('dialog:modal')) {
              item.attributes['rr_open_mode'] = 'modal';
            } else {
              item.attributes['rr_open_mode'] = 'non-modal';
            }
          }
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
          this.genTextAreaValueMutation(m.target as HTMLTextAreaElement);
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

function isParentRemoved(removes: Set<Node>, n: Node, mirror: Mirror): boolean {
  if (removes.size === 0) return false;
  return _isParentRemoved(removes, n, mirror);
}

function _isParentRemoved(
  removes: Set<Node>,
  n: Node,
  _mirror: Mirror,
): boolean {
  const node: ParentNode | null = dom.parentNode(n);
  if (!node) return false;
  return removes.has(node);
}

function isAncestorInSet(set: Set<Node>, n: Node): boolean {
  if (set.size === 0) return false;
  return _isAncestorInSet(set, n);
}

function _isAncestorInSet(set: Set<Node>, n: Node): boolean {
  const parent = dom.parentNode(n);
  if (!parent) {
    return false;
  }
  if (set.has(parent)) {
    return true;
  }
  return _isAncestorInSet(set, parent);
}
