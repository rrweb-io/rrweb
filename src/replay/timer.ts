const FRAME_MS = 16;

function later(cb: () => void, delayMs: number, speed = 1) {
  const now = performance.now();

  function check(step: number) {
    if (step - now > delayMs / speed - FRAME_MS) {
      cb();
    } else {
      requestAnimationFrame(check);
    }
  }

  requestAnimationFrame(check);
}

export default later;
