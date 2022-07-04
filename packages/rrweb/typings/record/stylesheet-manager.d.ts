import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import type { mutationCallBack } from '../types';
export declare class StylesheetManager {
    private trackedStylesheets;
    private mutationCb;
    constructor(options: {
        mutationCb: mutationCallBack;
    });
    addStylesheet(linkEl: HTMLLinkElement): void;
    private trackStylesheet;
    attachStylesheet(linkEl: HTMLLinkElement, childSn: serializedNodeWithId, mirror: Mirror): void;
}
