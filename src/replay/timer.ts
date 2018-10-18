import { playerConfig } from '../types';

const FRAME_MS = 16;
let _id = 1;
const timerMap: Map<number, boolean> = new Map();

export function later(
  cb: () => void,
  delayMs: number,
  config: playerConfig,
): number {
  const now = performance.now();
  let lastStep = now;
  const id = _id++;
  timerMap.set(id, true);

  function check(step: number) {
    if (!timerMap.has(id)) {
      return;
    }
    const stepDiff = step - lastStep;
    lastStep = step;
    delayMs -= config.speed * stepDiff;
    if (delayMs < FRAME_MS) {
      cb();
      clear(id);
    } else {
      requestAnimationFrame(check);
    }
  }

  requestAnimationFrame(check);
  return id;
}

export function clear(id: number) {
  timerMap.delete(id);
}
