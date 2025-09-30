import type MutationBuffer from './mutation';
export default class ProcessedNodeManager {
    private nodeMap;
    private active;
    inOtherBuffer(node: Node, thisBuffer: MutationBuffer): boolean | undefined;
    add(node: Node, buffer: MutationBuffer): void;
    destroy(): void;
}
