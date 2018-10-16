const FRAME_MS = 16;
const timerMap: Map<number, boolean> = new Map();

export function later(cb: () => void, delayMs: number, speed = 1): number {
  const now = performance.now();
  const id = timerMap.size + 1;
  timerMap.set(id, true);

  function check(step: number) {
    if (!timerMap.has(id)) {
      return;
    }
    if (step - now > delayMs / speed - FRAME_MS) {
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
