import { MaskInputOptions, SlimDOMOptions } from 'rrweb-snapshot';
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
    private blockSelector;
    private inlineStylesheet;
    private maskInputOptions;
    private recordCanvas;
    private slimDOMOptions;
    init(cb: mutationCallBack, blockClass: blockClass, blockSelector: string | null, inlineStylesheet: boolean, maskInputOptions: MaskInputOptions, recordCanvas: boolean, slimDOMOptions: SlimDOMOptions): void;
    freeze(): void;
    unfreeze(): void;
    isFrozen(): boolean;
    processMutations: (mutations: mutationRecord[]) => void;
    emit: () => void;
    private processMutation;
    private genAdds;
}
