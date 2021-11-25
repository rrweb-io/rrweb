import { INode } from 'rrweb-snapshot';
import { Replayer } from '..';
import { canvasMutationData } from '../../types';
export default function canvasMutation(event: Parameters<Replayer['applyIncremental']>[0], d: canvasMutationData, target: INode, imageMap: Replayer['imageMap'], warnCanvasMutationFailed: Replayer['warnCanvasMutationFailed']): void;
