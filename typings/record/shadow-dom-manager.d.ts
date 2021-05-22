import { mutationCallBack, blockClass, maskTextClass, MaskTextFn } from '../types';
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
    slimDOMOptions: SlimDOMOptions;
    iframeManager: IframeManager;
};
export declare class ShadowDomManager {
    private mutationCb;
    private bypassOptions;
    constructor(options: {
        mutationCb: mutationCallBack;
        bypassOptions: BypassOptions;
    });
    addShadowRoot(shadowRoot: ShadowRoot, doc: Document): void;
}
export {};
