import { mutationCallBack, blockClass, maskTextClass, MaskTextFn, Mirror, scrollCallback, SamplingStrategy } from '../types';
import { MaskInputOptions, SlimDOMOptions } from 'rrweb-snapshot';
import { IframeManager } from './iframe-manager';
declare type BypassOptions = {
    blockClass: blockClass;
    blockSelector: string | null;
    maskTextClass: maskTextClass;
    maskTextSelector: string | null;
    inlineStylesheet: boolean;
    maskInputOptions: MaskInputOptions;
    maskTextFn: MaskTextFn | undefined;
    recordCanvas: boolean;
    sampling: SamplingStrategy;
    slimDOMOptions: SlimDOMOptions;
    iframeManager: IframeManager;
};
export declare class ShadowDomManager {
    private mutationCb;
    private scrollCb;
    private bypassOptions;
    private mirror;
    constructor(options: {
        mutationCb: mutationCallBack;
        scrollCb: scrollCallback;
        bypassOptions: BypassOptions;
        mirror: Mirror;
    });
    addShadowRoot(shadowRoot: ShadowRoot, doc: Document): void;
}
export {};
