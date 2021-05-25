import {
  mutationCallBack,
  blockClass,
  maskTextClass,
  MaskTextFn,
  Mirror,
} from '../types';
import { MaskInputOptions, SlimDOMOptions } from 'rrweb-snapshot';
import { IframeManager } from './iframe-manager';
import { initMutationObserver } from './observer';

type BypassOptions = {
  blockClass: blockClass;
  blockSelector: string | null;
  maskTextClass: maskTextClass;
  maskTextSelector: string | null;
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
  private mirror: Mirror;

  constructor(options: {
    mutationCb: mutationCallBack;
    bypassOptions: BypassOptions;
    mirror: Mirror;
  }) {
    this.mutationCb = options.mutationCb;
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
  }
}
