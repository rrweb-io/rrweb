import { INode, serializeNodeWithId } from 'rrweb-snapshot';
import {
  mirror,
  throttle,
  on,
  hookSetter,
  getWindowHeight,
  getWindowWidth,
} from '../utils';
import {
  mutationCallBack,
  textMutation,
  attributeMutation,
  removedNodeMutation,
  addedNodeMutation,
  observerParam,
  mousemoveCallBack,
  mousePosition,
  mouseInteractionCallBack,
  MouseInteractions,
  listenerHandler,
  scrollCallback,
  viewportResizeCallback,
  inputValue,
  inputCallback,
  hookResetter,
} from '../types';

function initMutationObserver(cb: mutationCallBack): MutationObserver {
  const observer = new MutationObserver(mutations => {
    const texts: textMutation[] = [];
    const attributes: attributeMutation[] = [];
    const removes: removedNodeMutation[] = [];
    const adds: addedNodeMutation[] = [];
    mutations.forEach(mutation => {
      const {
        type,
        target,
        oldValue,
        addedNodes,
        removedNodes,
        attributeName,
        nextSibling,
        previousSibling,
      } = mutation;
      const id = mirror.getId(target as INode);
      switch (type) {
        case 'characterData': {
          const value = target.textContent;
          if (value !== oldValue) {
            texts.push({
              id,
              value,
            });
          }
          break;
        }
        case 'attributes': {
          const value = (target as HTMLElement).getAttribute(attributeName!);
          if (value === oldValue) {
            return;
          }
          let item: attributeMutation | undefined = attributes.find(
            a => a.id === id,
          );
          if (!item) {
            item = {
              id,
              attributes: {},
            };
            attributes.push(item);
          }
          // overwrite attribute if the mutations was triggered in same time
          item.attributes[attributeName!] = value;
        }
        case 'childList': {
          addedNodes.forEach(n => {
            adds.push({
              parentId: id,
              previousId: !previousSibling
                ? previousSibling
                : mirror.getId(previousSibling as INode),
              nextId: !nextSibling
                ? nextSibling
                : mirror.getId(nextSibling as INode),
              node: serializeNodeWithId(n, document, mirror.map)!,
            });
          });
          removedNodes.forEach(n => {
            removes.push({
              parentId: id,
              id: mirror.getId(n as INode),
            });
            mirror.removeNodeFromMap(n as INode);
          });
          break;
        }
        default:
          break;
      }
    });
    cb({
      texts,
      attributes,
      removes,
      adds,
    });
  });
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

function initMousemoveObserver(cb: mousemoveCallBack): listenerHandler {
  let positions: mousePosition[] = [];
  let timeBaseline: number | null;
  const wrappedCb = throttle(() => {
    const totalOffset = Date.now() - timeBaseline!;
    cb(
      positions.map(p => {
        p.timeOffset -= totalOffset;
        return p;
      }),
    );
    positions = [];
    timeBaseline = null;
  }, 500);
  const updatePosition = throttle<MouseEvent>(
    evt => {
      const { clientX, clientY } = evt;
      if (!timeBaseline) {
        timeBaseline = Date.now();
      }
      positions.push({
        x: clientX,
        y: clientY,
        timeOffset: Date.now() - timeBaseline,
      });
      wrappedCb();
    },
    20,
    {
      trailing: false,
    },
  );
  return on('mousemove', updatePosition);
}

function initMouseInteractionObserver(
  cb: mouseInteractionCallBack,
): listenerHandler {
  const handlers: listenerHandler[] = [];
  const getHandler = (eventKey: keyof typeof MouseInteractions) => {
    return (event: MouseEvent) => {
      const id = mirror.getId(event.target as INode);
      const { clientX, clientY } = event;
      cb({
        type: MouseInteractions[eventKey],
        id,
        x: clientX,
        y: clientY,
      });
    };
  };
  Object.keys(MouseInteractions)
    .filter(key => Number.isNaN(Number(key)))
    .forEach((eventKey: keyof typeof MouseInteractions) => {
      const eventName = eventKey.toLowerCase();
      const handler = getHandler(eventKey);
      handlers.push(on(eventName, handler));
    });
  return () => {
    handlers.forEach(h => h());
  };
}

function initScrollObserver(cb: scrollCallback): listenerHandler {
  const updatePosition = throttle<UIEvent>(evt => {
    if (!evt.target) {
      return;
    }
    const id = mirror.getId(evt.target as INode);
    if (evt.target === document) {
      cb({
        id,
        x: document.documentElement.scrollLeft,
        y: document.documentElement.scrollTop,
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
const HOOK_PROPERTIES: Array<[HTMLElement, string]> = [
  [HTMLInputElement.prototype, 'value'],
  [HTMLInputElement.prototype, 'checked'],
  [HTMLSelectElement.prototype, 'value'],
  [HTMLTextAreaElement.prototype, 'value'],
];
const lastInputValueMap: WeakMap<EventTarget, inputValue> = new WeakMap();
function initInputObserver(cb: inputCallback): listenerHandler {
  function eventHandler(event: Event) {
    const { target } = event;
    if (
      !target ||
      !(target as Element).tagName ||
      INPUT_TAGS.indexOf((target as Element).tagName) < 0
    ) {
      return;
    }
    const type: string | undefined = (target as HTMLInputElement).type;
    const text = (target as HTMLInputElement).value;
    let isChecked = false;
    if (type === 'radio' || type === 'checkbox') {
      isChecked = (target as HTMLInputElement).checked;
    }
    cbWithDedup(target, { text, isChecked });
    // if a radio was checked
    // the other radios with the same name attribute will be unchecked.
    const name: string | undefined = (target as HTMLInputElement).name;
    if (type === 'radio' && name && isChecked) {
      document
        .querySelectorAll(`input[type="radio"][name="${name}"]`)
        .forEach(el => {
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
  ].map(eventName => on(eventName, eventHandler));
  const propertyDescriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  );
  if (propertyDescriptor && propertyDescriptor.set) {
    handlers.push(
      ...HOOK_PROPERTIES.map(p =>
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
    handlers.forEach(h => h());
  };
}

export default function initObservers(o: observerParam) {
  const mutationObserver = initMutationObserver(o.mutationCb);
  const mousemoveHandler = initMousemoveObserver(o.mousemoveCb);
  const mouseInteractionHandler = initMouseInteractionObserver(
    o.mouseInteractionCb,
  );
  const scrollHandler = initScrollObserver(o.scrollCb);
  const viewportResizeHandler = initViewportResizeObserver(o.viewportResizeCb);
  const inputHandler = initInputObserver(o.inputCb);
  return {
    mutationObserver,
    mousemoveHandler,
    mouseInteractionHandler,
    scrollHandler,
    viewportResizeHandler,
    inputHandler,
  };
}
