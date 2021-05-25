import { MaskInputOptions, SlimDOMOptions } from 'rrweb-snapshot';
import { mutationCallBack, observerParam, listenerHandler, blockClass, maskTextClass, hooksParam, MaskTextFn, Mirror } from '../types';
import MutationBuffer from './mutation';
import { IframeManager } from './iframe-manager';
import { ShadowDomManager } from './shadow-dom-manager';
export declare const mutationBuffers: MutationBuffer[];
export declare function initMutationObserver(cb: mutationCallBack, doc: Document, blockClass: blockClass, blockSelector: string | null, maskTextClass: maskTextClass, maskTextSelector: string | null, inlineStylesheet: boolean, maskInputOptions: MaskInputOptions, maskTextFn: MaskTextFn | undefined, recordCanvas: boolean, slimDOMOptions: SlimDOMOptions, mirror: Mirror, iframeManager: IframeManager, shadowDomManager: ShadowDomManager, rootEl: Node): MutationObserver;
export declare const INPUT_TAGS: string[];
export declare function initObservers(o: observerParam, hooks?: hooksParam): listenerHandler;
