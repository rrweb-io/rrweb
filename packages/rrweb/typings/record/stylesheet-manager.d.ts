import type { Mirror, serializedNodeWithId } from 'rrweb-snapshot';
import type { mutationCallBack } from '../types';
export declare class StylesheetManager {
    private mutationCb;
    constructor(options: {
        mutationCb: mutationCallBack;
    });
    attachStylesheet(linkEl: HTMLLinkElement, childSn: serializedNodeWithId, mirror: Mirror): void;
}
