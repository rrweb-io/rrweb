export declare type AnyObject = {
    [key: string]: any;
    __rrdom__?: RRdomTreeNode;
};
export declare class RRdomTreeNode implements AnyObject {
    parent: AnyObject | null;
    previousSibling: AnyObject | null;
    nextSibling: AnyObject | null;
    firstChild: AnyObject | null;
    lastChild: AnyObject | null;
    childrenVersion: number;
    childIndexCachedUpTo: AnyObject | null;
    cachedIndex: number;
    cachedIndexVersion: number;
    get isAttached(): boolean;
    get hasChildren(): boolean;
    childrenChanged(): void;
    getCachedIndex(parentNode: AnyObject): number;
    setCachedIndex(parentNode: AnyObject, index: number): void;
}
