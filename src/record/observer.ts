import { INode, MaskInputOptions, SlimDOMOptions } from 'rrweb-snapshot';
import { FontFaceDescriptors, FontFaceSet } from 'css-font-loading-module';
import {
  mirror,
  throttle,
  on,
  hookSetter,
  getWindowHeight,
  getWindowWidth,
  isBlocked,
  isTouchEvent,
  patch,
} from '../utils';
import {
  mutationCallBack,
  observerParam,
  mousemoveCallBack,
  mousePosition,
  mouseInteractionCallBack,
  MouseInteractions,
  listenerHandler,
  scrollCallback,
  styleSheetRuleCallback,
  viewportResizeCallback,
  inputValue,
  inputCallback,
  hookResetter,
  blockClass,
  IncrementalSource,
  hooksParam,
  Arguments,
  mediaInteractionCallback,
  MediaInteractions,
  SamplingStrategy,
  canvasMutationCallback,
  fontCallback,
  fontParam,
  MaskInputFn,
  logCallback,
  LogRecordOptions,
  Logger,
  LogLevel,
} from '../types';
import MutationBuffer from './mutation';
import { stringify } from './stringify';

export const mutationBuffer = new MutationBuffer();

function initMutationObserver(
  cb: mutationCallBack,
  blockClass: blockClass,
  blockSelector: string | null,
  inlineStylesheet: boolean,
  maskInputOptions: MaskInputOptions,
  recordCanvas: boolean,
  slimDOMOptions: SlimDOMOptions,
): MutationObserver {
  // see mutation.ts for details
  mutationBuffer.init(
    cb,
    blockClass,
    blockSelector,
    inlineStylesheet,
    maskInputOptions,
    recordCanvas,
    slimDOMOptions,
  );
  const observer = new MutationObserver(
    mutationBuffer.processMutations.bind(mutationBuffer),
  );
  observer.observe(document, {
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
    childList: true,
    subtree: true,
  });
  return observer;
}

function initMoveObserver(
  cb: mousemoveCallBack,
  sampling: SamplingStrategy,
): listenerHandler {
  if (sampling.mousemove === false) {
    return () => {};
  }

  const threshold =
    typeof sampling.mousemove === 'number' ? sampling.mousemove : 50;

  let positions: mousePosition[] = [];
  let timeBaseline: number | null;
  const wrappedCb = throttle((isTouch: boolean) => {
    const totalOffset = Date.now() - timeBaseline!;
    cb(
      positions.map((p) => {
        p.timeOffset -= totalOffset;
        return p;
      }),
      isTouch ? IncrementalSource.TouchMove : IncrementalSource.MouseMove,
    );
    positions = [];
    timeBaseline = null;
  }, 500);
  const updatePosition = throttle<MouseEvent | TouchEvent>(
    (evt) => {
      const { target } = evt;
      const { clientX, clientY } = isTouchEvent(evt)
        ? evt.changedTouches[0]
        : evt;
      if (!timeBaseline) {
        timeBaseline = Date.now();
      }
      positions.push({
        x: clientX,
        y: clientY,
        id: mirror.getId(target as INode),
        timeOffset: Date.now() - timeBaseline,
      });
      wrappedCb(isTouchEvent(evt));
    },
    threshold,
    {
      trailing: false,
    },
  );
  const handlers = [
    on('mousemove', updatePosition),
    on('touchmove', updatePosition),
  ];
  return () => {
    handlers.forEach((h) => h());
  };
}

function initMouseInteractionObserver(
  cb: mouseInteractionCallBack,
  blockClass: blockClass,
  sampling: SamplingStrategy,
): listenerHandler {
  if (sampling.mouseInteraction === false) {
    return () => {};
  }
  const disableMap: Record<string, boolean | undefined> =
    sampling.mouseInteraction === true ||
    sampling.mouseInteraction === undefined
      ? {}
      : sampling.mouseInteraction;

  const handlers: listenerHandler[] = [];
  const getHandler = (eventKey: keyof typeof MouseInteractions) => {
    return (event: MouseEvent | TouchEvent) => {
      if (isBlocked(event.target as Node, blockClass)) {
        return;
      }
      const id = mirror.getId(event.target as INode);
      const { clientX, clientY } = isTouchEvent(event)
        ? event.changedTouches[0]
        : event;
      cb({
        type: MouseInteractions[eventKey],
        id,
        x: clientX,
        y: clientY,
      });
    };
  };
  Object.keys(MouseInteractions)
    .filter(
      (key) =>
        Number.isNaN(Number(key)) &&
        !key.endsWith('_Departed') &&
        disableMap[key] !== false,
    )
    .forEach((eventKey: keyof typeof MouseInteractions) => {
      const eventName = eventKey.toLowerCase();
      const handler = getHandler(eventKey);
      handlers.push(on(eventName, handler));
    });
  return () => {
    handlers.forEach((h) => h());
  };
}

function initScrollObserver(
  cb: scrollCallback,
  blockClass: blockClass,
  sampling: SamplingStrategy,
): listenerHandler {
  const updatePosition = throttle<UIEvent>((evt) => {
    if (!evt.target || isBlocked(evt.target as Node, blockClass)) {
      return;
    }
    const id = mirror.getId(evt.target as INode);
    if (evt.target === document) {
      const scrollEl = (document.scrollingElement || document.documentElement)!;
      cb({
        id,
        x: scrollEl.scrollLeft,
        y: scrollEl.scrollTop,
      });
    } else {
      cb({
        id,
        x: (evt.target as HTMLElement).scrollLeft,
        y: (evt.target as HTMLElement).scrollTop,
      });
    }
  }, sampling.scroll || 100);
  return on('scroll', updatePosition);
}

function initViewportResizeObserver(
  cb: viewportResizeCallback,
): listenerHandler {
  let last_h = -1;
  let last_w = -1;
  const updateDimension = throttle(() => {
    const height = getWindowHeight();
    const width = getWindowWidth();
    if (last_h !== height || last_w != width) {
      cb({
        width: Number(width),
        height: Number(height),
      });
      last_h = height;
      last_w = width;
    }
  }, 200);
  return on('resize', updateDimension, window);
}

export const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
const lastInputValueMap: WeakMap<EventTarget, inputValue> = new WeakMap();
function initInputObserver(
  cb: inputCallback,
  blockClass: blockClass,
  ignoreClass: string,
  maskInputOptions: MaskInputOptions,
  maskInputFn: MaskInputFn | undefined,
  sampling: SamplingStrategy,
): listenerHandler {
  function eventHandler(event: Event) {
    const { target } = event;
    if (
      !target ||
      !(target as Element).tagName ||
      INPUT_TAGS.indexOf((target as Element).tagName) < 0 ||
      isBlocked(target as Node, blockClass)
    ) {
      return;
    }
    const type: string | undefined = (target as HTMLInputElement).type;
    if (
      type === 'password' ||
      (target as HTMLElement).classList.contains(ignoreClass)
    ) {
      return;
    }
    let text = (target as HTMLInputElement).value;
    let isChecked = false;
    if (type === 'radio' || type === 'checkbox') {
      isChecked = (target as HTMLInputElement).checked;
    } else if (
      maskInputOptions[
        (target as Element).tagName.toLowerCase() as keyof MaskInputOptions
      ] ||
      maskInputOptions[type as keyof MaskInputOptions]
    ) {
      if (maskInputFn) {
        text = maskInputFn(text);
      } else {
        text = '*'.repeat(text.length);
      }
    }
    cbWithDedup(target, { text, isChecked });
    // if a radio was checked
    // the other radios with the same name attribute will be unchecked.
    const name: string | undefined = (target as HTMLInputElement).name;
    if (type === 'radio' && name && isChecked) {
      document
        .querySelectorAll(`input[type="radio"][name="${name}"]`)
        .forEach((el) => {
          if (el !== target) {
            cbWithDedup(el, {
              text: (el as HTMLInputElement).value,
              isChecked: !isChecked,
            });
          }
        });
    }
  }
  function cbWithDedup(target: EventTarget, v: inputValue) {
    const lastInputValue = lastInputValueMap.get(target);
    if (
      !lastInputValue ||
      lastInputValue.text !== v.text ||
      lastInputValue.isChecked !== v.isChecked
    ) {
      lastInputValueMap.set(target, v);
      const id = mirror.getId(target as INode);
      cb({
        ...v,
        id,
      });
    }
  }
  const events = sampling.input === 'last' ? ['change'] : ['input', 'change'];
  const handlers: Array<
    listenerHandler | hookResetter
  > = events.map((eventName) => on(eventName, eventHandler));
  const propertyDescriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  );
  const hookProperties: Array<[HTMLElement, string]> = [
    [HTMLInputElement.prototype, 'value'],
    [HTMLInputElement.prototype, 'checked'],
    [HTMLSelectElement.prototype, 'value'],
    [HTMLTextAreaElement.prototype, 'value'],
    // Some UI library use selectedIndex to set select value
    [HTMLSelectElement.prototype, 'selectedIndex'],
  ];
  if (propertyDescriptor && propertyDescriptor.set) {
    handlers.push(
      ...hookProperties.map((p) =>
        hookSetter<HTMLElement>(p[0], p[1], {
          set() {
            // mock to a normal event
            eventHandler({ target: this } as Event);
          },
        }),
      ),
    );
  }
  return () => {
    handlers.forEach((h) => h());
  };
}

function initStyleSheetObserver(cb: styleSheetRuleCallback): listenerHandler {
  const insertRule = CSSStyleSheet.prototype.insertRule;
  CSSStyleSheet.prototype.insertRule = function (rule: string, index?: number) {
    const id = mirror.getId(this.ownerNode as INode);
    if (id !== -1) {
      cb({
        id,
        adds: [{ rule, index }],
      });
    }
    return insertRule.apply(this, arguments);
  };

  const deleteRule = CSSStyleSheet.prototype.deleteRule;
  CSSStyleSheet.prototype.deleteRule = function (index: number) {
    const id = mirror.getId(this.ownerNode as INode);
    if (id !== -1) {
      cb({
        id,
        removes: [{ index }],
      });
    }
    return deleteRule.apply(this, arguments);
  };

  return () => {
    CSSStyleSheet.prototype.insertRule = insertRule;
    CSSStyleSheet.prototype.deleteRule = deleteRule;
  };
}

function initMediaInteractionObserver(
  mediaInteractionCb: mediaInteractionCallback,
  blockClass: blockClass,
): listenerHandler {
  const handler = (type: 'play' | 'pause') => (event: Event) => {
    const { target } = event;
    if (!target || isBlocked(target as Node, blockClass)) {
      return;
    }
    mediaInteractionCb({
      type: type === 'play' ? MediaInteractions.Play : MediaInteractions.Pause,
      id: mirror.getId(target as INode),
    });
  };
  const handlers = [on('play', handler('play')), on('pause', handler('pause'))];
  return () => {
    handlers.forEach((h) => h());
  };
}

function initCanvasMutationObserver(
  cb: canvasMutationCallback,
  blockClass: blockClass,
): listenerHandler {
  const props = Object.getOwnPropertyNames(CanvasRenderingContext2D.prototype);
  const handlers: listenerHandler[] = [];
  for (const prop of props) {
    try {
      if (
        typeof CanvasRenderingContext2D.prototype[
          prop as keyof CanvasRenderingContext2D
        ] !== 'function'
      ) {
        continue;
      }
      const restoreHandler = patch(
        CanvasRenderingContext2D.prototype,
        prop,
        function (original) {
          return function (
            this: CanvasRenderingContext2D,
            ...args: Array<unknown>
          ) {
            if (!isBlocked(this.canvas, blockClass)) {
              setTimeout(() => {
                const recordArgs = [...args];
                if (prop === 'drawImage') {
                  if (
                    recordArgs[0] &&
                    recordArgs[0] instanceof HTMLCanvasElement
                  ) {
                    recordArgs[0] = recordArgs[0].toDataURL();
                  }
                }
                cb({
                  id: mirror.getId((this.canvas as unknown) as INode),
                  property: prop,
                  args: recordArgs,
                });
              }, 0);
            }
            return original.apply(this, args);
          };
        },
      );
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter<CanvasRenderingContext2D>(
        CanvasRenderingContext2D.prototype,
        prop,
        {
          set(v) {
            cb({
              id: mirror.getId((this.canvas as unknown) as INode),
              property: prop,
              args: [v],
              setter: true,
            });
          },
        },
      );
      handlers.push(hookHandler);
    }
  }
  return () => {
    handlers.forEach((h) => h());
  };
}

function initFontObserver(cb: fontCallback): listenerHandler {
  const handlers: listenerHandler[] = [];

  const fontMap = new WeakMap<FontFace, fontParam>();

  const originalFontFace = FontFace;
  // tslint:disable-next-line: no-any
  (window as any).FontFace = function FontFace(
    family: string,
    source: string | ArrayBufferView,
    descriptors?: FontFaceDescriptors,
  ) {
    const fontFace = new originalFontFace(family, source, descriptors);
    fontMap.set(fontFace, {
      family,
      buffer: typeof source !== 'string',
      descriptors,
      fontSource:
        typeof source === 'string'
          ? source
          : // tslint:disable-next-line: no-any
            JSON.stringify(Array.from(new Uint8Array(source as any))),
    });
    return fontFace;
  };

  const restoreHandler = patch(document.fonts, 'add', function (original) {
    return function (this: FontFaceSet, fontFace: FontFace) {
      setTimeout(() => {
        const p = fontMap.get(fontFace);
        if (p) {
          cb(p);
          fontMap.delete(fontFace);
        }
      }, 0);
      return original.apply(this, [fontFace]);
    };
  });

  handlers.push(() => {
    // tslint:disable-next-line: no-any
    (window as any).FonFace = originalFontFace;
  });
  handlers.push(restoreHandler);

  return () => {
    handlers.forEach((h) => h());
  };
}

function initLogObserver(
  cb: logCallback,
  logOptions: LogRecordOptions,
): listenerHandler {
  const logger = logOptions.logger;
  if (!logger) return () => {};
  let logCount = 0;
  const cancelHandlers: any[] = [];
  // add listener to thrown errors
  if (logOptions.level!.includes('error')) {
    if (window) {
      const originalOnError = window.onerror;
      window.onerror = (...args: any[]) => {
        originalOnError && originalOnError.apply(this, args);
        let stack: Array<string> = [];
        if (args[args.length - 1] instanceof Error)
          // 0(the second parameter) tells parseStack that every stack in Error is useful
          stack = parseStack(args[args.length - 1].stack, 0);
        const payload = [stringify(args[0], logOptions.stringifyOptions)];
        cb({
          level: 'error',
          trace: stack,
          payload: payload,
        });
      };
      cancelHandlers.push(() => {
        window.onerror = originalOnError;
      });
    }
  }
  for (const levelType of logOptions.level!)
    cancelHandlers.push(replace(logger, levelType));
  return () => {
    cancelHandlers.forEach((h) => h());
  };

  /**
   * replace the original console function and record logs
   * @param logger the logger object such as Console
   * @param level the name of log function to be replaced
   */
  function replace(logger: Logger, level: LogLevel) {
    if (!logger[level]) return () => {};
    // replace the logger.{level}. return a restore function
    return patch(logger, level, (original) => {
      return (...args: any[]) => {
        original.apply(this, args);
        try {
          const stack = parseStack(new Error().stack);
          const payload = args.map((s) =>
            stringify(s, logOptions.stringifyOptions),
          );
          logCount++;
          if (logCount < logOptions.lengthThreshold!)
            cb({
              level: level,
              trace: stack,
              payload: payload,
            });
          else if (logCount === logOptions.lengthThreshold)
            // notify the user
            cb({
              level: 'warn',
              trace: [],
              payload: [
                stringify('The number of log records reached the threshold.'),
              ],
            });
        } catch (error) {
          original('rrweb logger error:', error, ...args);
        }
      };
    });
  }
  /**
   * parse single stack message to an stack array.
   * @param stack the stack message to be parsed
   * @param omitDepth omit specific depth of useless stack. omit hijacked log function by default
   */
  function parseStack(
    stack: string | undefined,
    omitDepth: number = 1,
  ): Array<string> {
    let stacks: string[] = [];
    if (stack) {
      stacks = stack
        .split('at')
        .splice(1 + omitDepth)
        .map((s) => s.trim());
    }
    return stacks;
  }
}

function mergeHooks(o: observerParam, hooks: hooksParam) {
  const {
    mutationCb,
    mousemoveCb,
    mouseInteractionCb,
    scrollCb,
    viewportResizeCb,
    inputCb,
    mediaInteractionCb,
    styleSheetRuleCb,
    canvasMutationCb,
    fontCb,
    logCb,
  } = o;
  o.mutationCb = (...p: Arguments<mutationCallBack>) => {
    if (hooks.mutation) {
      hooks.mutation(...p);
    }
    mutationCb(...p);
  };
  o.mousemoveCb = (...p: Arguments<mousemoveCallBack>) => {
    if (hooks.mousemove) {
      hooks.mousemove(...p);
    }
    mousemoveCb(...p);
  };
  o.mouseInteractionCb = (...p: Arguments<mouseInteractionCallBack>) => {
    if (hooks.mouseInteraction) {
      hooks.mouseInteraction(...p);
    }
    mouseInteractionCb(...p);
  };
  o.scrollCb = (...p: Arguments<scrollCallback>) => {
    if (hooks.scroll) {
      hooks.scroll(...p);
    }
    scrollCb(...p);
  };
  o.viewportResizeCb = (...p: Arguments<viewportResizeCallback>) => {
    if (hooks.viewportResize) {
      hooks.viewportResize(...p);
    }
    viewportResizeCb(...p);
  };
  o.inputCb = (...p: Arguments<inputCallback>) => {
    if (hooks.input) {
      hooks.input(...p);
    }
    inputCb(...p);
  };
  o.mediaInteractionCb = (...p: Arguments<mediaInteractionCallback>) => {
    if (hooks.mediaInteaction) {
      hooks.mediaInteaction(...p);
    }
    mediaInteractionCb(...p);
  };
  o.styleSheetRuleCb = (...p: Arguments<styleSheetRuleCallback>) => {
    if (hooks.styleSheetRule) {
      hooks.styleSheetRule(...p);
    }
    styleSheetRuleCb(...p);
  };
  o.canvasMutationCb = (...p: Arguments<canvasMutationCallback>) => {
    if (hooks.canvasMutation) {
      hooks.canvasMutation(...p);
    }
    canvasMutationCb(...p);
  };
  o.fontCb = (...p: Arguments<fontCallback>) => {
    if (hooks.font) {
      hooks.font(...p);
    }
    fontCb(...p);
  };
  o.logCb = (...p: Arguments<logCallback>) => {
    if (hooks.log) {
      hooks.log(...p);
    }
    logCb(...p);
  };
}

export function initObservers(
  o: observerParam,
  hooks: hooksParam = {},
): listenerHandler {
  mergeHooks(o, hooks);
  const mutationObserver = initMutationObserver(
    o.mutationCb,
    o.blockClass,
    o.blockSelector,
    o.inlineStylesheet,
    o.maskInputOptions,
    o.recordCanvas,
    o.slimDOMOptions,
  );
  const mousemoveHandler = initMoveObserver(o.mousemoveCb, o.sampling);
  const mouseInteractionHandler = initMouseInteractionObserver(
    o.mouseInteractionCb,
    o.blockClass,
    o.sampling,
  );
  const scrollHandler = initScrollObserver(
    o.scrollCb,
    o.blockClass,
    o.sampling,
  );
  const viewportResizeHandler = initViewportResizeObserver(o.viewportResizeCb);
  const inputHandler = initInputObserver(
    o.inputCb,
    o.blockClass,
    o.ignoreClass,
    o.maskInputOptions,
    o.maskInputFn,
    o.sampling,
  );
  const mediaInteractionHandler = initMediaInteractionObserver(
    o.mediaInteractionCb,
    o.blockClass,
  );
  const styleSheetObserver = initStyleSheetObserver(o.styleSheetRuleCb);
  const canvasMutationObserver = o.recordCanvas
    ? initCanvasMutationObserver(o.canvasMutationCb, o.blockClass)
    : () => {};
  const fontObserver = o.collectFonts ? initFontObserver(o.fontCb) : () => {};
  const logObserver = o.logOptions
    ? initLogObserver(o.logCb, o.logOptions)
    : () => {};

  return () => {
    mutationObserver.disconnect();
    mousemoveHandler();
    mouseInteractionHandler();
    scrollHandler();
    viewportResizeHandler();
    inputHandler();
    mediaInteractionHandler();
    styleSheetObserver();
    canvasMutationObserver();
    fontObserver();
    logObserver();
  };
}
