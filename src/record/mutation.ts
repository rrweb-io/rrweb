import {
  INode,
  serializeNodeWithId,
  transformAttribute,
  MaskInputOptions,
} from 'rrweb-snapshot';
import {
  mutationRecord,
  blockClass,
  mutationCallBack,
  textCursor,
  attributeCursor,
  removedNodeMutation,
  addedNodeMutation,
} from '../types';
import { mirror, isBlocked, isAncestorRemoved } from '../utils';

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
    } else if (n.nextSibling && isNodeInLinkedList(n.nextSibling)) {
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
      delete n.__ln;
    }
    this.length--;
  }
}

const moveKey = (id: number, parentId: number) => `${id}@${parentId}`;
function isINode(n: Node | INode): n is INode {
  return '__sn' in n;
}

/**
 * controls behaviour of a MutationObserver
 */
export default class MutationBuffer {
  private texts: textCursor[] = [];
  private attributes: attributeCursor[] = [];
  private removes: removedNodeMutation[] = [];
  private adds: addedNodeMutation[] = [];

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

  private emissionCallback: mutationCallBack;
  private blockClass: blockClass;
  private inlineStylesheet: boolean;
  private maskInputOptions: MaskInputOptions;
  private recordCanvas: boolean;

  constructor(
    cb: mutationCallBack,
    blockClass: blockClass,
    inlineStylesheet: boolean,
    maskInputOptions: MaskInputOptions,
    recordCanvas: boolean,
  ) {
    this.blockClass = blockClass;
    this.inlineStylesheet = inlineStylesheet;
    this.maskInputOptions = maskInputOptions;
    this.recordCanvas = recordCanvas;
    this.emissionCallback = cb;
  }

  public processMutations = (mutations: mutationRecord[]) => {
    mutations.forEach(this.processMutation);

    /**
     * Sometimes child node may be pushed before its newly added
     * parent, so we init a queue to store these nodes.
     */
    const addList = new DoubleLinkedList();
    const getNextId = (n: Node): number | null => {
      let nextId =
        n.nextSibling && mirror.getId((n.nextSibling as unknown) as INode);
      if (nextId === -1 && isBlocked(n.nextSibling, this.blockClass)) {
        nextId = null;
      }
      return nextId;
    };
    const pushAdd = (n: Node) => {
      if (!n.parentNode) {
        return;
      }
      const parentId = mirror.getId((n.parentNode as Node) as INode);
      const nextId = getNextId(n);
      if (parentId === -1 || nextId === -1) {
        return addList.addNode(n);
      }
      this.adds.push({
        parentId,
        nextId,
        node: serializeNodeWithId(
          n,
          document,
          mirror.map,
          this.blockClass,
          true,
          this.inlineStylesheet,
          this.maskInputOptions,
          this.recordCanvas,
        )!,
      });
    };

    for (const n of this.movedSet) {
      pushAdd(n);
    }

    for (const n of this.addedSet) {
      if (
        !isAncestorInSet(this.droppedSet, n) &&
        !isParentRemoved(this.removes, n)
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
        const parentId = mirror.getId(
          (candidate.value.parentNode as Node) as INode,
        );
        const nextId = getNextId(candidate.value);
        if (parentId !== -1 && nextId !== -1) {
          node = candidate;
        }
      }
      if (!node) {
        for (let index = addList.length - 1; index >= 0; index--) {
          const _node = addList.get(index)!;
          const parentId = mirror.getId(
            (_node.value.parentNode as Node) as INode,
          );
          const nextId = getNextId(_node.value);
          if (parentId !== -1 && nextId !== -1) {
            node = _node;
            break;
          }
        }
      }
      if (!node) {
        /**
         * If all nodes in queue could not find a serialized parent,
         * it may be a bug or corner case. We need to escape the
         * dead while loop at once.
         */
        break;
      }
      candidate = node.previous;
      addList.removeNode(node.value);
      pushAdd(node.value);
    }

    this.emit();
  };

  public emit = () => {
    const payload = {
      texts: this.texts
        .map((text) => ({
          id: mirror.getId(text.node as INode),
          value: text.value,
        }))
        // text mutation's id was not in the mirror map means the target node has been removed
        .filter((text) => mirror.has(text.id)),
      attributes: this.attributes
        .map((attribute) => ({
          id: mirror.getId(attribute.node as INode),
          attributes: attribute.attributes,
        }))
        // attribute mutation's id was not in the mirror map means the target node has been removed
        .filter((attribute) => mirror.has(attribute.id)),
      removes: this.removes,
      adds: this.adds,
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
    this.emissionCallback(payload);

    // reset
    this.texts = [];
    this.attributes = [];
    this.removes = [];
    this.adds = [];
    this.addedSet = new Set<Node>();
    this.movedSet = new Set<Node>();
    this.droppedSet = new Set<Node>();
    this.movedMap = {};
  };

  private processMutation = (m: mutationRecord) => {
    switch (m.type) {
      case 'characterData': {
        const value = m.target.textContent;
        if (!isBlocked(m.target, this.blockClass) && value !== m.oldValue) {
          this.texts.push({
            value,
            node: m.target,
          });
        }
        break;
      }
      case 'attributes': {
        const value = (m.target as HTMLElement).getAttribute(m.attributeName!);
        if (isBlocked(m.target, this.blockClass) || value === m.oldValue) {
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
        // overwrite attribute if the mutations was triggered in same time
        item.attributes[m.attributeName!] = transformAttribute(
          document,
          m.attributeName!,
          value!,
        );
        break;
      }
      case 'childList': {
        m.addedNodes.forEach((n) => this.genAdds(n, m.target));
        m.removedNodes.forEach((n) => {
          const nodeId = mirror.getId(n as INode);
          const parentId = mirror.getId(m.target as INode);
          if (
            isBlocked(n, this.blockClass) ||
            isBlocked(m.target, this.blockClass)
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
          } else if (isAncestorRemoved(m.target as INode)) {
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
            });
          }
          mirror.removeNodeFromMap(n as INode);
        });
        break;
      }
      default:
        break;
    }
  };

  private genAdds = (n: Node | INode, target?: Node | INode) => {
    if (isBlocked(n, this.blockClass)) {
      return;
    }
    if (isINode(n)) {
      this.movedSet.add(n);
      let targetId: number | null = null;
      if (target && isINode(target)) {
        targetId = target.__sn.id;
      }
      if (targetId) {
        this.movedMap[moveKey(n.__sn.id, targetId)] = true;
      }
    } else {
      this.addedSet.add(n);
      this.droppedSet.delete(n);
    }
    n.childNodes.forEach((childN) => this.genAdds(childN));
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

function isParentRemoved(removes: removedNodeMutation[], n: Node): boolean {
  const { parentNode } = n;
  if (!parentNode) {
    return false;
  }
  const parentId = mirror.getId((parentNode as Node) as INode);
  if (removes.some((r) => r.id === parentId)) {
    return true;
  }
  return isParentRemoved(removes, parentNode);
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
