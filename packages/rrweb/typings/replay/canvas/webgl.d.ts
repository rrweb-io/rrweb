import { INode } from 'rrweb-snapshot';
import { Replayer } from '../../../typings/entries/all';
import { canvasMutationData } from '../../types';
export default function webglMutation(d: canvasMutationData, target: INode, warnCanvasMutationFailed: Replayer['warnCanvasMutationFailed']): void;
