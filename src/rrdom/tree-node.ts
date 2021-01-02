// tslint:disable-next-line: no-any
export type AnyObject = { [key: string]: any; __rrdom__?: RRdomTreeNode };

export class RRdomTreeNode implements AnyObject {
  public parent: AnyObject | null = null;
  public previousSibling: AnyObject | null = null;
  public nextSibling: AnyObject | null = null;

  public firstChild: AnyObject | null = null;
  public lastChild: AnyObject | null = null;

  // This value is incremented anytime a children is added or removed
  public childrenVersion = 0;
  // The last child object which has a cached index
  public childIndexCachedUpTo: AnyObject | null = null;

  /**
   * This value represents the cached node index, as long as
   * cachedIndexVersion matches with the childrenVersion of the parent
   */
  public cachedIndex = -1;
  public cachedIndexVersion = NaN;

  public get isAttached() {
    return Boolean(this.parent || this.previousSibling || this.nextSibling);
  }

  public get hasChildren() {
    return Boolean(this.firstChild);
  }

  public childrenChanged() {
    // tslint:disable-next-line: no-bitwise
    this.childrenVersion = (this.childrenVersion + 1) & 0xffffffff;
    this.childIndexCachedUpTo = null;
  }

  public getCachedIndex(parentNode: AnyObject) {
    if (this.cachedIndexVersion !== parentNode.childrenVersion) {
      this.cachedIndexVersion = NaN;
      // cachedIndex is no longer valid
      return -1;
    }

    return this.cachedIndex;
  }

  public setCachedIndex(parentNode: AnyObject, index: number) {
    this.cachedIndexVersion = parentNode.childrenVersion;
    this.cachedIndex = index;
  }
}
