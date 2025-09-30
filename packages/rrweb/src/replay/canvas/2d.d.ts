import type { Replayer } from '../';
import type { canvasMutationCommand } from '@newrelic/rrweb-types';
export default function canvasMutation({
  event,
  mutations,
  target,
  imageMap,
  errorHandler,
}: {
  event: Parameters<Replayer['applyIncremental']>[0];
  mutations: canvasMutationCommand[];
  target: HTMLCanvasElement;
  imageMap: Replayer['imageMap'];
  errorHandler: Replayer['warnCanvasMutationFailed'];
}): Promise<void>;
