export default class IframeMirror {
  private iframeParentIdToRemoteIdMap: WeakMap<
    HTMLIFrameElement,
    Map<number, number>
  > = new WeakMap();
  private iframeRemoteIdToParentIdMap: WeakMap<
    HTMLIFrameElement,
    Map<number, number>
  > = new WeakMap();

  constructor(private generateIdFn: () => number) {}

  getParentId(
    iframe: HTMLIFrameElement,
    remoteId: number,
    parentToRemoteMap?: Map<number, number>,
    remoteToParentMap?: Map<number, number>,
  ): number {
    const parentIdToRemoteIdMap =
      parentToRemoteMap || this.getParentIdToRemoteIdMap(iframe);
    const remoteIdToParentIdMap =
      remoteToParentMap || this.getRemoteIdToParentIdMap(iframe);

    let parentId = parentIdToRemoteIdMap.get(remoteId);
    if (!parentId) {
      parentId = this.generateIdFn();
      parentIdToRemoteIdMap.set(remoteId, parentId);
      remoteIdToParentIdMap.set(parentId, remoteId);
    }
    return parentId;
  }

  getParentIds(iframe: HTMLIFrameElement, remoteId: number[]): number[] {
    const parentIdToRemoteIdMap = this.getParentIdToRemoteIdMap(iframe);
    const remoteIdToParentIdMap = this.getRemoteIdToParentIdMap(iframe);
    return remoteId.map((id) =>
      this.getParentId(
        iframe,
        id,
        parentIdToRemoteIdMap,
        remoteIdToParentIdMap,
      ),
    );
  }

  getRemoteId(
    iframe: HTMLIFrameElement,
    parentId: number,
    map?: Map<number, number>,
  ): number {
    const remoteIdToParentIdMap = map || this.getRemoteIdToParentIdMap(iframe);

    if (typeof parentId !== 'number') return parentId;

    const remoteId = remoteIdToParentIdMap.get(parentId);
    if (!remoteId) return -1;
    return remoteId;
  }

  getRemoteIds(iframe: HTMLIFrameElement, parentId: number[]): number[] {
    const remoteIdToParentIdMap = this.getRemoteIdToParentIdMap(iframe);

    return parentId.map((id) =>
      this.getRemoteId(iframe, id, remoteIdToParentIdMap),
    );
  }

  reset(iframe?: HTMLIFrameElement) {
    if (!iframe) {
      this.iframeParentIdToRemoteIdMap = new WeakMap();
      this.iframeRemoteIdToParentIdMap = new WeakMap();
      return;
    }
    this.iframeParentIdToRemoteIdMap.delete(iframe);
    this.iframeRemoteIdToParentIdMap.delete(iframe);
  }

  private getParentIdToRemoteIdMap(iframe: HTMLIFrameElement) {
    let parentToRemoteMap = this.iframeParentIdToRemoteIdMap.get(iframe);
    if (!parentToRemoteMap) {
      parentToRemoteMap = new Map();
      this.iframeParentIdToRemoteIdMap.set(iframe, parentToRemoteMap);
    }
    return parentToRemoteMap;
  }

  private getRemoteIdToParentIdMap(iframe: HTMLIFrameElement) {
    let remoteIdToParentIdMap = this.iframeRemoteIdToParentIdMap.get(iframe);
    if (!remoteIdToParentIdMap) {
      remoteIdToParentIdMap = new Map();
      this.iframeRemoteIdToParentIdMap.set(iframe, remoteIdToParentIdMap);
    }
    return remoteIdToParentIdMap;
  }
}
