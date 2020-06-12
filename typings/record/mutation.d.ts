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
    private maskAllInputs;
    constructor(cb: mutationCallBack, blockClass: blockClass, inlineStylesheet: boolean, maskAllInputs: boolean);
    processMutations: (mutations: mutationRecord[]) => void;
    private processMutation;
    private genAdds;
    emit: () => void;
}
