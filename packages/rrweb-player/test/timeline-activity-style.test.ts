import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compile, preprocess } from 'svelte/compiler';
import sveltePreprocess from 'svelte-preprocess';

async function css(component: string) {
  const file = new URL(`../src/${component}`, import.meta.url);
  const { code } = await preprocess(
    readFileSync(file, 'utf8'),
    sveltePreprocess(),
    { filename: file.pathname },
  );
  return compile(code, { css: 'external', filename: file.pathname }).css.code;
}
const rule = (code: string, selector: RegExp) =>
  code.match(new RegExp(`${selector.source}\\{([^}]*)\\}`))?.[1] ?? '';

it('extends the activity fade by the timeline inset on both sides', async () => {
  // The toolbar timeline pads the track by --rr-timeline-inset, so pulling
  // the fade out by the same amount takes it to the player edges. Without the
  // variable, as in the classic controller, the fade covers the track.
  const controller = await css('Controller.svelte');
  const toolbarTimeline = rule(
    controller,
    /\.rr-timeline\.rr-timeline--toolbar(?:\.svelte-\w+)+/,
  );
  expect(toolbarTimeline).toMatch(/--rr-timeline-inset:\s*12px/);
  expect(toolbarTimeline).toMatch(/padding:0 var\(--rr-timeline-inset\)/);

  const fade = rule(
    await css('components/TimelineActivity.svelte'),
    /\.rr-activity(?:\.svelte-\w+)+::before/,
  );
  expect(fade).toContain('inset:0 calc(-1 * var(--rr-timeline-inset, 0px))');
});

it('draws the navigation mark as a ring that reads apart from a click dot, centred on the click lane', async () => {
  const code = await css('components/TimelineActivity.svelte');
  const dot = rule(code, /\.rr-activity__dot(?:\.svelte-\w+)+/);
  expect(dot).toMatch(/width:7px;height:7px;border-radius:50%/);
  // Hollow: an outline in the text colour around the surface colour.
  expect(dot).toContain('border:1.5px solid currentColor');
  expect(dot).toContain('background:var(--rr-surface, #fff)');
  // The SVG draws the click lane at y=106 of 110.
  const mark = rule(code, /\.rr-activity__icon(?:\.svelte-\w+)+/);
  expect(mark).toContain('bottom:calc(100% * 4 / 110)');
  expect(mark).toContain('transform:translate(-50%, 50%)');
});
