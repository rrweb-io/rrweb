import {
  type MaskInputOptions,
  maskInputValue,
  Mirror,
  getInputType,
  toLowerCase,
} from '@saola.ai/rrweb-snapshot';
import type { FontFaceSet } from 'css-font-loading-module';
import {
  throttle,
  on,
  hookSetter,
  getWindowScroll,
  getWindowHeight,
  getWindowWidth,
  isBlocked,
  legacy_isTouchEvent,
  patch,
  StyleSheetMirror,
  nowTimestamp,
} from '../utils';
import type { observerParam, MutationBufferParam } from '../types';
import {
  IncrementalSource,
  MouseInteractions,
  PointerTypes,
  MediaInteractions,
} from '@saola.ai/rrweb-types';
import type {
  mutationCallBack,
  mousemoveCallBack,
  mousePosition,
  mouseInteractionCallBack,
  listenerHandler,
  scrollCallback,
  styleSheetRuleCallback,
  viewportResizeCallback,
  inputValue,
  inputCallback,
  hookResetter,
  hooksParam,
  Arguments,
  mediaInteractionCallback,
  canvasMutationCallback,
  fontCallback,
  fontParam,
  styleDeclarationCallback,
  IWindow,
  SelectionRange,
  selectionCallback,
  customElementCallback,
} from '@saola.ai/rrweb-types';
import MutationBuffer from './mutation';
import { callbackWrapper } from './error-handler';
import dom, { mutationObserverCtor } from '@rrweb/utils';

export const mutationBuffers: MutationBuffer[] = [];

// Event.path is non-standard and used in some older browsers
type NonStandardEvent = Omit<Event, 'composedPath'> & {
  path: EventTarget[];
};

function getEventTarget(event: Event | NonStandardEvent): EventTarget | null {
  try {
    if ('composedPath' in event) {
      const path = event.composedPath();
      if (path.length) {
        return path[0];
      }
    } else if ('path' in event && event.path.length) {
      return event.path[0];
    }
  } catch {
    // fallback to `event.target` below
  }

  return event && event.target;
}

export function initMutationObserver(
  options: MutationBufferParam,
  rootEl: Node,
): MutationObserver {
  const mutationBuffer = new MutationBuffer();
  mutationBuffers.push(mutationBuffer);
  // see mutation.ts for details
  mutationBuffer.init(options);
  const observer = new (mutationObserverCtor() as new (
    callback: MutationCallback,
  ) => MutationObserver)(
    callbackWrapper(mutationBuffer.processMutations.bind(mutationBuffer)),
  );
  observer.observe(rootEl, {
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
    childList: true,
    subtree: true,
  });
  return observer;
}

function initMoveObserver({
  mousemoveCb,
  sampling,
  doc,
  mirror,
}: observerParam): listenerHandler {
  if (sampling.mousemove === false) {
    return () => {
      //
    };
  }

  const threshold =
    typeof sampling.mousemove === 'number' ? sampling.mousemove : 50;
  const callbackThreshold =
    typeof sampling.mousemoveCallback === 'number'
      ? sampling.mousemoveCallback
      : 500;

  let positions: mousePosition[] = [];
  let timeBaseline: number | null;
  const wrappedCb = throttle(
    callbackWrapper(
      (
        source:
          | IncrementalSource.MouseMove
          | IncrementalSource.TouchMove
          | IncrementalSource.Drag,
      ) => {
        const totalOffset = Date.now() - timeBaseline!;
        mousemoveCb(
          positions.map((p) => {
            p.timeOffset -= totalOffset;
            return p;
          }),
          source,
        );
        positions = [];
        timeBaseline = null;
      },
    ),
    callbackThreshold,
  );
  const updatePosition = callbackWrapper(
    throttle<MouseEvent | TouchEvent | DragEvent>(
      callbackWrapper((evt) => {
        const target = getEventTarget(evt);
        // 'legacy' here as we could switch to https://developer.mozilla.org/en-US/docs/Web/API/Element/pointermove_event
        const { clientX, clientY } = legacy_isTouchEvent(evt)
          ? evt.changedTouches[0]
          : evt;
        if (!timeBaseline) {
          timeBaseline = nowTimestamp();
        }
        positions.push({
          x: clientX,
          y: clientY,
          id: mirror.getId(target as Node),
          timeOffset: nowTimestamp() - timeBaseline,
        });
        // it is possible DragEvent is undefined even on devices
        // that support event 'drag'
        wrappedCb(
          typeof DragEvent !== 'undefined' && evt instanceof DragEvent
            ? IncrementalSource.Drag
            : evt instanceof MouseEvent
            ? IncrementalSource.MouseMove
            : IncrementalSource.TouchMove,
        );
      }),
      threshold,
      {
        trailing: false,
      },
    ),
  );
  const handlers = [
    on('mousemove', updatePosition, doc),
    on('touchmove', updatePosition, doc),
    on('drag', updatePosition, doc),
  ];
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}

function initMouseInteractionObserver({
  mouseInteractionCb,
  doc,
  mirror,
  blockClass,
  blockSelector,
  sampling,
}: observerParam): listenerHandler {
  if (sampling.mouseInteraction === false) {
    return () => {
      //
    };
  }
  const disableMap: Record<string, boolean | undefined> =
    sampling.mouseInteraction === true ||
    sampling.mouseInteraction === undefined
      ? {}
      : sampling.mouseInteraction;

  const handlers: listenerHandler[] = [];
  let currentPointerType: PointerTypes | null = null;
  const getHandler = (eventKey: keyof typeof MouseInteractions) => {
    return (event: MouseEvent | TouchEvent | PointerEvent) => {
      const target = getEventTarget(event) as Node;
      if (isBlocked(target, blockClass, blockSelector, true)) {
        return;
      }
      let pointerType: PointerTypes | null = null;
      let thisEventKey = eventKey;
      if ('pointerType' in event) {
        switch (event.pointerType) {
          case 'mouse':
            pointerType = PointerTypes.Mouse;
            break;
          case 'touch':
            pointerType = PointerTypes.Touch;
            break;
          case 'pen':
            pointerType = PointerTypes.Pen;
            break;
        }
        if (pointerType === PointerTypes.Touch) {
          if (MouseInteractions[eventKey] === MouseInteractions.MouseDown) {
            // we are actually listening on 'pointerdown'
            thisEventKey = 'TouchStart';
          } else if (
            MouseInteractions[eventKey] === MouseInteractions.MouseUp
          ) {
            // we are actually listening on 'pointerup'
            thisEventKey = 'TouchEnd';
          }
        } else if (pointerType === PointerTypes.Pen) {
          // TODO: these will get incorrectly emitted as MouseDown/MouseUp
        }
      } else if (legacy_isTouchEvent(event)) {
        pointerType = PointerTypes.Touch;
      }
      if (pointerType !== null) {
        currentPointerType = pointerType;
        if (
          (thisEventKey.startsWith('Touch') &&
            pointerType === PointerTypes.Touch) ||
          (thisEventKey.startsWith('Mouse') &&
            pointerType === PointerTypes.Mouse)
        ) {
          // don't output redundant info
          pointerType = null;
        }
      } else if (MouseInteractions[eventKey] === MouseInteractions.Click) {
        pointerType = currentPointerType;
        currentPointerType = null; // cleanup as we've used it
      }
      const e = legacy_isTouchEvent(event) ? event.changedTouches[0] : event;
      if (!e) {
        return;
      }
      const id = mirror.getId(target);
      const { clientX, clientY } = e;
      callbackWrapper(mouseInteractionCb)({
        type: MouseInteractions[thisEventKey],
        id,
        x: clientX,
        y: clientY,
        ...(pointerType !== null && { pointerType }),
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
      let eventName = toLowerCase(eventKey);
      const handler = getHandler(eventKey);
      if (window.PointerEvent) {
        switch (MouseInteractions[eventKey]) {
          case MouseInteractions.MouseDown:
          case MouseInteractions.MouseUp:
            eventName = eventName.replace(
              'mouse',
              'pointer',
            ) as unknown as typeof eventName;
            break;
          case MouseInteractions.TouchStart:
          case MouseInteractions.TouchEnd:
            // these are handled by pointerdown/pointerup
            return;
        }
      }
      handlers.push(on(eventName, handler, doc));
    });
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}

export function initScrollObserver({
  scrollCb,
  doc,
  mirror,
  blockClass,
  blockSelector,
  sampling,
}: Pick<
  observerParam,
  'scrollCb' | 'doc' | 'mirror' | 'blockClass' | 'blockSelector' | 'sampling'
>): listenerHandler {
  const updatePosition = callbackWrapper(
    throttle<UIEvent>(
      callbackWrapper((evt) => {
        const target = getEventTarget(evt);
        if (
          !target ||
          isBlocked(target as Node, blockClass, blockSelector, true)
        ) {
          return;
        }
        const id = mirror.getId(target as Node);
        if (target === doc && doc.defaultView) {
          const scrollLeftTop = getWindowScroll(doc.defaultView);
          scrollCb({
            id,
            x: scrollLeftTop.left,
            y: scrollLeftTop.top,
          });
        } else {
          scrollCb({
            id,
            x: (target as HTMLElement).scrollLeft,
            y: (target as HTMLElement).scrollTop,
          });
        }
      }),
      sampling.scroll || 100,
    ),
  );
  return on('scroll', updatePosition, doc);
}

function initViewportResizeObserver(
  { viewportResizeCb }: observerParam,
  { win }: { win: IWindow },
): listenerHandler {
  let lastH = -1;
  let lastW = -1;
  const updateDimension = callbackWrapper(
    throttle(
      callbackWrapper(() => {
        const height = getWindowHeight();
        const width = getWindowWidth();
        if (lastH !== height || lastW !== width) {
          viewportResizeCb({
            width: Number(width),
            height: Number(height),
          });
          lastH = height;
          lastW = width;
        }
      }),
      200,
    ),
  );
  return on('resize', updateDimension, win);
}

export const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
const lastInputValueMap: WeakMap<EventTarget, inputValue> = new WeakMap();
function initInputObserver({
  inputCb,
  doc,
  mirror,
  blockClass,
  blockSelector,
  ignoreClass,
  ignoreSelector,
  maskInputOptions,
  maskInputFn,
  sampling,
  userTriggeredOnInput,
}: observerParam): listenerHandler {
  function eventHandler(event: Event) {
    let target = getEventTarget(event) as HTMLElement | null;
    const userTriggered = event.isTrusted;
    const tagName = target && target.tagName;

    /**
     * If a site changes the value 'selected' of an option element, the value of its parent element, usually a select element, will be changed as well.
     * We can treat this change as a value change of the select element the current target belongs to.
     */
    if (target && tagName === 'OPTION') {
      target = dom.parentElement(target);
    }
    if (
      !target ||
      !tagName ||
      INPUT_TAGS.indexOf(tagName) < 0 ||
      isBlocked(target as Node, blockClass, blockSelector, true)
    ) {
      return;
    }

    if (
      target.classList.contains(ignoreClass) ||
      (ignoreSelector && target.matches(ignoreSelector))
    ) {
      return;
    }
    let text = (target as HTMLInputElement).value;
    let isChecked = false;
    const type: Lowercase<string> = getInputType(target) || '';

    if (type === 'radio' || type === 'checkbox') {
      isChecked = (target as HTMLInputElement).checked;
    } else if (
      maskInputOptions[tagName.toLowerCase() as keyof MaskInputOptions] ||
      maskInputOptions[type as keyof MaskInputOptions]
    ) {
      text = maskInputValue({
        element: target,
        maskInputOptions,
        tagName,
        type,
        value: text,
        maskInputFn,
      });
    }
    cbWithDedup(
      target,
      userTriggeredOnInput
        ? { text, isChecked, userTriggered }
        : { text, isChecked },
    );
    // if a radio was checked
    // the other radios with the same name attribute will be unchecked.
    const name: string | undefined = (target as HTMLInputElement).name;
    if (type === 'radio' && name && isChecked) {
      doc
        .querySelectorAll(`input[type="radio"][name="${name}"]`)
        .forEach((el) => {
          if (el !== target) {
            const text = (el as HTMLInputElement).value;
            cbWithDedup(
              el,
              userTriggeredOnInput
                ? { text, isChecked: !isChecked, userTriggered: false }
                : { text, isChecked: !isChecked },
            );
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
      const id = mirror.getId(target as Node);
      callbackWrapper(inputCb)({
        ...v,
        id,
      });
    }
  }
  const events = sampling.input === 'last' ? ['change'] : ['input', 'change'];
  const handlers: Array<listenerHandler | hookResetter> = events.map(
    (eventName) => on(eventName, callbackWrapper(eventHandler), doc),
  );
  const currentWindow = doc.defaultView;
  if (!currentWindow) {
    return () => {
      handlers.forEach((h) => h());
    };
  }
  const propertyDescriptor = currentWindow.Object.getOwnPropertyDescriptor(
    currentWindow.HTMLInputElement.prototype,
    'value',
  );
  const hookProperties: Array<[HTMLElement, string]> = [
    [currentWindow.HTMLInputElement.prototype, 'value'],
    [currentWindow.HTMLInputElement.prototype, 'checked'],
    [currentWindow.HTMLSelectElement.prototype, 'value'],
    [currentWindow.HTMLTextAreaElement.prototype, 'value'],
    // Some UI library use selectedIndex to set select value
    [currentWindow.HTMLSelectElement.prototype, 'selectedIndex'],
    [currentWindow.HTMLOptionElement.prototype, 'selected'],
  ];
  if (propertyDescriptor && propertyDescriptor.set) {
    handlers.push(
      ...hookProperties.map((p) =>
        hookSetter<HTMLElement>(
          p[0],
          p[1],
          {
            set() {
              // mock to a normal event
              callbackWrapper(eventHandler)({
                target: this as EventTarget,
                isTrusted: false, // userTriggered to false as this could well be programmatic
              } as Event);
            },
          },
          false,
          currentWindow,
        ),
      ),
    );
  }
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}

type GroupingCSSRule =
  | CSSGroupingRule
  | CSSMediaRule
  | CSSSupportsRule
  | CSSConditionRule;
type GroupingCSSRuleTypes =
  | typeof CSSGroupingRule
  | typeof CSSMediaRule
  | typeof CSSSupportsRule
  | typeof CSSConditionRule;

function getNestedCSSRulePositions(rule: CSSRule): number[] {
  const positions: number[] = [];
  function recurse(childRule: CSSRule, pos: number[]) {
    if (
      (hasNestedCSSRule('CSSGroupingRule') &&
        childRule.parentRule instanceof CSSGroupingRule) ||
      (hasNestedCSSRule('CSSMediaRule') &&
        childRule.parentRule instanceof CSSMediaRule) ||
      (hasNestedCSSRule('CSSSupportsRule') &&
        childRule.parentRule instanceof CSSSupportsRule) ||
      (hasNestedCSSRule('CSSConditionRule') &&
        childRule.parentRule instanceof CSSConditionRule)
    ) {
      const rules = Array.from(
        (childRule.parentRule as GroupingCSSRule).cssRules,
      );
      const index = rules.indexOf(childRule);
      pos.unshift(index);
    } else if (childRule.parentStyleSheet) {
      const rules = Array.from(childRule.parentStyleSheet.cssRules);
      const index = rules.indexOf(childRule);
      pos.unshift(index);
    }
    return pos;
  }
  return recurse(rule, positions);
}

/**
 * For StyleSheets in Element, this function retrieves id of its host element.
 * For adopted StyleSheets, this function retrieves its styleId from a styleMirror.
 */
function getIdAndStyleId(
  sheet: CSSStyleSheet | undefined | null,
  mirror: Mirror,
  styleMirror: StyleSheetMirror,
): {
  styleId?: number;
  id?: number;
} {
  let id, styleId;
  if (!sheet) return {};
  if (sheet.ownerNode) id = mirror.getId(sheet.ownerNode as Node);
  else styleId = styleMirror.getId(sheet);
  return {
    styleId,
    id,
  };
}

function initStyleSheetObserver(
  { styleSheetRuleCb, mirror, stylesheetManager }: observerParam,
  { win }: { win: IWindow },
): listenerHandler {
  if (!win.CSSStyleSheet || !win.CSSStyleSheet.prototype) {
    // If, for whatever reason, CSSStyleSheet is not available, we skip the observation of stylesheets.
    return () => {
      // Do nothing
    };
  }

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const insertRule = win.CSSStyleSheet.prototype.insertRule;
  win.CSSStyleSheet.prototype.insertRule = new Proxy(insertRule, {
    apply: callbackWrapper(
      (
        target: typeof insertRule,
        thisArg: CSSStyleSheet,
        argumentsList: [string, number | undefined],
      ) => {
        const [rule, index] = argumentsList;

        const { id, styleId } = getIdAndStyleId(
          thisArg,
          mirror,
          stylesheetManager.styleMirror,
        );

        if ((id && id !== -1) || (styleId && styleId !== -1)) {
          styleSheetRuleCb({
            id,
            styleId,
            adds: [{ rule, index }],
          });
        }
        return target.apply(thisArg, argumentsList);
      },
    ),
  });

  // Support for deprecated addRule method
  win.CSSStyleSheet.prototype.addRule = function (
    this: CSSStyleSheet,
    selector: string,
    styleBlock: string,
    index: number = this.cssRules.length,
  ) {
    const rule = `${selector} { ${styleBlock} }`;
    return win.CSSStyleSheet.prototype.insertRule.apply(this, [rule, index]);
  };

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const deleteRule = win.CSSStyleSheet.prototype.deleteRule;
  win.CSSStyleSheet.prototype.deleteRule = new Proxy(deleteRule, {
    apply: callbackWrapper(
      (
        target: typeof deleteRule,
        thisArg: CSSStyleSheet,
        argumentsList: [number],
      ) => {
        const [index] = argumentsList;

        const { id, styleId } = getIdAndStyleId(
          thisArg,
          mirror,
          stylesheetManager.styleMirror,
        );

        if ((id && id !== -1) || (styleId && styleId !== -1)) {
          styleSheetRuleCb({
            id,
            styleId,
            removes: [{ index }],
          });
        }
        return target.apply(thisArg, argumentsList);
      },
    ),
  });

  // Support for deprecated removeRule method
  win.CSSStyleSheet.prototype.removeRule = function (
    this: CSSStyleSheet,
    index: number,
  ) {
    return win.CSSStyleSheet.prototype.deleteRule.apply(this, [index]);
  };

  let replace: (text: string) => Promise<CSSStyleSheet>;

  if (win.CSSStyleSheet.prototype.replace) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    replace = win.CSSStyleSheet.prototype.replace;
    win.CSSStyleSheet.prototype.replace = new Proxy(replace, {
      apply: callbackWrapper(
        (
          target: typeof replace,
          thisArg: CSSStyleSheet,
          argumentsList: [string],
        ) => {
          const [text] = argumentsList;

          const { id, styleId } = getIdAndStyleId(
            thisArg,
            mirror,
            stylesheetManager.styleMirror,
          );

          if ((id && id !== -1) || (styleId && styleId !== -1)) {
            styleSheetRuleCb({
              id,
              styleId,
              replace: text,
            });
          }
          return target.apply(thisArg, argumentsList);
        },
      ),
    });
  }

  let replaceSync: (text: string) => void;
  if (win.CSSStyleSheet.prototype.replaceSync) {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    replaceSync = win.CSSStyleSheet.prototype.replaceSync;
    win.CSSStyleSheet.prototype.replaceSync = new Proxy(replaceSync, {
      apply: callbackWrapper(
        (
          target: typeof replaceSync,
          thisArg: CSSStyleSheet,
          argumentsList: [string],
        ) => {
          const [text] = argumentsList;

          const { id, styleId } = getIdAndStyleId(
            thisArg,
            mirror,
            stylesheetManager.styleMirror,
          );

          if ((id && id !== -1) || (styleId && styleId !== -1)) {
            styleSheetRuleCb({
              id,
              styleId,
              replaceSync: text,
            });
          }
          return target.apply(thisArg, argumentsList);
        },
      ),
    });
  }

  const supportedNestedCSSRuleTypes: {
    [key: string]: GroupingCSSRuleTypes;
  } = {};
  if (canMonkeyPatchNestedCSSRule('CSSGroupingRule')) {
    supportedNestedCSSRuleTypes.CSSGroupingRule = win.CSSGroupingRule;
  } else {
    // Some browsers (Safari) don't support CSSGroupingRule
    // https://caniuse.com/?search=cssgroupingrule
    // fall back to monkey patching classes that would have inherited from CSSGroupingRule

    if (canMonkeyPatchNestedCSSRule('CSSMediaRule')) {
      supportedNestedCSSRuleTypes.CSSMediaRule = win.CSSMediaRule;
    }
    if (canMonkeyPatchNestedCSSRule('CSSConditionRule')) {
      supportedNestedCSSRuleTypes.CSSConditionRule = win.CSSConditionRule;
    }
    if (canMonkeyPatchNestedCSSRule('CSSSupportsRule')) {
      supportedNestedCSSRuleTypes.CSSSupportsRule = win.CSSSupportsRule;
    }
  }

  const unmodifiedFunctions: {
    [key: string]: {
      insertRule: (rule: string, index?: number) => number;
      deleteRule: (index: number) => void;
    };
  } = {};

  Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
    unmodifiedFunctions[typeKey] = {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      insertRule: type.prototype.insertRule,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      deleteRule: type.prototype.deleteRule,
    };

    type.prototype.insertRule = new Proxy(
      unmodifiedFunctions[typeKey].insertRule,
      {
        apply: callbackWrapper(
          (
            target: typeof insertRule,
            thisArg: CSSRule,
            argumentsList: [string, number | undefined],
          ) => {
            const [rule, index] = argumentsList;

            const { id, styleId } = getIdAndStyleId(
              thisArg.parentStyleSheet,
              mirror,
              stylesheetManager.styleMirror,
            );

            if ((id && id !== -1) || (styleId && styleId !== -1)) {
              styleSheetRuleCb({
                id,
                styleId,
                adds: [
                  {
                    rule,
                    index: [
                      ...getNestedCSSRulePositions(thisArg),
                      index || 0, // defaults to 0
                    ],
                  },
                ],
              });
            }
            return target.apply(thisArg, argumentsList);
          },
        ),
      },
    );

    type.prototype.deleteRule = new Proxy(
      unmodifiedFunctions[typeKey].deleteRule,
      {
        apply: callbackWrapper(
          (
            target: typeof deleteRule,
            thisArg: CSSRule,
            argumentsList: [number],
          ) => {
            const [index] = argumentsList;

            const { id, styleId } = getIdAndStyleId(
              thisArg.parentStyleSheet,
              mirror,
              stylesheetManager.styleMirror,
            );

            if ((id && id !== -1) || (styleId && styleId !== -1)) {
              styleSheetRuleCb({
                id,
                styleId,
                removes: [
                  { index: [...getNestedCSSRulePositions(thisArg), index] },
                ],
              });
            }
            return target.apply(thisArg, argumentsList);
          },
        ),
      },
    );
  });

  return callbackWrapper(() => {
    win.CSSStyleSheet.prototype.insertRule = insertRule;
    win.CSSStyleSheet.prototype.deleteRule = deleteRule;
    replace && (win.CSSStyleSheet.prototype.replace = replace);
    replaceSync && (win.CSSStyleSheet.prototype.replaceSync = replaceSync);
    Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
      type.prototype.insertRule = unmodifiedFunctions[typeKey].insertRule;
      type.prototype.deleteRule = unmodifiedFunctions[typeKey].deleteRule;
    });
  });
}

export function initAdoptedStyleSheetObserver(
  {
    mirror,
    stylesheetManager,
  }: Pick<observerParam, 'mirror' | 'stylesheetManager'>,
  host: Document | ShadowRoot,
): listenerHandler {
  let hostId: number | null = null;
  // host of adoptedStyleSheets is outermost document or IFrame's document
  if (host.nodeName === '#document') hostId = mirror.getId(host);
  // The host is a ShadowRoot.
  else hostId = mirror.getId(dom.host(host as ShadowRoot));

  const patchTarget =
    host.nodeName === '#document'
      ? (host as Document).defaultView?.Document
      : host.ownerDocument?.defaultView?.ShadowRoot;
  const originalPropertyDescriptor = patchTarget?.prototype
    ? Object.getOwnPropertyDescriptor(
        patchTarget?.prototype,
        'adoptedStyleSheets',
      )
    : undefined;
  if (
    hostId === null ||
    hostId === -1 ||
    !patchTarget ||
    !originalPropertyDescriptor
  )
    return () => {
      //
    };

  // Patch adoptedStyleSheets by overriding the original one.
  Object.defineProperty(host, 'adoptedStyleSheets', {
    configurable: originalPropertyDescriptor.configurable,
    enumerable: originalPropertyDescriptor.enumerable,
    get(): CSSStyleSheet[] {
      return originalPropertyDescriptor.get?.call(this) as CSSStyleSheet[];
    },
    set(sheets: CSSStyleSheet[]) {
      const result = originalPropertyDescriptor.set?.call(this, sheets);
      if (hostId !== null && hostId !== -1) {
        try {
          stylesheetManager.adoptStyleSheets(sheets, hostId);
        } catch (e) {
          // for safety
        }
      }
      return result;
    },
  });

  return callbackWrapper(() => {
    Object.defineProperty(host, 'adoptedStyleSheets', {
      configurable: originalPropertyDescriptor.configurable,
      enumerable: originalPropertyDescriptor.enumerable,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      get: originalPropertyDescriptor.get,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      set: originalPropertyDescriptor.set,
    });
  });
}

function initStyleDeclarationObserver(
  {
    styleDeclarationCb,
    mirror,
    ignoreCSSAttributes,
    stylesheetManager,
  }: observerParam,
  { win }: { win: IWindow },
): listenerHandler {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setProperty = win.CSSStyleDeclaration.prototype.setProperty;
  win.CSSStyleDeclaration.prototype.setProperty = new Proxy(setProperty, {
    apply: callbackWrapper(
      (
        target: typeof setProperty,
        thisArg: CSSStyleDeclaration,
        argumentsList: [string, string, string],
      ) => {
        const [property, value, priority] = argumentsList;

        // ignore this mutation if we do not care about this css attribute
        if (ignoreCSSAttributes.has(property)) {
          return setProperty.apply(thisArg, [property, value, priority]);
        }
        const { id, styleId } = getIdAndStyleId(
          thisArg.parentRule?.parentStyleSheet,
          mirror,
          stylesheetManager.styleMirror,
        );
        if ((id && id !== -1) || (styleId && styleId !== -1)) {
          styleDeclarationCb({
            id,
            styleId,
            set: {
              property,
              value,
              priority,
            },
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            index: getNestedCSSRulePositions(thisArg.parentRule!),
          });
        }
        return target.apply(thisArg, argumentsList);
      },
    ),
  });

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const removeProperty = win.CSSStyleDeclaration.prototype.removeProperty;
  win.CSSStyleDeclaration.prototype.removeProperty = new Proxy(removeProperty, {
    apply: callbackWrapper(
      (
        target: typeof removeProperty,
        thisArg: CSSStyleDeclaration,
        argumentsList: [string],
      ) => {
        const [property] = argumentsList;

        // ignore this mutation if we do not care about this css attribute
        if (ignoreCSSAttributes.has(property)) {
          return removeProperty.apply(thisArg, [property]);
        }
        const { id, styleId } = getIdAndStyleId(
          thisArg.parentRule?.parentStyleSheet,
          mirror,
          stylesheetManager.styleMirror,
        );
        if ((id && id !== -1) || (styleId && styleId !== -1)) {
          styleDeclarationCb({
            id,
            styleId,
            remove: {
              property,
            },
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            index: getNestedCSSRulePositions(thisArg.parentRule!),
          });
        }
        return target.apply(thisArg, argumentsList);
      },
    ),
  });

  return callbackWrapper(() => {
    win.CSSStyleDeclaration.prototype.setProperty = setProperty;
    win.CSSStyleDeclaration.prototype.removeProperty = removeProperty;
  });
}

function initMediaInteractionObserver({
  mediaInteractionCb,
  blockClass,
  blockSelector,
  mirror,
  sampling,
  doc,
}: observerParam): listenerHandler {
  const handler = callbackWrapper((type: MediaInteractions) =>
    throttle(
      callbackWrapper((event: Event) => {
        const target = getEventTarget(event);
        if (
          !target ||
          isBlocked(target as Node, blockClass, blockSelector, true)
        ) {
          return;
        }
        const { currentTime, volume, muted, playbackRate, loop } =
          target as HTMLMediaElement;
        mediaInteractionCb({
          type,
          id: mirror.getId(target as Node),
          currentTime,
          volume,
          muted,
          playbackRate,
          loop,
        });
      }),
      sampling.media || 500,
    ),
  );
  const handlers = [
    on('play', handler(MediaInteractions.Play), doc),
    on('pause', handler(MediaInteractions.Pause), doc),
    on('seeked', handler(MediaInteractions.Seeked), doc),
    on('volumechange', handler(MediaInteractions.VolumeChange), doc),
    on('ratechange', handler(MediaInteractions.RateChange), doc),
  ];
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}

function initFontObserver({ fontCb, doc }: observerParam): listenerHandler {
  const win = doc.defaultView as IWindow;
  if (!win) {
    return () => {
      //
    };
  }

  const handlers: listenerHandler[] = [];

  const fontMap = new WeakMap<FontFace, fontParam>();

  const originalFontFace = win.FontFace;
  win.FontFace = function FontFace(
    family: string,
    source: string | ArrayBufferLike,
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
          : JSON.stringify(Array.from(new Uint8Array(source))),
    });
    return fontFace;
  } as unknown as typeof FontFace;

  const restoreHandler = patch(
    doc.fonts,
    'add',
    function (original: (font: FontFace) => void) {
      return function (this: FontFaceSet, fontFace: FontFace) {
        setTimeout(
          callbackWrapper(() => {
            const p = fontMap.get(fontFace);
            if (p) {
              fontCb(p);
              fontMap.delete(fontFace);
            }
          }),
          0,
        );
        return original.apply(this, [fontFace]);
      };
    },
  );

  handlers.push(() => {
    win.FontFace = originalFontFace;
  });
  handlers.push(restoreHandler);

  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}

function initSelectionObserver(param: observerParam): listenerHandler {
  const { doc, mirror, blockClass, blockSelector, selectionCb } = param;
  let collapsed = true;

  const updateSelection = callbackWrapper(() => {
    const selection = doc.getSelection();

    if (!selection || (collapsed && selection?.isCollapsed)) return;

    collapsed = selection.isCollapsed || false;

    const ranges: SelectionRange[] = [];
    const count = selection.rangeCount || 0;

    for (let i = 0; i < count; i++) {
      const range = selection.getRangeAt(i);

      const { startContainer, startOffset, endContainer, endOffset } = range;

      const blocked =
        isBlocked(startContainer, blockClass, blockSelector, true) ||
        isBlocked(endContainer, blockClass, blockSelector, true);

      if (blocked) continue;

      ranges.push({
        start: mirror.getId(startContainer),
        startOffset,
        end: mirror.getId(endContainer),
        endOffset,
      });
    }

    selectionCb({ ranges });
  });

  updateSelection();

  return on('selectionchange', updateSelection);
}

function initCustomElementObserver({
  doc,
  customElementCb,
}: observerParam): listenerHandler {
  const win = doc.defaultView as IWindow;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  if (!win || !win.customElements) return () => {};
  const restoreHandler = patch(
    win.customElements,
    'define',
    function (
      original: (
        name: string,
        constructor: CustomElementConstructor,
        options?: ElementDefinitionOptions,
      ) => void,
    ) {
      return function (
        name: string,
        constructor: CustomElementConstructor,
        options?: ElementDefinitionOptions,
      ) {
        try {
          customElementCb({
            define: {
              name,
            },
          });
        } catch (e) {
          console.warn(`Custom element callback failed for ${name}`);
        }
        return original.apply(this, [name, constructor, options]);
      };
    },
  );
  return restoreHandler;
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
    styleDeclarationCb,
    canvasMutationCb,
    fontCb,
    selectionCb,
    customElementCb,
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
  o.styleDeclarationCb = (...p: Arguments<styleDeclarationCallback>) => {
    if (hooks.styleDeclaration) {
      hooks.styleDeclaration(...p);
    }
    styleDeclarationCb(...p);
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
  o.selectionCb = (...p: Arguments<selectionCallback>) => {
    if (hooks.selection) {
      hooks.selection(...p);
    }
    selectionCb(...p);
  };
  o.customElementCb = (...c: Arguments<customElementCallback>) => {
    if (hooks.customElement) {
      hooks.customElement(...c);
    }
    customElementCb(...c);
  };
}

export function initObservers(
  o: observerParam,
  hooks: hooksParam = {},
): listenerHandler {
  const currentWindow = o.doc.defaultView; // basically document.window
  if (!currentWindow) {
    return () => {
      //
    };
  }

  mergeHooks(o, hooks);
  let mutationObserver: MutationObserver | undefined;
  if (o.recordDOM) {
    mutationObserver = initMutationObserver(o, o.doc);
  }
  const mousemoveHandler = initMoveObserver(o);
  const mouseInteractionHandler = initMouseInteractionObserver(o);
  const scrollHandler = initScrollObserver(o);
  const viewportResizeHandler = initViewportResizeObserver(o, {
    win: currentWindow,
  });
  const inputHandler = initInputObserver(o);
  const mediaInteractionHandler = initMediaInteractionObserver(o);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let styleSheetObserver = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let adoptedStyleSheetObserver = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let styleDeclarationObserver = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let fontObserver = () => {};
  if (o.recordDOM) {
    styleSheetObserver = initStyleSheetObserver(o, { win: currentWindow });
    adoptedStyleSheetObserver = initAdoptedStyleSheetObserver(o, o.doc);
    styleDeclarationObserver = initStyleDeclarationObserver(o, {
      win: currentWindow,
    });
    if (o.collectFonts) {
      fontObserver = initFontObserver(o);
    }
  }
  const selectionObserver = initSelectionObserver(o);
  const customElementObserver = initCustomElementObserver(o);

  // plugins
  const pluginHandlers: listenerHandler[] = [];
  for (const plugin of o.plugins) {
    pluginHandlers.push(
      plugin.observer(plugin.callback, currentWindow, plugin.options),
    );
  }

  return callbackWrapper(() => {
    mutationBuffers.forEach((b) => b.reset());
    mutationObserver?.disconnect();
    mousemoveHandler();
    mouseInteractionHandler();
    scrollHandler();
    viewportResizeHandler();
    inputHandler();
    mediaInteractionHandler();
    styleSheetObserver();
    adoptedStyleSheetObserver();
    styleDeclarationObserver();
    fontObserver();
    selectionObserver();
    customElementObserver();
    pluginHandlers.forEach((h) => h());
  });
}

type CSSGroupingProp =
  | 'CSSGroupingRule'
  | 'CSSMediaRule'
  | 'CSSSupportsRule'
  | 'CSSConditionRule';

function hasNestedCSSRule(prop: CSSGroupingProp): boolean {
  return typeof window[prop] !== 'undefined';
}

function canMonkeyPatchNestedCSSRule(prop: CSSGroupingProp): boolean {
  return Boolean(
    typeof window[prop] !== 'undefined' &&
      // Note: Generally, this check _shouldn't_ be necessary
      // However, in some scenarios (e.g. jsdom) this can sometimes fail, so we check for it here
      window[prop].prototype &&
      'insertRule' in window[prop].prototype &&
      'deleteRule' in window[prop].prototype,
  );
}
