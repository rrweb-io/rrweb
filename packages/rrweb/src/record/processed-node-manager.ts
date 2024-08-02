import type MutationBuffer from './mutation';
import { getNative } from 'rrweb-snapshot';

/**
 * Keeps a log of nodes that could show up in multiple mutation buffer but shouldn't be handled twice.
 */
export default class ProcessedNodeManager {
  private nodeMap: WeakMap<Node, Set<MutationBuffer>> = new WeakMap();
  private nativeRAF = getNative<typeof requestAnimationFrame>(
    'requestAnimationFrame',
  ).bind(window);

  private active = false;

  public inOtherBuffer(node: Node, thisBuffer: MutationBuffer) {
    const buffers = this.nodeMap.get(node);
    return (
      buffers && Array.from(buffers).some((buffer) => buffer !== thisBuffer)
    );
  }

  public add(node: Node, buffer: MutationBuffer) {
    if (!this.active) {
      this.active = true;
      this.nativeRAF(() => {
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
