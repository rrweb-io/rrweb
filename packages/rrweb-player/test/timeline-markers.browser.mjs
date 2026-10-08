// Run against the built package so exports, styles and native keyboard behavior are exercised.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { EventType } from '@rrweb/types';

const html = `<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head>
<body><div id="player"></div><script type="module">
import Player from '/rrweb-player.js';
const start = 1700000000000;
window.events = [
 { type: 4, timestamp: start, data: {href:'https://example.com',width:800,height:400} },
 { type: ${EventType.Annotation}, timestamp: start+2000, data: {type:'timelineMarker',text:'Recorded'} },
 { type: 5, timestamp: start+10000, data: {tag:'end',payload:{}} },
];
window.original = JSON.stringify(events);
window.selections = [];
window.cancel = false;
window.player = new Player({target:document.querySelector('#player'),props:{events,width:800,height:400,autoPlay:false,skipInactive:false,onTimelineMarkerSelect(selection){
 selections.push({id:selection.id,source:selection.source,timeOffset:selection.timeOffset});
 if(cancel){selection.preventDefault();player.goto(Math.max(0,selection.timeOffset-300),true);}
}}});
player.goto(0,false);
</script></body></html>`;
const server = createServer(async (request, response) => {
  const file =
    request.url === '/rrweb-player.js'
      ? 'rrweb-player.js'
      : request.url === '/style.css'
      ? 'style.css'
      : null;
  response.setHeader(
    'Content-Type',
    file?.endsWith('.js') ? 'text/javascript' : file ? 'text/css' : 'text/html',
  );
  response.end(
    file ? await readFile(new URL(`../dist/${file}`, import.meta.url)) : html,
  );
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => !!window.player);
  const recorded = page.getByRole('button', {
    name: 'Timeline marker: Recorded',
    exact: true,
  });
  await recorded.focus();
  await page.keyboard.press('Enter');
  assert.equal(
    await page.evaluate(() => player.getReplayer().getCurrentTime()),
    2000,
  );
  assert.equal(
    await page.evaluate(() => player.getReplayer().service.state.value),
    'paused',
  );
  await page.keyboard.press('Tab');
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('role')),
    'dialog',
  );
  await page.keyboard.press('Escape');
  assert.equal(
    await recorded.evaluate((el) => el === document.activeElement),
    true,
  );
  assert.equal(await page.getByRole('dialog').count(), 0);

  // Regeneration can move a keyed node without disconnecting it.
  await page.evaluate(() =>
    player.setTimelineMarkers([
      { id: 'reorder-a', timeOffset: 1000, text: 'Reorder A' },
      { id: 'reorder-b', timeOffset: 4000, text: 'Reorder B' },
      { id: 'reorder-c', timeOffset: 7000, text: 'Reorder C' },
    ]),
  );
  const reordered = page.getByRole('button', {
    name: 'Timeline marker: Reorder A',
    exact: true,
  });
  await reordered.focus();
  await page.evaluate(() => {
    window.originalTrigger = document.activeElement;
    player.setTimelineMarkers([
      { id: 'reorder-a', timeOffset: 7000, text: 'Reorder A' },
      { id: 'reorder-b', timeOffset: 4000, text: 'Reorder B' },
      { id: 'reorder-c', timeOffset: 1000, text: 'Reorder C' },
    ]);
  });
  assert.equal(
    await reordered.evaluate(
      (el) => el === document.activeElement && el === window.originalTrigger,
    ),
    true,
  );
  assert.equal(
    await reordered.evaluate((el) => el.getBoundingClientRect().width),
    20,
  );
  await page.keyboard.press('Tab');
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('role')),
    'dialog',
  );
  // A new first member replaces the focused panel's component.
  await page.evaluate(() =>
    player.setTimelineMarkers([
      { id: 'panel-first', timeOffset: 6990, text: 'Panel first' },
      { id: 'reorder-a', timeOffset: 7000, text: 'Reorder A' },
    ]),
  );
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('role')),
    'dialog',
  );
  await page.keyboard.press('Tab');
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.getAttribute('aria-label'),
    ),
    'Timeline marker: Panel first',
  );
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    window.dense = Array.from({ length: 100 }, (_, i) => ({
      id: `step:${i}`,
      timeOffset: 2000 + i * 50,
      text: `Step ${i}`,
      color: '#f59e0b',
    }));
    player.setTimelineMarkers(dense);
    player.setActiveTimelineMarker('step:55');
  });
  await page.waitForFunction(
    () => document.querySelectorAll('.rr-custom-event').length > 10,
  );
  const wideCount = await page.locator('.rr-custom-event').count();
  assert.ok(wideCount < 101);
  assert.equal(
    await page.locator('.rr-custom-event').evaluateAll((buttons) => {
      const bounds = buttons
        .map((button) => button.getBoundingClientRect())
        .sort((a, b) => a.left - b.left);
      return bounds.every(
        (bound, index) =>
          index === 0 || bound.left >= bounds[index - 1].right - 0.01,
      );
    }),
    true,
  );

  const member = page.getByRole('button', {
    name: 'Timeline marker: Step 55',
    exact: true,
  });
  await page.locator('.rr-custom-event[aria-current="true"]').focus();
  await member.waitFor({ state: 'visible' });
  await member.focus();
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(() => selections.at(-1).id), 'step:55');
  assert.equal(
    await page.evaluate(() => player.getReplayer().getCurrentTime()),
    4750,
  );
  await page.keyboard.press('Escape');
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.classList.contains('rr-custom-event'),
    ),
    true,
  );

  await page.evaluate(() => player.$set({ width: 320, height: 400 }));
  await page.waitForFunction(
    (count) => document.querySelectorAll('.rr-custom-event').length < count,
    wideCount,
  );
  for (let i = 0; i < 3; i++)
    await page.evaluate(() => player.setTimelineMarkers(dense));
  const narrowCount = await page.locator('.rr-custom-event').count();
  await page.evaluate(() => player.$set({ width: 800, height: 400 }));
  await page.waitForFunction(
    (count) => document.querySelectorAll('.rr-custom-event').length === count,
    wideCount,
  );
  await page.evaluate(() => {
    player.$set({ width: 1000, height: 400 });
    player.setTimelineMarkers([
      { id: 'merge-a', timeOffset: 4000, text: 'Merge A' },
      { id: 'merge-b', timeOffset: 4300, text: 'Merge B' },
    ]);
  });
  await page
    .getByRole('button', { name: 'Timeline marker: Merge B', exact: true })
    .focus();
  await page.evaluate(() => player.$set({ width: 320, height: 400 }));
  await page.waitForFunction(
    () => document.querySelectorAll('.rr-custom-event').length === 2,
  );
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.getAttribute('aria-label'),
    ),
    'Timeline marker: Merge B',
  );
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => selections.at(-1).id), 'merge-b');
  await page.evaluate(() => {
    player.setTimelineMarkers([
      { id: 'zero', timeOffset: 100, text: 'Start' },
      { id: 'end', timeOffset: 20000, text: 'End' },
    ]);
    window.cancel = true;
  });
  await page
    .getByRole('button', { name: 'Timeline marker: Start', exact: true })
    .press('Enter');
  assert.equal(
    await page.evaluate(() => player.getReplayer().service.state.value),
    'playing',
  );
  assert.ok(
    (await page.evaluate(() => player.getReplayer().getCurrentTime())) < 300,
  );
  await page.evaluate(() => {
    player.pause();
    window.cancel = false;
  });
  await page
    .getByRole('button', { name: 'Timeline marker: End', exact: true })
    .press('Space');
  assert.equal(
    await page.evaluate(() => player.getReplayer().getCurrentTime()),
    10000,
  );
  await page.evaluate(() => player.setTimelineMarkers([]));
  await recorded.waitFor();
  assert.equal(await page.locator('.rr-custom-event').count(), 1);
  assert.equal(
    await page.evaluate(
      () =>
        JSON.stringify(
          events.map(({ type, timestamp, data }) => ({
            type,
            timestamp,
            data,
          })),
        ) === original,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    `Browser checks passed: native Enter/Space/Tab/Escape, ${wideCount} dense groups -> ${narrowCount} on resize, regeneration, coexistence, selection override, seek boundaries, unchanged events.`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
