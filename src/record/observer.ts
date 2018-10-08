import { INode } from 'rrweb-snapshot';
import { mirror } from '../utils';
import {
  mutationCallBack,
  textMutation,
  attributeMutation,
  removedNodeMutation,
  addedNodeMutation,
  observerParam,
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

export default function initObservers(o: observerParam) {
  const mutationObserver = initMutationObserver(o.mutationCb);
  return {
    mutationObserver,
  };
}
