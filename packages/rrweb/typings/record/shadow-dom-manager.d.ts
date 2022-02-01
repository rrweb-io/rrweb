import { mutationCallBack, blockClass, maskTextClass, Mirror, scrollCallback, SamplingStrategy } from '../types';
import { MaskInputOptions, SlimDOMOptions, MaskTextFn, MaskInputFn } from 'rrweb-snapshot';
import { IframeManager } from './iframe-manager';
import { CanvasManager } from './observers/canvas/canvas-manager';
declare type BypassOptions = {
    blockClass: blockClass;
    blockSelector: string | null;
    maskTextClass: maskTextClass;
    maskTextSelector: string | null;
    inlineStylesheet: boolean;
    maskInputOptions: MaskInputOptions;
    maskTextFn: MaskTextFn | undefined;
    maskInputFn: MaskInputFn | undefined;
    recordCanvas: boolean;
    sampling: SamplingStrategy;
    slimDOMOptions: SlimDOMOptions;
    iframeManager: IframeManager;
    canvasManager: CanvasManager;
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
