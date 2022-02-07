import { observerParam, listenerHandler, hooksParam, MutationBufferParam } from '../types';
import MutationBuffer from './mutation';
export declare const mutationBuffers: MutationBuffer[];
export declare function initMutationObserver(options: MutationBufferParam, rootEl: Node): MutationObserver;
export declare function initScrollObserver({ scrollCb, doc, mirror, blockClass, sampling, }: Pick<observerParam, 'scrollCb' | 'doc' | 'mirror' | 'blockClass' | 'sampling'>): listenerHandler;
export declare const INPUT_TAGS: string[];
export declare function initObservers(o: observerParam, hooks?: hooksParam): listenerHandler;
