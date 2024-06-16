import type { ICrossOriginIframeMirror } from '@saola.ai/rrweb-types';
export default class CrossOriginIframeMirror
  implements ICrossOriginIframeMirror
{
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
    idToRemoteMap?: Map<number, number>,
    remoteToIdMap?: Map<number, number>,
  ): number {
    const idToRemoteIdMap = idToRemoteMap || this.getIdToRemoteIdMap(iframe);
    const remoteIdToIdMap = remoteToIdMap || this.getRemoteIdToIdMap(iframe);

    let id = idToRemoteIdMap.get(remoteId);
    if (!id) {
      id = this.generateIdFn();
      idToRemoteIdMap.set(remoteId, id);
      remoteIdToIdMap.set(id, remoteId);
    }
    return id;
  }

  getIds(iframe: HTMLIFrameElement, remoteId: number[]): number[] {
    const idToRemoteIdMap = this.getIdToRemoteIdMap(iframe);
    const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
    return remoteId.map((id) =>
      this.getId(iframe, id, idToRemoteIdMap, remoteIdToIdMap),
    );
  }

  getRemoteId(
    iframe: HTMLIFrameElement,
    id: number,
    map?: Map<number, number>,
  ): number {
    const remoteIdToIdMap = map || this.getRemoteIdToIdMap(iframe);

    if (typeof id !== 'number') return id;

    const remoteId = remoteIdToIdMap.get(id);
    if (!remoteId) return -1;
    return remoteId;
  }

  getRemoteIds(iframe: HTMLIFrameElement, ids: number[]): number[] {
    const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);

    return ids.map((id) => this.getRemoteId(iframe, id, remoteIdToIdMap));
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
    let idToRemoteIdMap = this.iframeIdToRemoteIdMap.get(iframe);
    if (!idToRemoteIdMap) {
      idToRemoteIdMap = new Map();
      this.iframeIdToRemoteIdMap.set(iframe, idToRemoteIdMap);
    }
    return idToRemoteIdMap;
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
