import {
  serializeNodeWithId,
  transformAttribute,
  IGNORED_NODE,
  isShadowRoot,
  needMaskingText,
  maskInputValue,
  Mirror,
} from 'rrweb-snapshot';
import {
  mutationRecord,
  textCursor,
  attributeCursor,
  removedNodeMutation,
  addedNodeMutation,
  styleAttributeValue,
  observerParam,
  MutationBufferParam,
  Optional,
} from '../types';
import {
  isBlocked,
  isAncestorRemoved,
  isIgnored,
  isSerialized,
  hasShadowRoot,
  isSerializedIframe,
} from '../utils';

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
      }
    } else {
      current.previous.next = current.next;
      if (current.next) {
        current.next.previous = current.previous;
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
  private frozen: boolean = false;
  private locked: boolean = false;

  private texts: textCursor[] = [];
  private attributes: attributeCursor[] = [];
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

  private mutationCb: observerParam['mutationCb'];
  private blockClass: observerParam['blockClass'];
  private blockSelector: observerParam['blockSelector'];
  private maskTextClass: observerParam['maskTextClass'];
  private maskTextSelector: observerParam['maskTextSelector'];
  private inlineStylesheet: observerParam['inlineStylesheet'];
  private maskInputOptions: observerParam['maskInputOptions'];
  private maskTextFn: observerParam['maskTextFn'];
  private maskInputFn: observerParam['maskInputFn'];
  private recordCanvas: observerParam['recordCanvas'];
  private inlineImages: observerParam['inlineImages'];
  private slimDOMOptions: observerParam['slimDOMOptions'];
  private doc: observerParam['doc'];
  private mirror: observerParam['mirror'];
  private iframeManager: observerParam['iframeManager'];
  private shadowDomManager: observerParam['shadowDomManager'];
  private canvasManager: observerParam['canvasManager'];

  public init(options: MutationBufferParam) {
    ([
      'mutationCb',
      'blockClass',
      'blockSelector',
      'maskTextClass',
      'maskTextSelector',
      'inlineStylesheet',
      'maskInputOptions',
      'maskTextFn',
      'maskInputFn',
      'recordCanvas',
      'inlineImages',
      'slimDOMOptions',
      'doc',
      'mirror',
      'iframeManager',
      'shadowDomManager',
      'canvasManager',
    ] as const).forEach((key) => {
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
      const shadowHost: Element | null = n.getRootNode
        ? (n.getRootNode() as ShadowRoot)?.host
        : null;
      // If n is in a nested shadow dom.
      let rootShadowHost = shadowHost;
      while ((rootShadowHost?.getRootNode?.() as ShadowRoot | undefined)?.host)
        rootShadowHost =
          (rootShadowHost?.getRootNode?.() as ShadowRoot | undefined)?.host ||
          null;
      // ensure shadowHost is a Node, or doc.contains will throw an error
      const notInDoc =
        !this.doc.contains(n) &&
        (!rootShadowHost || !this.doc.contains(rootShadowHost));
      if (!n.parentNode || notInDoc) {
        return;
      }
      const parentId = isShadowRoot(n.parentNode)
        ? this.mirror.getId(shadowHost)
        : this.mirror.getId(n.parentNode);
      const nextId = getNextId(n);
      if (parentId === -1 || nextId === -1) {
        return addList.addNode(n);
      }
      let sn = serializeNodeWithId(n, {
        doc: this.doc,
        mirror: this.mirror,
        blockClass: this.blockClass,
        blockSelector: this.blockSelector,
        maskTextClass: this.maskTextClass,
        maskTextSelector: this.maskTextSelector,
        skipChild: true,
        inlineStylesheet: this.inlineStylesheet,
        maskInputOptions: this.maskInputOptions,
        maskTextFn: this.maskTextFn,
        maskInputFn: this.maskInputFn,
        slimDOMOptions: this.slimDOMOptions,
        recordCanvas: this.recordCanvas,
        inlineImages: this.inlineImages,
        onSerialize: (currentN) => {
          if (isSerializedIframe(currentN, this.mirror)) {
            this.iframeManager.addIframe(currentN);
          }
          if (hasShadowRoot(n)) {
            this.shadowDomManager.addShadowRoot(n.shadowRoot, document);
          }
        },
        onIframeLoad: (iframe, childSn) => {
          this.iframeManager.attachIframe(iframe, childSn, this.mirror);
          this.shadowDomManager.observeAttachShadow(iframe);
        },
      });
      if (sn) {
        adds.push({
          parentId,
          nextId,
          node: sn,
        });
      }
    };

    while (this.mapRemoves.length) {
      this.mirror.removeNodeFromMap(this.mapRemoves.shift()!);
    }

    for (const n of this.movedSet) {
      if (
        isParentRemoved(this.removes, n, this.mirror) &&
        !this.movedSet.has(n.parentNode!)
      ) {
        continue;
      }
      pushAdd(n);
    }

    for (const n of this.addedSet) {
      if (
        !isAncestorInSet(this.droppedSet, n) &&
        !isParentRemoved(this.removes, n, this.mirror)
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
        const parentId = this.mirror.getId(candidate.value.parentNode);
        const nextId = getNextId(candidate.value);
        if (parentId !== -1 && nextId !== -1) {
          node = candidate;
        }
      }
      if (!node) {
        for (let index = addList.length - 1; index >= 0; index--) {
          const _node = addList.get(index)!;
          // ensure _node is defined before attempting to find value
          if (_node) {
            const parentId = this.mirror.getId(_node.value.parentNode);
            const nextId = getNextId(_node.value);
            if (parentId !== -1 && nextId !== -1) {
              node = _node;
              break;
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
        .map((text) => ({
          id: this.mirror.getId(text.node),
          value: text.value,
        }))
        // text mutation's id was not in the mirror map means the target node has been removed
        .filter((text) => this.mirror.has(text.id)),
      attributes: this.attributes
        .map((attribute) => ({
          id: this.mirror.getId(attribute.node),
          attributes: attribute.attributes,
        }))
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
    this.removes = [];
    this.addedSet = new Set<Node>();
    this.movedSet = new Set<Node>();
    this.droppedSet = new Set<Node>();
    this.movedMap = {};

    this.mutationCb(payload);
  };

  private processMutation = (m: mutationRecord) => {
    if (isIgnored(m.target, this.mirror)) {
      return;
    }
    switch (m.type) {
      case 'characterData': {
        const value = m.target.textContent;
        if (!isBlocked(m.target, this.blockClass, this.blockSelector) && value !== m.oldValue) {
          this.texts.push({
            value:
              needMaskingText(
                m.target,
                this.maskTextClass,
                this.maskTextSelector,
              ) && value
                ? this.maskTextFn
                  ? this.maskTextFn(value)
                  : value.replace(/[\S]/g, '*')
                : value,
            node: m.target,
          });
        }
        break;
      }
      case 'attributes': {
        const target = m.target as HTMLElement;
        let value = (m.target as HTMLElement).getAttribute(m.attributeName!);
        if (m.attributeName === 'value') {
          value = maskInputValue({
            maskInputOptions: this.maskInputOptions,
            tagName: (m.target as HTMLElement).tagName,
            type: (m.target as HTMLElement).getAttribute('type'),
            value,
            maskInputFn: this.maskInputFn,
          });
        }
        if (isBlocked(m.target, this.blockClass, this.blockSelector) || value === m.oldValue) {
          return;
        }
        let item: attributeCursor | undefined = this.attributes.find(
          (a) => a.node === m.target,
        );
        if (!item) {
          item = {
            node: m.target,
            attributes: {},
          };
          this.attributes.push(item);
        }
        if (m.attributeName === 'style') {
          const old = this.doc.createElement('span');
          if (m.oldValue) {
            old.setAttribute('style', m.oldValue);
          }
          if (
            item.attributes.style === undefined ||
            item.attributes.style === null
          ) {
            item.attributes.style = {};
          }
          const styleObj = item.attributes.style as styleAttributeValue;
          for (const pname of Array.from(target.style)) {
            const newValue = target.style.getPropertyValue(pname);
            const newPriority = target.style.getPropertyPriority(pname);
            if (
              newValue !== old.style.getPropertyValue(pname) ||
              newPriority !== old.style.getPropertyPriority(pname)
            ) {
              if (newPriority === '') {
                styleObj[pname] = newValue;
              } else {
                styleObj[pname] = [newValue, newPriority];
              }
            }
          }
          for (const pname of Array.from(old.style)) {
            if (target.style.getPropertyValue(pname) === '') {
              // "if not set, returns the empty string"
              styleObj[pname] = false; // delete
            }
          }
        } else {
          // overwrite attribute if the mutations was triggered in same time
          item.attributes[m.attributeName!] = transformAttribute(
            this.doc,
            (m.target as HTMLElement).tagName,
            m.attributeName!,
            value!,
          );
        }
        break;
      }
      case 'childList': {
        m.addedNodes.forEach((n) => this.genAdds(n, m.target));
        m.removedNodes.forEach((n) => {
          const nodeId = this.mirror.getId(n);
          const parentId = isShadowRoot(m.target)
            ? this.mirror.getId(m.target.host)
            : this.mirror.getId(m.target);
          if (
            isBlocked(m.target, this.blockClass, this.blockSelector) ||
            isIgnored(n, this.mirror) ||
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
              isShadow: isShadowRoot(m.target) ? true : undefined,
            });
          }
          this.mapRemoves.push(n);
        });
        break;
      }
      default:
        break;
    }
  };

  private genAdds = (n: Node, target?: Node) => {
    // parent was blocked, so we can ignore this node
    if (target && isBlocked(target, this.blockClass, this.blockSelector)) {
      return;
    }

    if (this.mirror.getMeta(n)) {
      if (isIgnored(n, this.mirror)) {
        return;
      }
      this.movedSet.add(n);
      let targetId: number | null = null;
      if (target && this.mirror.getMeta(target)) {
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
    if (!isBlocked(n, this.blockClass, this.blockSelector))
      (n as Node).childNodes.forEach((childN) => this.genAdds(childN));
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
  n.childNodes.forEach((childN) => deepDelete(addsSet, childN));
}

function isParentRemoved(
  removes: removedNodeMutation[],
  n: Node,
  mirror: Mirror,
): boolean {
  const { parentNode } = n;
  if (!parentNode) {
    return false;
  }
  const parentId = mirror.getId(parentNode);
  if (removes.some((r) => r.id === parentId)) {
    return true;
  }
  return isParentRemoved(removes, parentNode, mirror);
}

function isAncestorInSet(set: Set<Node>, n: Node): boolean {
  const { parentNode } = n;
  if (!parentNode) {
    return false;
  }
  if (set.has(parentNode)) {
    return true;
  }
  return isAncestorInSet(set, parentNode);
}
