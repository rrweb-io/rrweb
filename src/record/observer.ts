import { INode } from 'rrweb-snapshot';
import {
  mirror,
  throttle,
  on,
  hookSetter,
  getWindowHeight,
  getWindowWidth,
  isBlocked,
  isTouchEvent,
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
} from '../types';
import MutationBuffer from './mutation';

function initMutationObserver(
  cb: mutationCallBack,
  blockClass: blockClass,
  inlineStylesheet: boolean,
  maskAllInputs: boolean,
): MutationObserver {
  // see mutation.ts for details
  const mutationBuffer = new MutationBuffer(
    cb,
    blockClass,
    inlineStylesheet,
    maskAllInputs,
  );
  const observer = new MutationObserver(mutationBuffer.processMutations);
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
  mousemoveWait: number,
): listenerHandler {
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
    mousemoveWait,
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
): listenerHandler {
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
    .filter((key) => Number.isNaN(Number(key)) && !key.endsWith('_Departed'))
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
  }, 100);
  return on('scroll', updatePosition);
}

function initViewportResizeObserver(
  cb: viewportResizeCallback,
): listenerHandler {
  const updateDimension = throttle(() => {
    const height = getWindowHeight();
    const width = getWindowWidth();
    cb({
      width: Number(width),
      height: Number(height),
    });
  }, 200);
  return on('resize', updateDimension, window);
}

const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
const MASK_TYPES = [
  'color',
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'range',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
];
const lastInputValueMap: WeakMap<EventTarget, inputValue> = new WeakMap();
function initInputObserver(
  cb: inputCallback,
  blockClass: blockClass,
  ignoreClass: string,
  maskAllInputs: boolean,
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
    const hasTextInput =
      MASK_TYPES.includes(type) || (target as Element).tagName === 'TEXTAREA';
    if (type === 'radio' || type === 'checkbox') {
      isChecked = (target as HTMLInputElement).checked;
    } else if (hasTextInput && maskAllInputs) {
      text = '*'.repeat(text.length);
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
  const handlers: Array<listenerHandler | hookResetter> = [
    'input',
    'change',
  ].map((eventName) => on(eventName, eventHandler));
  const propertyDescriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  );
  const hookProperties: Array<[HTMLElement, string]> = [
    [HTMLInputElement.prototype, 'value'],
    [HTMLInputElement.prototype, 'checked'],
    [HTMLSelectElement.prototype, 'value'],
    [HTMLTextAreaElement.prototype, 'value'],
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
}

export default function initObservers(
  o: observerParam,
  hooks: hooksParam = {},
): listenerHandler {
  mergeHooks(o, hooks);
  const mutationObserver = initMutationObserver(
    o.mutationCb,
    o.blockClass,
    o.inlineStylesheet,
    o.maskAllInputs,
  );
  const mousemoveHandler = initMoveObserver(o.mousemoveCb, o.mousemoveWait);
  const mouseInteractionHandler = initMouseInteractionObserver(
    o.mouseInteractionCb,
    o.blockClass,
  );
  const scrollHandler = initScrollObserver(o.scrollCb, o.blockClass);
  const viewportResizeHandler = initViewportResizeObserver(o.viewportResizeCb);
  const inputHandler = initInputObserver(
    o.inputCb,
    o.blockClass,
    o.ignoreClass,
    o.maskAllInputs,
  );
  const mediaInteractionHandler = initMediaInteractionObserver(
    o.mediaInteractionCb,
    o.blockClass,
  );
  const styleSheetObserver = initStyleSheetObserver(o.styleSheetRuleCb);

  return () => {
    mutationObserver.disconnect();
    mousemoveHandler();
    mouseInteractionHandler();
    scrollHandler();
    viewportResizeHandler();
    inputHandler();
    mediaInteractionHandler();
    styleSheetObserver();
  };
}
