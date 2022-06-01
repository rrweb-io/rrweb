import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import type { mutationCallBack } from '../types';
export declare class StylesheetManager {
    private mutationCb;
    private loadListener?;
    constructor(options: {
        mutationCb: mutationCallBack;
    });
    addLoadListener(cb: (linkEl: HTMLLinkElement) => unknown): void;
    attachStylesheet(linkEl: HTMLLinkElement, childSn: serializedNodeWithId, mirror: Mirror): void;
}
