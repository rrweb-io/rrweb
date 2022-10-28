export default class IframeMirror {
  private iframeParentIdToLocalIdMap: WeakMap<
    HTMLIFrameElement,
    Map<number, number>
  > = new WeakMap();
  private iframeLocalIdToParentIdMap: WeakMap<
    HTMLIFrameElement,
    Map<number, number>
  > = new WeakMap();

  constructor(private generateIdFn: () => number) {}

  getParentId(iframe: HTMLIFrameElement, localId: number): number {
    const parentIdToLocalIdMap = this.getParentIdToLocalIdMap(iframe);
    const localIdToParentIdMap = this.getLocalIdToParentIdMap(iframe);

    let parentId = parentIdToLocalIdMap.get(localId);
    if (!parentId) {
      parentId = this.generateIdFn();
      parentIdToLocalIdMap.set(localId, parentId);
      localIdToParentIdMap.set(parentId, localId);
    }
    return parentId;
  }

  getParentIds(iframe: HTMLIFrameElement, localId: number[]): number[] {
    return localId.map((id) => this.getParentId(iframe, id));
  }

  getLocalId<T extends number | number[]>(
    iframe: HTMLIFrameElement,
    parentId: T,
  ): T {
    const localIdToParentIdMap = this.getLocalIdToParentIdMap(iframe);
    if (Array.isArray(parentId)) {
      return parentId.map((id) => this.getLocalId(iframe, id)) as T;
    }

    if (typeof parentId !== 'number') return parentId;

    const localId = localIdToParentIdMap.get(parentId);
    if (!localId) return -1 as T;
    return localId as T;
  }

  reset(iframe?: HTMLIFrameElement) {
    if (!iframe) {
      this.iframeParentIdToLocalIdMap = new WeakMap();
      this.iframeLocalIdToParentIdMap = new WeakMap();
      return;
    }
    this.iframeParentIdToLocalIdMap.delete(iframe);
    this.iframeLocalIdToParentIdMap.delete(iframe);
  }

  private getParentIdToLocalIdMap(iframe: HTMLIFrameElement) {
    let parentToLocalMap = this.iframeParentIdToLocalIdMap.get(iframe);
    if (!parentToLocalMap) {
      parentToLocalMap = new Map();
      this.iframeParentIdToLocalIdMap.set(iframe, parentToLocalMap);
    }
    return parentToLocalMap;
  }

  private getLocalIdToParentIdMap(iframe: HTMLIFrameElement) {
    let localIdToParentIdMap = this.iframeLocalIdToParentIdMap.get(iframe);
    if (!localIdToParentIdMap) {
      localIdToParentIdMap = new Map();
      this.iframeLocalIdToParentIdMap.set(iframe, localIdToParentIdMap);
    }
    return localIdToParentIdMap;
  }
}
