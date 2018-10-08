import { INode } from 'rrweb-snapshot';
import { mirror, throttle } from '../utils';
import {
  mutationCallBack,
  textMutation,
  attributeMutation,
  removedNodeMutation,
  addedNodeMutation,
  observerParam,
  mousemoveCallBack,
  mousePosition,
  handlerMap,
  mouseInteractionCallBack,
  MouseInteractions,
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

function initMousemoveObserver(cb: mousemoveCallBack): () => void {
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
  document.addEventListener('mousemove', updatePosition);
  return () => {
    document.removeEventListener('mousemove', updatePosition);
  };
}

function initMouseInteractionObserver(
  cb: mouseInteractionCallBack,
): () => void {
  const handlers: handlerMap = {};
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
      handlers[eventName] = handler;
      document.addEventListener(eventName, handler);
    });
  return () => {
    Object.keys(handlers).forEach(eventName => {
      document.removeEventListener(eventName, handlers[eventName]);
    });
  };
}

export default function initObservers(o: observerParam) {
  const mutationObserver = initMutationObserver(o.mutationCb);
  const mousemoveHandler = initMousemoveObserver(o.mousemoveCb);
  const mouseInteractionHandler = initMouseInteractionObserver(
    o.mouseInteractionCb,
  );
  return {
    mutationObserver,
    mousemoveHandler,
    mouseInteractionHandler,
  };
}
