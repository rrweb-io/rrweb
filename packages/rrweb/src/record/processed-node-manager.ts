export default class ProcessedNodeManager {
  private nodeSet: WeakSet<Node> = new WeakSet();

  constructor() {
    this.periodicallyClear();
  }

  private periodicallyClear() {
    requestAnimationFrame(() => {
      this.clear();
      this.periodicallyClear();
    });
  }

  public has(node: Node) {
    return this.nodeSet.has(node);
  }

  public add(node: Node) {
    this.nodeSet.add(node);
  }

  private clear() {
    this.nodeSet = new WeakSet();
  }
}
