import { INode, serializeNodeWithId } from 'rrweb-snapshot';
import {
  mirror,
  throttle,
  on,
  hookSetter,
  getWindowHeight,
  getWindowWidth,
  isBlocked,
  isAncestorRemoved,
} from '../utils';
import {
  mutationCallBack,
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
  textCursor,
  attributeCursor,
} from '../types';
import { deepDelete, isParentRemoved, isParentDropped } from './collection';

/**
 * Mutation observer will merge several mutations into an array and pass
 * it to the callback function, this may make tracing added nodes hard.
 * For example, if we append an element el_1 into body, and then append
 * another element el_2 into el_1, these two mutations may be passed to the
 * callback function together when the two operations were done.
 * Generally we need trace child nodes of newly added node, but in this
 * case if we count el_2 as el_1's child node in the first mutation record,
 * then we will count el_2 again in the secoond mutation record which was
 * duplicated.
 * To avoid of duplicate counting added nodes, we will use a Set to store
 * added nodes and its child nodes during iterate mutation records. Then
 * collect added nodes from the Set which will has no duplicate copy. But
 * this also cause newly added node will not be serialized with id ASAP,
 * which means all the id related calculation should be lazy too.
 * @param cb mutationCallBack
 */
function initMutationObserver(cb: mutationCallBack): MutationObserver {
  const observer = new MutationObserver(mutations => {
    const texts: textCursor[] = [];
    const attributes: attributeCursor[] = [];
    const removes: removedNodeMutation[] = [];
    const adds: addedNodeMutation[] = [];

    const addsSet = new Set<Node>();
    const droppedSet = new Set<Node>();

    const genAdds = (n: Node) => {
      if (isBlocked(n)) {
        return;
      }
      addsSet.add(n);
      droppedSet.delete(n);
      n.childNodes.forEach(childN => genAdds(childN));
    };
    mutations.forEach(mutation => {
      const {
        type,
        target,
        oldValue,
        addedNodes,
        removedNodes,
        attributeName,
      } = mutation;
      switch (type) {
        case 'characterData': {
          const value = target.textContent;
          if (!isBlocked(target) && value !== oldValue) {
            texts.push({
              value,
              node: target,
            });
          }
          break;
        }
        case 'attributes': {
          const value = (target as HTMLElement).getAttribute(attributeName!);
          if (isBlocked(target) || value === oldValue) {
            return;
          }
          let item: attributeCursor | undefined = attributes.find(
            a => a.node === target,
          );
          if (!item) {
            item = {
              node: target,
              attributes: {},
            };
            attributes.push(item);
          }
          // overwrite attribute if the mutations was triggered in same time
          item.attributes[attributeName!] = value;
          break;
        }
        case 'childList': {
          addedNodes.forEach(n => genAdds(n));
          removedNodes.forEach(n => {
            const nodeId = mirror.getId(n as INode);
            const parentId = mirror.getId(target as INode);
            if (isBlocked(n)) {
              return;
            }
            // removed node has not been serialized yet, just remove it from the Set
            if (addsSet.has(n)) {
              deepDelete(addsSet, n);
              droppedSet.add(n);
            } else if (addsSet.has(target) && nodeId === -1) {
              /**
               * If target was newly added and removed child node was
               * not serialized, it means the child node has been removed
               * before callback fired, so we can ignore it.
               * TODO: verify this
               */
            } else if (isAncestorRemoved(target as INode)) {
              /**
               * If parent id was not in the mirror map any more, it
               * means the parent node has already been removed. So
               * the node is also removed which we do not need to track
               * and replay.
               */
            } else {
              removes.push({
                parentId,
                id: nodeId,
              });
            }
            mirror.removeNodeFromMap(n as INode);
          });
          break;
        }
        default:
          break;
      }
    });

    Array.from(addsSet).forEach(n => {
      if (!isParentDropped(droppedSet, n) && !isParentRemoved(removes, n)) {
        adds.push({
          parentId: mirror.getId((n.parentNode as Node) as INode),
          previousId: !n.previousSibling
            ? n.previousSibling
            : mirror.getId(n.previousSibling as INode),
          nextId: !n.nextSibling
            ? n.nextSibling
            : mirror.getId(n.nextSibling as INode),
          node: serializeNodeWithId(n, document, mirror.map, true)!,
        });
      } else {
        droppedSet.add(n);
      }
    });

    const payload = {
      texts: texts
        .map(text => ({
          id: mirror.getId(text.node as INode),
          value: text.value,
        }))
        // text mutation's id was not in the mirror map means the target node has been removed
        .filter(text => mirror.has(text.id)),
      attributes: attributes
        .map(attribute => ({
          id: mirror.getId(attribute.node as INode),
          attributes: attribute.attributes,
        }))
        // attribute mutation's id was not in the mirror map means the target node has been removed
        .filter(attribute => mirror.has(attribute.id)),
      removes,
      adds,
    };
    // payload may be empty if the mutations happened in some blocked elements
    if (
      !payload.texts.length &&
      !payload.attributes.length &&
      !payload.removes.length &&
      !payload.adds.length
    ) {
      return;
    }
    cb(payload);
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
      const { clientX, clientY, target } = evt;
      if (!timeBaseline) {
        timeBaseline = Date.now();
      }
      positions.push({
        x: clientX,
        y: clientY,
        id: mirror.getId(target as INode),
        timeOffset: Date.now() - timeBaseline,
      });
      wrappedCb();
    },
    50,
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
      if (isBlocked(event.target as Node)) {
        return;
      }
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
    if (!evt.target || isBlocked(evt.target as Node)) {
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
const HOOK_PROPERTIES: Array<[HTMLElement, string]> = [
  [HTMLInputElement.prototype, 'value'],
  [HTMLInputElement.prototype, 'checked'],
  [HTMLSelectElement.prototype, 'value'],
  [HTMLTextAreaElement.prototype, 'value'],
];
const IGNORE_CLASS = 'rr-ignore';
const lastInputValueMap: WeakMap<EventTarget, inputValue> = new WeakMap();
function initInputObserver(cb: inputCallback): listenerHandler {
  function eventHandler(event: Event) {
    const { target } = event;
    if (
      !target ||
      !(target as Element).tagName ||
      INPUT_TAGS.indexOf((target as Element).tagName) < 0 ||
      isBlocked(target as Node)
    ) {
      return;
    }
    const type: string | undefined = (target as HTMLInputElement).type;
    if (
      type === 'password' ||
      (target as HTMLElement).classList.contains(IGNORE_CLASS)
    ) {
      return;
    }
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

export default function initObservers(o: observerParam): listenerHandler {
  const mutationObserver = initMutationObserver(o.mutationCb);
  const mousemoveHandler = initMousemoveObserver(o.mousemoveCb);
  const mouseInteractionHandler = initMouseInteractionObserver(
    o.mouseInteractionCb,
  );
  const scrollHandler = initScrollObserver(o.scrollCb);
  const viewportResizeHandler = initViewportResizeObserver(o.viewportResizeCb);
  const inputHandler = initInputObserver(o.inputCb);
  return () => {
    mutationObserver.disconnect();
    mousemoveHandler();
    mouseInteractionHandler();
    scrollHandler();
    viewportResizeHandler();
    inputHandler();
  };
}
