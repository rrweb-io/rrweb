import type MutationBuffer from './mutation';

/**
 * Keeps a log of nodes that could show up in multiple mutation buffer but shouldn't be handled twice.
 */
export default class ProcessedNodeManager {
  private nodeMap: WeakMap<Node, Set<MutationBuffer>> = new WeakMap();
  private active = false;

  public inOtherBuffer(node: Node, thisBuffer: MutationBuffer) {
    const buffers = this.nodeMap.get(node);
    return buffers?.has(thisBuffer)
  }

  public add(node: Node, buffer: MutationBuffer) {
    if (!this.active) {
      this.active = true;
      requestAnimationFrame(() => {
        this.nodeMap = new WeakMap();
        this.active = false;
      });
    }
    this.nodeMap.set(node, (this.nodeMap.get(node) || new Set()).add(buffer));
  }

  public destroy() {
    // cleanup no longer needed
  }
}
