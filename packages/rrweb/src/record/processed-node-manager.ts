import type MutationBuffer from './mutation';

/**
 * Keeps a log of nodes that could show up in multiple mutation buffer but shouldn't be handled twice.
 */
export default class ProcessedNodeManager {
  private nodeMap: WeakMap<Node, Set<MutationBuffer>> = new WeakMap();

  constructor() {
    this.periodicallyClear();
  }

  private periodicallyClear() {
    requestAnimationFrame(() => {
      this.clear();
      this.periodicallyClear();
    });
  }

  public inOtherBuffer(node: Node, thisBuffer: MutationBuffer) {
    const buffers = this.nodeMap.get(node);
    return (
      buffers && Array.from(buffers).some((buffer) => buffer !== thisBuffer)
    );
  }

  public add(node: Node, buffer: MutationBuffer) {
    this.nodeMap.set(node, (this.nodeMap.get(node) || new Set()).add(buffer));
  }

  private clear() {
    this.nodeMap = new WeakMap();
  }
}
