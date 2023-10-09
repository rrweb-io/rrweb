import type MutationBuffer from './mutation';

/**
 * Keeps a log of nodes that could show up in multiple mutation buffer but shouldn't be handled twice.
 */
export default class ProcessedNodeManager {
  private nodeMap: WeakMap<Node, Set<MutationBuffer>> = new WeakMap();
  // Whether to continue RAF loop.
  private loop = true;

  constructor() {
    this.periodicallyClear();
  }

  private periodicallyClear() {
    requestAnimationFrame(() => {
      this.clear();
      if (this.loop) this.periodicallyClear();
    });
  }

  public inOtherBuffer(node: Node, thisBuffer: MutationBuffer) {
    const buffers = this.nodeMap.get(node);
    if (!buffers) return false;

    return buffers.has(thisBuffer);
  }

  public add(node: Node, buffer: MutationBuffer) {
    this.nodeMap.set(node, (this.nodeMap.get(node) || new Set()).add(buffer));
  }

  private clear() {
    this.nodeMap = new WeakMap();
  }

  public destroy() {
    // Stop the RAF loop.
    this.loop = false;
  }
}
