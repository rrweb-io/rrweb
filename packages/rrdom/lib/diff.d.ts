import { Mirror as NodeMirror } from 'rrweb-snapshot';
import type { canvasMutationData, canvasEventWithTime, inputData, scrollData, styleDeclarationData, styleSheetRuleData } from '@rrweb/types';
import type { IRRNode } from './document';
import type { Mirror } from '.';
export declare type ReplayerHandler = {
    mirror: NodeMirror;
    applyCanvas: (canvasEvent: canvasEventWithTime, canvasMutationData: canvasMutationData, target: HTMLCanvasElement) => void;
    applyInput: (data: inputData) => void;
    applyScroll: (data: scrollData, isSync: boolean) => void;
    applyStyleSheetMutation: (data: styleDeclarationData | styleSheetRuleData, styleSheet: CSSStyleSheet) => void;
    afterAppend?(node: Node, id: number): void;
};
export declare function diff(oldTree: Node, newTree: IRRNode, replayer: ReplayerHandler, rrnodeMirror?: Mirror): void;
export declare function createOrGetNode(rrNode: IRRNode, domMirror: NodeMirror, rrnodeMirror: Mirror): Node;
export declare function sameNodeType(node1: Node, node2: IRRNode): boolean;
export declare function nodeMatching(node1: Node, node2: IRRNode, domMirror: NodeMirror, rrdomMirror: Mirror): boolean;
