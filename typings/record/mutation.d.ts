import { MaskInputOptions } from 'rrweb-snapshot';
import { mutationRecord, blockClass, mutationCallBack } from '../types';
export default class MutationBuffer {
    paused: boolean;
    private texts;
    private attributes;
    private removes;
    private adds;
    private movedMap;
    private addedSet;
    private movedSet;
    private droppedSet;
    private emissionCallback;
    private blockClass;
    private inlineStylesheet;
    private maskInputOptions;
    private recordCanvas;
    init(cb: mutationCallBack, blockClass: blockClass, inlineStylesheet: boolean, maskInputOptions: MaskInputOptions, recordCanvas: boolean): void;
    processMutations: (mutations: mutationRecord[]) => void;
    emit: () => void;
    private processMutation;
    private genAdds;
}
