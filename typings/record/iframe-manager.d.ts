import { serializedNodeWithId, INode } from 'rrweb-snapshot';
import { mutationCallBack } from '../types';
export declare class IframeManager {
    private iframes;
    private mutationCb;
    private loadListener?;
    constructor(options: {
        mutationCb: mutationCallBack;
    });
    addIframe(iframeEl: HTMLIFrameElement): void;
    addLoadListener(cb: (iframeEl: HTMLIFrameElement) => unknown): void;
    attachIframe(iframeEl: INode, childSn: serializedNodeWithId): void;
}
