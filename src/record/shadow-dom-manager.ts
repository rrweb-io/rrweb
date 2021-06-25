import {
  mutationCallBack,
  blockClass,
  maskTextClass,
  MaskTextFn,
  Mirror,
  scrollCallback,
  SamplingStrategy,
} from '../types';
import { MaskInputOptions, SlimDOMOptions } from 'rrweb-snapshot';
import { IframeManager } from './iframe-manager';
import { initMutationObserver, initScrollObserver } from './observer';

type BypassOptions = {
  blockClass: blockClass;
  blockSelector: string | null;
  maskTextClass: maskTextClass;
  maskTextSelector: string | null;
  inlineStylesheet: boolean;
  maskInputOptions: MaskInputOptions;
  maskTextFn: MaskTextFn | undefined;
  recordCanvas: boolean;
  sampling: SamplingStrategy;
  slimDOMOptions: SlimDOMOptions;
  iframeManager: IframeManager;
};

export class ShadowDomManager {
  private mutationCb: mutationCallBack;
  private scrollCb: scrollCallback;
  private bypassOptions: BypassOptions;
  private mirror: Mirror;

  constructor(options: {
    mutationCb: mutationCallBack;
    scrollCb: scrollCallback;
    bypassOptions: BypassOptions;
    mirror: Mirror;
  }) {
    this.mutationCb = options.mutationCb;
    this.scrollCb = options.scrollCb;
    this.bypassOptions = options.bypassOptions;
    this.mirror = options.mirror;
  }

  public addShadowRoot(shadowRoot: ShadowRoot, doc: Document) {
    initMutationObserver(
      this.mutationCb,
      doc,
      this.bypassOptions.blockClass,
      this.bypassOptions.blockSelector,
      this.bypassOptions.maskTextClass,
      this.bypassOptions.maskTextSelector,
      this.bypassOptions.inlineStylesheet,
      this.bypassOptions.maskInputOptions,
      this.bypassOptions.maskTextFn,
      this.bypassOptions.recordCanvas,
      this.bypassOptions.slimDOMOptions,
      this.mirror,
      this.bypassOptions.iframeManager,
      this,
      shadowRoot,
    );
    initScrollObserver(
      this.scrollCb,
      // https://gist.github.com/praveenpuglia/0832da687ed5a5d7a0907046c9ef1813
      // scroll is not allowed to pass the boundary, so we need to listen the shadow document
      (shadowRoot as unknown) as Document,
      this.mirror,
      this.bypassOptions.blockClass,
      this.bypassOptions.sampling,
    );
  }
}
