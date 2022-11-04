import type { ICrossOriginIframeMirror } from '@rrweb/types';
export default class CrossOriginIframeMirror
  implements ICrossOriginIframeMirror {
  private iframeIdToRemoteIdMap: WeakMap<
    HTMLIFrameElement,
    Map<number, number>
  > = new WeakMap();
  private iframeRemoteIdToIdMap: WeakMap<
    HTMLIFrameElement,
    Map<number, number>
  > = new WeakMap();

  constructor(private generateIdFn: () => number) {}

  getId(
    iframe: HTMLIFrameElement,
    remoteId: number,
    parentToRemoteMap?: Map<number, number>,
    remoteToParentMap?: Map<number, number>,
  ): number {
    const parentIdToRemoteIdMap =
      parentToRemoteMap || this.getIdToRemoteIdMap(iframe);
    const remoteIdToIdMap =
      remoteToParentMap || this.getRemoteIdToIdMap(iframe);

    let parentId = parentIdToRemoteIdMap.get(remoteId);
    if (!parentId) {
      parentId = this.generateIdFn();
      parentIdToRemoteIdMap.set(remoteId, parentId);
      remoteIdToIdMap.set(parentId, remoteId);
    }
    return parentId;
  }

  getIds(iframe: HTMLIFrameElement, remoteId: number[]): number[] {
    const parentIdToRemoteIdMap = this.getIdToRemoteIdMap(iframe);
    const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
    return remoteId.map((id) =>
      this.getId(iframe, id, parentIdToRemoteIdMap, remoteIdToIdMap),
    );
  }

  getRemoteId(
    iframe: HTMLIFrameElement,
    parentId: number,
    map?: Map<number, number>,
  ): number {
    const remoteIdToIdMap = map || this.getRemoteIdToIdMap(iframe);

    if (typeof parentId !== 'number') return parentId;

    const remoteId = remoteIdToIdMap.get(parentId);
    if (!remoteId) return -1;
    return remoteId;
  }

  getRemoteIds(iframe: HTMLIFrameElement, parentId: number[]): number[] {
    const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);

    return parentId.map((id) => this.getRemoteId(iframe, id, remoteIdToIdMap));
  }

  reset(iframe?: HTMLIFrameElement) {
    if (!iframe) {
      this.iframeIdToRemoteIdMap = new WeakMap();
      this.iframeRemoteIdToIdMap = new WeakMap();
      return;
    }
    this.iframeIdToRemoteIdMap.delete(iframe);
    this.iframeRemoteIdToIdMap.delete(iframe);
  }

  private getIdToRemoteIdMap(iframe: HTMLIFrameElement) {
    let parentToRemoteMap = this.iframeIdToRemoteIdMap.get(iframe);
    if (!parentToRemoteMap) {
      parentToRemoteMap = new Map();
      this.iframeIdToRemoteIdMap.set(iframe, parentToRemoteMap);
    }
    return parentToRemoteMap;
  }

  private getRemoteIdToIdMap(iframe: HTMLIFrameElement) {
    let remoteIdToIdMap = this.iframeRemoteIdToIdMap.get(iframe);
    if (!remoteIdToIdMap) {
      remoteIdToIdMap = new Map();
      this.iframeRemoteIdToIdMap.set(iframe, remoteIdToIdMap);
    }
    return remoteIdToIdMap;
  }
}
