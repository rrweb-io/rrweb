import { observerParam, listenerHandler, hooksParam } from '../types';
import MutationBuffer from './mutation';
export declare const mutationBuffers: MutationBuffer[];
export declare const INPUT_TAGS: string[];
export declare function initObservers(o: observerParam, hooks?: hooksParam): listenerHandler;
