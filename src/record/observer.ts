import { INode, serializeNodeWithId } from 'rrweb-snapshot';
import { mirror, throttle, on } from '../utils';
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
          removedNodes.forEach(n => {
            removes.push({
              parentId: id,
              id: mirror.getId(n as INode),
            });
            mirror.removeNodeFromMap(n as INode);
          });
          addedNodes.forEach(n => {
            adds.push({
              parentId: id,
              previousId: !previousSibling
                ? previousSibling
                : mirror.getId(previousSibling as INode),
              nextId: !nextSibling
                ? nextSibling
                : mirror.getId(nextSibling as INode),
              id: mirror.getId(n as INode),
            });
            serializeNodeWithId(n as INode, document, mirror.map);
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
        x: document.documentElement.scrollTop,
        y: document.documentElement.scrollLeft,
      });
    } else {
      cb({
        id,
        x: (evt.target as HTMLElement).scrollTop,
        y: (evt.target as HTMLElement).scrollLeft,
      });
    }
  }, 100);
  return on('scroll', updatePosition);
}

function initViewportResizeObserver(
  cb: viewportResizeCallback,
): listenerHandler {
  const updateDimension = throttle(() => {
    const height =
      window.innerHeight ||
      (document.documentElement && document.documentElement.clientHeight) ||
      (document.body && document.body.clientHeight);
    const width =
      window.innerWidth ||
      (document.documentElement && document.documentElement.clientWidth) ||
      (document.body && document.body.clientWidth);
    cb({
      width: Number(width),
      height: Number(height),
    });
  }, 200);
  return on('resize', updateDimension, window);
}

export default function initObservers(o: observerParam) {
  const mutationObserver = initMutationObserver(o.mutationCb);
  const mousemoveHandler = initMousemoveObserver(o.mousemoveCb);
  const mouseInteractionHandler = initMouseInteractionObserver(
    o.mouseInteractionCb,
  );
  const scrollHandler = initScrollObserver(o.scrollCb);
  const viewportResizeHandler = initViewportResizeObserver(o.viewportResizeCb);
  return {
    mutationObserver,
    mousemoveHandler,
    mouseInteractionHandler,
    scrollHandler,
    viewportResizeHandler,
  };
}
