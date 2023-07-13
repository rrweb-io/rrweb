import { serializedNodeWithId } from 'rrweb-snapshot';
import type {
  addedNodeMutation,
  eventWithTime,
  mousePosition,
} from '@rrweb/types';
import { IncrementalSource } from 'rrweb';
import { EventType } from 'rrweb';
import { SyncReplayer } from 'rrweb';

export function pruneBranches(
  events: eventWithTime[],
  { keep }: { keep: number[] },
): eventWithTime[] {
  const result: eventWithTime[] = [];
  const replayer = new SyncReplayer(events);
  const treeSet = new Set<number>(keep);
  replayer.reversePlay(({ event }) => {
    if (event.type === EventType.FullSnapshot) {
      const { node } = event.data;
      const tree = getTreeForId(treeSet, node, keep);
      tree.forEach((id) => treeSet.add(id));
    } else if (event.type === EventType.IncrementalSnapshot) {
      if (event.data.source === IncrementalSource.Mutation) {
        const { adds, removes } = event.data;
        removes.forEach((remove) => {
          if (treeSet.has(remove.id)) treeSet.add(remove.parentId);
        });
        adds.forEach((add) => {
          const tree = getTreeForId(treeSet, add.node, keep);
          if (tree.size) {
            treeSet.add(add.parentId);
            tree.forEach((id) => treeSet.add(id));
          } else if (
            'childNodes' in add.node &&
            add.node.childNodes.length > 0
          ) {
            const tree = getTreeForId(treeSet, add.node, keep);
            if (tree.size) treeSet.add(add.parentId);
            tree.forEach((id) => treeSet.add(id));
          }
        });
      }
    }
    return true;
  });

  replayer.play(({ event }) => {
    if (
      [EventType.Meta, EventType.Load, EventType.DomContentLoaded].includes(
        event.type,
      )
    ) {
      result.push(event);
    } else if (event.type === EventType.FullSnapshot) {
      const { node } = event.data;
      const prunedNode = reconstructTreeWithIds(node, treeSet);
      if (prunedNode)
        result.push({
          ...event,
          data: {
            ...event.data,
            node: prunedNode,
          },
        } as eventWithTime);
    } else if (event.type === EventType.IncrementalSnapshot) {
      if ('positions' in event.data) {
        const { positions } = event.data;
        const prunedPositions: mousePosition[] = positions.filter((p) =>
          treeSet.has(p.id),
        );
        if (prunedPositions.length > 0)
          result.push({
            ...event,
            data: {
              ...event.data,
              positions: prunedPositions,
            },
          } as eventWithTime);
      } else if ('id' in event.data) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (treeSet.has(event.data.id!)) result.push(event);
      } else if (event.data.source === IncrementalSource.Mutation) {
        const { removes, adds, texts, attributes } = event.data;
        const prunedRemoves = removes.filter((remove) =>
          treeSet.has(remove.id),
        );
        const prunedAdds = adds
          .map((add) =>
            treeSet.has(add.parentId) && keep.includes(add.parentId)
              ? add
              : {
                  ...add,
                  node: reconstructTreeWithIds(add.node, treeSet),
                },
          )
          .filter((add) => Boolean(add.node)) as addedNodeMutation[];
        const prunedTexts = texts.filter((text) => treeSet.has(text.id));
        const prunedAttributes = attributes.filter((attr) =>
          treeSet.has(attr.id),
        );
        if (
          prunedRemoves.length > 0 ||
          prunedAdds.length > 0 ||
          prunedTexts.length > 0 ||
          prunedAttributes.length > 0
        )
          result.push({
            ...event,
            data: {
              ...event.data,
              removes: prunedRemoves,
              adds: prunedAdds,
              texts: prunedTexts,
              attributes: prunedAttributes,
            },
          } as eventWithTime);
      }
    }
    return true;
  });
  return result;
}

export function getTreeForId(
  treeSet: Set<number>,
  node: serializedNodeWithId,
  keepIds: number[],
): Set<number> {
  const results = new Set<number>();
  if (treeSet.has(node.id)) {
    getIdsInNode(node, keepIds).forEach((id) => results.add(id));
  } else if ('childNodes' in node) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      const childTree = getTreeForId(treeSet, child, keepIds);
      if (childTree.size > 0) {
        results.add(node.id);
        childTree.forEach((id) => results.add(id));
      }
    }
  }
  return results;
}

export function getIdsInNode(
  node: serializedNodeWithId,
  keepIds: number[],
): Array<number> {
  const results: number[] = [];
  results.push(node.id);
  if (keepIds.includes(node.id) && 'childNodes' in node) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      results.push(...getIdsInNode(child, keepIds));
    }
  }
  return results;
}

export function reconstructTreeWithIds(
  node: serializedNodeWithId,
  ids: Set<number>,
): serializedNodeWithId | undefined {
  if (ids.has(node.id)) {
    if ('childNodes' in node) {
      node.childNodes = node.childNodes
        .map((child) => reconstructTreeWithIds(child, ids))
        .filter(Boolean) as serializedNodeWithId[];
    }
    return node;
  }
  return undefined;
}
