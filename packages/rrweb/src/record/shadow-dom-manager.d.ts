import type { MutationBufferParam } from '../types';
import type { mutationCallBack, scrollCallback, SamplingStrategy } from '@newrelic/rrweb-types';
import type { Mirror } from '@newrelic/rrweb-snapshot';
type BypassOptions = Omit<MutationBufferParam, 'doc' | 'mutationCb' | 'mirror' | 'shadowDomManager'> & {
    sampling: SamplingStrategy;
};
export declare class ShadowDomManager {
    private shadowDoms;
    private mutationCb;
    private scrollCb;
    private bypassOptions;
    private mirror;
    private restoreHandlers;
    constructor(options: {
        mutationCb: mutationCallBack;
        scrollCb: scrollCallback;
        bypassOptions: BypassOptions;
        mirror: Mirror;
    });
    init(): void;
    addShadowRoot(shadowRoot: ShadowRoot, doc: Document): void;
    observeAttachShadow(iframeElement: HTMLIFrameElement): void;
    private patchAttachShadow;
    reset(): void;
}
export {};
