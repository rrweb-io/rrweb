import { MaskInputOptions } from 'rrweb-snapshot';
import { mutationRecord, blockClass, mutationCallBack } from '../types';
export default class MutationBuffer {
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
    constructor(cb: mutationCallBack, blockClass: blockClass, inlineStylesheet: boolean, maskInputOptions: MaskInputOptions);
    processMutations: (mutations: mutationRecord[]) => void;
    emit: () => void;
    private processMutation;
    private genAdds;
}
