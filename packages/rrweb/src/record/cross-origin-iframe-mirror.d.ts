import type { ICrossOriginIframeMirror } from '@newrelic/rrweb-types';
export default class CrossOriginIframeMirror
  implements ICrossOriginIframeMirror
{
  private generateIdFn;
  private iframeIdToRemoteIdMap;
  private iframeRemoteIdToIdMap;
  constructor(generateIdFn: () => number);
  getId(
    iframe: HTMLIFrameElement,
    remoteId: number,
    idToRemoteMap?: Map<number, number>,
    remoteToIdMap?: Map<number, number>,
  ): number;
  getIds(iframe: HTMLIFrameElement, remoteId: number[]): number[];
  getRemoteId(
    iframe: HTMLIFrameElement,
    id: number,
    map?: Map<number, number>,
  ): number;
  getRemoteIds(iframe: HTMLIFrameElement, ids: number[]): number[];
  reset(iframe?: HTMLIFrameElement): void;
  private getIdToRemoteIdMap;
  private getRemoteIdToIdMap;
}
