import type { Replayer } from '../';
import {
  CanvasContext,
  type canvasMutationCommand,
} from '@newrelic/rrweb-types';
export default function webglMutation({
  mutation,
  target,
  type,
  imageMap,
  errorHandler,
}: {
  mutation: canvasMutationCommand;
  target: HTMLCanvasElement;
  type: CanvasContext;
  imageMap: Replayer['imageMap'];
  errorHandler: Replayer['warnCanvasMutationFailed'];
}): Promise<void>;
