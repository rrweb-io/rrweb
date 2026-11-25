import type { Replayer } from '@rrweb/replay';
type Point = { x: number; y: number };

export function getFrameScale(frame: HTMLElement): Point {
  // Pointer and bounding-rect coordinates include any embedding page scale.
  const { width, height } = frame.getBoundingClientRect();
  return {
    x: width && frame.clientWidth ? width / frame.clientWidth : 1,
    y: height && frame.clientHeight ? height / frame.clientHeight : 1,
  };
}

export function followReplayCursor(
  frame: HTMLElement,
  replay: HTMLElement,
  replayer: Replayer,
  getPan: () => Point,
  setPan: (p: Point) => void,
  clampPan: (p: Point) => Point,
) {
  const cursor = replay.querySelector<HTMLElement>('.replayer-mouse');
  if (!cursor) return;
  let target = getPan();
  let velocity: Point = { x: 0, y: 0 };
  let animation: number | null = null;
  let lastTime = 0;
  // A live replay advances without a 'start' event.
  const live = () => replayer.service.state.matches('live');
  let playing = replayer.isPlaying() && !replayer.isStalled();
  let pausedAt = replayer.getCurrentTime();
  // Started during a stall, the position is only a request, so the first
  // start after it frames the cursor however close it lands.
  let pendingSeek = replayer.isStalled();
  // The playback clock. A stall that waits at a requested position (a seek)
  // reports that position from getCurrentTime() instead of the clock.
  const clock = () => {
    const { baselineTime, events } = replayer.service.state.context;
    return baselineTime - events[0].timestamp + replayer.timer.timeOffset;
  };
  const reducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  )?.matches;

  function paint(point: Point) {
    const next = clampPan(point);
    if (next.x !== point.x) velocity.x = 0;
    if (next.y !== point.y) velocity.y = 0;
    setPan(next);
  }

  function animate(time: number) {
    animation = null;
    const seconds = Math.max(0, Math.min(time - lastTime, 64)) / 1000;
    lastTime = time;
    const previous = getPan();
    const distance = Math.hypot(target.x - previous.x, target.y - previous.y);
    if (distance < 0.25 && Math.hypot(velocity.x, velocity.y) < 2) {
      velocity = { x: 0, y: 0 };
      paint(target);
      return;
    }
    // Critically damped spring: continuous velocity through target changes,
    // with gentle acceleration and braking rather than repeated ease restarts.
    // Its speed grows with the distance left, so a cursor that crosses the
    // page is caught within about half a second and never overshot. There
    // is no separate speed limit: a flat one made long moves crawl.
    const frequency = 8;
    const decay = Math.exp(-frequency * seconds);
    const next = { ...previous };
    for (const axis of ['x', 'y'] as const) {
      const offset = previous[axis] - target[axis];
      const impulse = velocity[axis] + frequency * offset;
      next[axis] = target[axis] + (offset + impulse * seconds) * decay;
      velocity[axis] = (velocity[axis] - frequency * impulse * seconds) * decay;
      // A changed goal can be crossed by velocity from the previous goal,
      // even with critical damping. Stop at that goal instead of wobbling.
      if ((previous[axis] - target[axis]) * (next[axis] - target[axis]) <= 0) {
        next[axis] = target[axis];
        velocity[axis] = 0;
      }
    }
    paint(next);
    animation = requestAnimationFrame(animate);
  }

  function follow(snap = false) {
    const left = Number.parseFloat(cursor!.style.left);
    const top = Number.parseFloat(cursor!.style.top);
    if (
      !Number.isFinite(left) ||
      !Number.isFinite(top) ||
      !replay.offsetWidth ||
      !replay.offsetHeight
    )
      return;
    const bounds = replay.getBoundingClientRect();
    const scale = getFrameScale(frame);
    const width = bounds.width / scale.x;
    const height = bounds.height / scale.y;
    const centered = {
      x: (replay.offsetWidth / 2 - left) * (width / replay.offsetWidth),
      y: (replay.offsetHeight / 2 - top) * (height / replay.offsetHeight),
    };
    // Let the cursor roam within the central half. Once it leaves, center
    // only that axis to give it room before the next camera movement.
    const marginX = frame.clientWidth * 0.25;
    const marginY = frame.clientHeight * 0.25;
    target = clampPan({
      x: Math.abs(centered.x - target.x) > marginX ? centered.x : target.x,
      y: Math.abs(centered.y - target.y) > marginY ? centered.y : target.y,
    });
    if (snap || reducedMotion) {
      stopAnimation();
      paint(target);
    } else if (animation === null) {
      lastTime = performance.now();
      animation = requestAnimationFrame(animate);
    }
  }
  function stopAnimation() {
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
    velocity = { x: 0, y: 0 };
  }
  function pause() {
    playing = false;
    pausedAt = replayer.getCurrentTime();
    stopAnimation();
  }
  // A stall stops the frame like a pause. One that interrupts playback holds
  // the clock's position, so resuming there keeps the framing. One that waits
  // at a requested position is a seek, so the next start reframes.
  function hold() {
    const at = replayer.getCurrentTime();
    if (at !== clock()) pendingSeek = true;
    else if (playing) pausedAt = at;
    playing = false;
    stopAnimation();
  }
  function start() {
    // rrweb emits start after synchronously casting the sought frame, for
    // both play(offset) and pause(offset). A normal resume keeps its framing.
    const sought =
      playing ||
      pendingSeek ||
      Math.abs(replayer.getCurrentTime() - pausedAt) > 1;
    pendingSeek = false;
    playing = true;
    if (sought) {
      stopAnimation();
      target = getPan();
    }
    follow(sought);
  }
  follow(!playing && !live());
  replayer.on('start', start);
  replayer.on('pause', pause);
  replayer.on('finish', pause);
  replayer.on('stall-start', hold);
  // Observe the rendered cursor, including seek and iframe-adjusted positions.
  const observer = new MutationObserver(() => {
    if (playing || live()) follow();
  });
  observer.observe(cursor, { attributes: true, attributeFilter: ['style'] });
  const resize =
    typeof ResizeObserver === 'undefined'
      ? undefined
      : // eslint-disable-next-line compat/compat -- guarded by the typeof check above.
        new ResizeObserver(() => follow(!playing && !live()));
  resize?.observe(frame);
  resize?.observe(replay);
  return () => {
    observer.disconnect();
    resize?.disconnect();
    replayer.off('start', start);
    replayer.off('pause', pause);
    replayer.off('finish', pause);
    replayer.off('stall-start', hold);
    stopAnimation();
  };
}
