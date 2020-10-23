import { MaskInputOptions } from 'rrweb-snapshot';
import { mutationRecord, blockClass, mutationCallBack } from '../types';
export default class MutationBuffer {
    private frozen;
    private texts;
    private attributes;
    private removes;
    private mapRemoves;
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
    freeze(): void;
    unfreeze(): void;
    isFrozen(): boolean;
    processMutations: (mutations: mutationRecord[]) => void;
    emit: () => void;
    private processMutation;
    private genAdds;
}
