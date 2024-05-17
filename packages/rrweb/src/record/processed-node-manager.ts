import type MutationBuffer from './mutation';
import { getNative } from 'rrweb-snapshot';

/**
 * Keeps a log of nodes that could show up in multiple mutation buffer but shouldn't be handled twice.
 */
export default class ProcessedNodeManager {
  private nodeMap: WeakMap<Node, Set<MutationBuffer>> = new WeakMap();
  // Whether to continue RAF loop.
  private loop = true;
  private nativeRAF;

  constructor() {
    this.nativeRAF = getNative<typeof requestAnimationFrame>(
      'requestAnimationFrame',
    ).bind(window);
    this.periodicallyClear();
  }

  private periodicallyClear() {
    this.nativeRAF(() => {
      this.clear();
      if (this.loop) this.periodicallyClear();
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

  public destroy() {
    // Stop the RAF loop.
    this.loop = false;
  }
}
