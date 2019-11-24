import { INode, serializeNodeWithId, transformAttribute } from "rrweb-snapshot";
import {
  mirror,
  throttle,
  on,
  hookSetter,
  getWindowHeight,
  getWindowWidth,
  isBlocked,
  isAncestorRemoved,
  isTouchEvent,
} from "../utils";
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
  blockClass,
  IncrementalSource,
  hooksParam,
  Arguments,
} from "../types";
import { deepDelete, isParentRemoved, isAncestorInSet } from "./collection";

const moveKey = (id: number, parentId: number) => `${id}@${parentId}`;
function isINode(n: Node | INode): n is INode {
  return "__sn" in n;
}

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
function initMutationObserver(
  cb: mutationCallBack,
  blockClass: blockClass,
  inlineStylesheet: boolean,
  maskAllInputs: boolean,
): MutationObserver {
  const observer = new MutationObserver(mutations => {
    const texts: textCursor[] = [];
    const attributes: attributeCursor[] = [];
    let removes: removedNodeMutation[] = [];
    const adds: addedNodeMutation[] = [];

    const addedSet = new Set<Node>();
    const movedSet = new Set<Node>();
    const droppedSet = new Set<Node>();

    const movedMap: Record<string, true> = {};

    const genAdds = (n: Node | INode, target?: Node | INode) => {
      if (isBlocked(n, blockClass)) {
        return;
      }
      if (isINode(n)) {
        movedSet.add(n);
        let targetId: number | null = null;
        if (target && isINode(target)) {
          targetId = target.__sn.id;
        }
        if (targetId) {
          movedMap[moveKey(n.__sn.id, targetId)] = true;
        }
      } else {
        addedSet.add(n);
        droppedSet.delete(n);
      }
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
        case "characterData": {
          const value = target.textContent;
          if (!isBlocked(target, blockClass) && value !== oldValue) {
            texts.push({
              value,
              node: target,
            });
          }
          break;
        }
        case "attributes": {
          const value = (target as HTMLElement).getAttribute(attributeName!);
          if (isBlocked(target, blockClass) || value === oldValue) {
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
          item.attributes[attributeName!] = transformAttribute(
            document,
            attributeName!,
            value!,
          );
          break;
        }
        case "childList": {
          addedNodes.forEach(n => genAdds(n, target));
          removedNodes.forEach(n => {
            const nodeId = mirror.getId(n as INode);
            const parentId = mirror.getId(target as INode);
            if (isBlocked(n, blockClass)) {
              return;
            }
            // removed node has not been serialized yet, just remove it from the Set
            if (addedSet.has(n)) {
              deepDelete(addedSet, n);
              droppedSet.add(n);
            } else if (addedSet.has(target) && nodeId === -1) {
              /**
               * If target was newly added and removed child node was
               * not serialized, it means the child node has been removed
               * before callback fired, so we can ignore it because
               * newly added node will be serialized without child nodes.
               * TODO: verify this
               */
            } else if (isAncestorRemoved(target as INode)) {
              /**
               * If parent id was not in the mirror map any more, it
               * means the parent node has already been removed. So
               * the node is also removed which we do not need to track
               * and replay.
               */
            } else if (movedSet.has(n) && movedMap[moveKey(nodeId, parentId)]) {
              deepDelete(movedSet, n);
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

    /**
     * Sometimes child node may be pushed before its newly added
     * parent, so we init a queue to store these nodes.
     */
    const addQueue: Node[] = [];
    const pushAdd = (n: Node) => {
      const parentId = mirror.getId((n.parentNode as Node) as INode);
      if (parentId === -1) {
        return addQueue.push(n);
      }
      adds.push({
        parentId,
        previousId: !n.previousSibling
          ? n.previousSibling
          : mirror.getId(n.previousSibling as INode),
        nextId: !n.nextSibling
          ? n.nextSibling
          : mirror.getId((n.nextSibling as unknown) as INode),
        node: serializeNodeWithId(
          n,
          document,
          mirror.map,
          blockClass,
          true,
          inlineStylesheet,
          maskAllInputs,
        )!,
      });
    };

    for (const n of movedSet) {
      pushAdd(n);
    }

    for (const n of addedSet) {
      if (!isAncestorInSet(droppedSet, n) && !isParentRemoved(removes, n)) {
        pushAdd(n);
      } else if (isAncestorInSet(movedSet, n)) {
        pushAdd(n);
      } else {
        droppedSet.add(n);
      }
    }

    while (addQueue.length) {
      if (
        addQueue.every(
          n => mirror.getId((n.parentNode as Node) as INode) === -1,
        )
      ) {
        /**
         * If all nodes in queue could not find a serialized parent,
         * it may be a bug or corner case. We need to escape the
         * dead while loop at once.
         */
        break;
      }
      pushAdd(addQueue.shift()!);
    }

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

function initMoveObserver(
  cb: mousemoveCallBack,
  mousemoveWait: number,
): listenerHandler {
  let positions: mousePosition[] = [];
  let timeBaseline: number | null;
  const wrappedCb = throttle((isTouch: boolean) => {
    const totalOffset = Date.now() - timeBaseline!;
    cb(
      positions.map(p => {
        p.timeOffset -= totalOffset;
        return p;
      }),
      isTouch ? IncrementalSource.TouchMove : IncrementalSource.MouseMove,
    );
    positions = [];
    timeBaseline = null;
  }, 500);
  const updatePosition = throttle<MouseEvent | TouchEvent>(
    evt => {
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
    on("mousemove", updatePosition),
    on("touchmove", updatePosition),
  ];
  return () => {
    handlers.forEach(h => h());
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
    .filter(key => Number.isNaN(Number(key)) && !key.endsWith("_Departed"))
    .forEach((eventKey: keyof typeof MouseInteractions) => {
      const eventName = eventKey.toLowerCase();
      const handler = getHandler(eventKey);
      handlers.push(on(eventName, handler));
    });
  return () => {
    handlers.forEach(h => h());
  };
}

function initScrollObserver(
  cb: scrollCallback,
  blockClass: blockClass,
): listenerHandler {
  const updatePosition = throttle<UIEvent>(evt => {
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
  return on("scroll", updatePosition);
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
  return on("resize", updateDimension, window);
}

const INPUT_TAGS = ["INPUT", "TEXTAREA", "SELECT"];
const MASK_TYPES = [
  "color",
  "date",
  "datetime-local",
  "email",
  "month",
  "number",
  "range",
  "search",
  "tel",
  "text",
  "time",
  "url",
  "week",
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
      type === "password" ||
      (target as HTMLElement).classList.contains(ignoreClass)
    ) {
      return;
    }
    let text = (target as HTMLInputElement).value;
    let isChecked = false;
    const hasTextInput =
      MASK_TYPES.includes(type) || (target as Element).tagName === "TEXTAREA";
    if (type === "radio" || type === "checkbox") {
      isChecked = (target as HTMLInputElement).checked;
    } else if (hasTextInput && maskAllInputs) {
      text = "*".repeat(text.length);
    }
    cbWithDedup(target, { text, isChecked });
    // if a radio was checked
    // the other radios with the same name attribute will be unchecked.
    const name: string | undefined = (target as HTMLInputElement).name;
    if (type === "radio" && name && isChecked) {
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
    "input",
    "change",
  ].map(eventName => on(eventName, eventHandler));
  const propertyDescriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  const hookProperties: Array<[HTMLElement, string]> = [
    [HTMLInputElement.prototype, "value"],
    [HTMLInputElement.prototype, "checked"],
    [HTMLSelectElement.prototype, "value"],
    [HTMLTextAreaElement.prototype, "value"],
  ];
  if (propertyDescriptor && propertyDescriptor.set) {
    handlers.push(
      ...hookProperties.map(p =>
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

function mergeHooks(o: observerParam, hooks: hooksParam) {
  const {
    mutationCb,
    mousemoveCb,
    mouseInteractionCb,
    scrollCb,
    viewportResizeCb,
    inputCb,
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
  return () => {
    mutationObserver.disconnect();
    mousemoveHandler();
    mouseInteractionHandler();
    scrollHandler();
    viewportResizeHandler();
    inputHandler();
  };
}
