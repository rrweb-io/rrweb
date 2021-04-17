import { mutationCallBack, blockClass, maskClass, MaskTextFn } from '../types';
import { MaskInputOptions, SlimDOMOptions } from 'rrweb-snapshot';
import { IframeManager } from './iframe-manager';
import { initMutationObserver } from './observer';

type BypassOptions = {
  blockClass: blockClass;
  blockSelector: string | null;
  maskClass: maskClass;
  maskSelector: string | null;
  inlineStylesheet: boolean;
  maskInputOptions: MaskInputOptions;
  maskTextFn: MaskTextFn | undefined;
  recordCanvas: boolean;
  slimDOMOptions: SlimDOMOptions;
  iframeManager: IframeManager;
};

export class ShadowDomManager {
  private mutationCb: mutationCallBack;
  private bypassOptions: BypassOptions;

  constructor(options: {
    mutationCb: mutationCallBack;
    bypassOptions: BypassOptions;
  }) {
    this.mutationCb = options.mutationCb;
    this.bypassOptions = options.bypassOptions;
  }

  public addShadowRoot(shadowRoot: ShadowRoot, doc: Document) {
    initMutationObserver(
      this.mutationCb,
      doc,
      this.bypassOptions.blockClass,
      this.bypassOptions.blockSelector,
      this.bypassOptions.maskClass,
      this.bypassOptions.maskSelector,
      this.bypassOptions.inlineStylesheet,
      this.bypassOptions.maskInputOptions,
      this.bypassOptions.maskTextFn,
      this.bypassOptions.recordCanvas,
      this.bypassOptions.slimDOMOptions,
      this.bypassOptions.iframeManager,
      this,
      shadowRoot,
    );
  }
}
