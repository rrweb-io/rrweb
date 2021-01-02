import { RRdomTreeNode, AnyObject } from './tree-node';

class RRdomTree {
  private readonly symbol = '__rrdom__';

  public initialize(object: AnyObject) {
    this._node(object);

    return object;
  }

  public hasChildren(object: AnyObject): boolean {
    return Boolean(this._node(object).hasChildren);
  }

  public firstChild(object: AnyObject) {
    return this._node(object).firstChild || null;
  }

  public lastChild(object: AnyObject) {
    return this._node(object).lastChild || null;
  }

  public previousSibling(object: AnyObject) {
    return this._node(object).previousSibling || null;
  }

  public nextSibling(object: AnyObject) {
    return this._node(object).nextSibling || null;
  }

  public parent(object: AnyObject) {
    return this._node(object).parent || null;
  }

  public insertAfter(referenceObject: AnyObject, newObject: AnyObject) {
    const referenceNode = this._node(referenceObject);
    const nextNode = this._node(referenceNode.nextSibling);
    const newNode = this._node(newObject);
    const parentNode = this._node(referenceNode.parent);

    if (newNode.isAttached) {
      throw new Error('Node already attached');
    }
    if (!referenceNode) {
      throw new Error('Reference node not attached');
    }

    newNode.parent = referenceNode.parent;
    newNode.previousSibling = referenceObject;
    newNode.nextSibling = referenceNode.nextSibling;
    referenceNode.nextSibling = newObject;

    if (nextNode) {
      nextNode.previousSibling = newObject;
    }

    if (parentNode && parentNode.lastChild === referenceObject) {
      parentNode.lastChild = newObject;
    }

    if (parentNode) {
      parentNode.childrenChanged();
    }

    return newObject;
  }

  public insertBefore(referenceObject: AnyObject, newObject: AnyObject) {
    const referenceNode = this._node(referenceObject);
    const prevNode = this._node(referenceNode.previousSibling);
    const newNode = this._node(newObject);
    const parentNode = this._node(referenceNode.parent);

    if (newNode.isAttached) {
      throw new Error('Node already attached');
    }
    if (!referenceNode) {
      throw new Error('Reference node not attached');
    }

    newNode.parent = referenceNode.parent;
    newNode.previousSibling = referenceNode.previousSibling;
    newNode.nextSibling = referenceObject;
    referenceNode.previousSibling = newObject;

    if (prevNode) {
      prevNode.nextSibling = newObject;
    }

    if (parentNode && parentNode.firstChild === referenceObject) {
      parentNode.firstChild = newObject;
    }

    if (parentNode) {
      parentNode.childrenChanged();
    }

    return newObject;
  }

  public appendChild(referenceObject: AnyObject, newObject: AnyObject) {
    const referenceNode = this._node(referenceObject);
    const newNode = this._node(newObject);

    if (newNode.isAttached) {
      throw new Error('Node already attached');
    }
    if (!referenceNode) {
      throw new Error('Reference node not attached');
    }

    if (referenceNode.hasChildren) {
      this.insertAfter(referenceNode.lastChild!, newObject);
    } else {
      newNode.parent = referenceObject;
      referenceNode.firstChild = newObject;
      referenceNode.lastChild = newObject;
      referenceNode.childrenChanged();
    }

    return newObject;
  }

  public remove(removeObject: AnyObject) {
    const removeNode = this._node(removeObject);
    const parentNode = this._node(removeNode.parent);
    const prevNode = this._node(removeNode.previousSibling);
    const nextNode = this._node(removeNode.nextSibling);

    if (parentNode) {
      if (parentNode.firstChild === removeObject) {
        parentNode.firstChild = removeNode.nextSibling;
      }

      if (parentNode.lastChild === removeObject) {
        parentNode.lastChild = removeNode.previousSibling;
      }
    }

    if (prevNode) {
      prevNode.nextSibling = removeNode.nextSibling;
    }

    if (nextNode) {
      nextNode.previousSibling = removeNode.previousSibling;
    }

    removeNode.parent = null;
    removeNode.previousSibling = null;
    removeNode.nextSibling = null;
    removeNode.cachedIndex = -1;
    removeNode.cachedIndexVersion = NaN;

    if (parentNode) {
      parentNode.childrenChanged();
    }

    return removeObject;
  }

  private _node(object: AnyObject | null): RRdomTreeNode {
    if (!object) {
      throw new Error('Object is falsy');
    }

    if (this.symbol in object) {
      return object[this.symbol] as RRdomTreeNode;
    }

    return (object[this.symbol] = new RRdomTreeNode());
  }
}
