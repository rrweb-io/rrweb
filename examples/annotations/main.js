import Player from 'rrweb-player';
import { EventType } from '@rrweb/types';
import 'rrweb-player/dist/style.css';
import './style.css';
import recording from './recording.json';

// Edit these defaults, or use the controls beside the player.
const defaults = [
  {
    time: 0,
    type: 'caption',
    text: 'Let’s create a home for our next project.',
  },
  {
    time: 2,
    type: 'timelineMarker',
    text: 'Start here: open the new-project form.',
  },
  {
    time: 4,
    type: 'caption',
    text: 'A good name makes your project easy to find.',
  },
  {
    time: 8,
    type: 'timelineMarker',
    text: 'Choose a template to give your team a head start.',
  },
  {
    time: 10,
    type: 'caption',
    text: 'Everything is ready. Create the project!',
  },
  {
    time: 13,
    type: 'caption',
    text: 'Your team now has a shared place to work.',
  },
];
let annotations = structuredClone(defaults);
let player;
let playerWidth = 0;
const start = recording[0].timestamp;
const duration = (recording.at(-1).timestamp - start) / 1000;
const container = document.querySelector('#player');
const status = document.querySelector('#status');
const list = document.querySelector('#annotations');

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function renderEditor() {
  list.replaceChildren();
  document.querySelector('#count').textContent = annotations.length;
  annotations.forEach((annotation, index) => {
    const row = document.createElement('div');
    row.className = 'annotation-row';
    const header = document.createElement('div');
    header.className = 'annotation-header';
    const label = document.createElement('span');
    label.className = `annotation-type ${annotation.type}`;
    label.textContent =
      annotation.type === 'caption' ? 'CC  Caption' : '●  Timeline marker';
    const timeLabel = document.createElement('label');
    timeLabel.className = 'time-label';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(duration);
    input.step = '0.5';
    input.value = annotation.time;
    input.setAttribute(
      'aria-label',
      `Time for annotation ${index + 1} in seconds`,
    );
    input.addEventListener('input', () => {
      annotation.time = input.valueAsNumber;
      setStatus('Unapplied edits');
    });
    timeLabel.append(input, 's');
    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove annotation ${index + 1}`);
    remove.addEventListener('click', () => {
      annotations.splice(index, 1);
      renderEditor();
      setStatus('Unapplied edits');
    });
    header.append(label, timeLabel, remove);
    const text = document.createElement('textarea');
    text.rows = 2;
    text.value = annotation.text;
    text.placeholder =
      annotation.type === 'caption'
        ? 'Leave empty to clear the caption'
        : 'What happens at this moment?';
    text.setAttribute('aria-label', `Text for annotation ${index + 1}`);
    text.addEventListener('input', () => {
      annotation.text = text.value;
      setStatus('Unapplied edits');
    });
    row.append(header, text);
    list.append(row);
  });
}

function mountPlayer(time = 0) {
  const invalid = annotations.find(
    (annotation) =>
      !Number.isFinite(annotation.time) ||
      annotation.time < 0 ||
      annotation.time > duration ||
      (annotation.type === 'timelineMarker' && !annotation.text.trim()) ||
      (annotation.type === 'caption' &&
        annotation.text !== '' &&
        !annotation.text.trim()),
  );
  if (invalid) {
    setStatus(
      `Use a time from 0 to ${duration}s and nonempty marker text. Use an empty caption to clear it.`,
      true,
    );
    return;
  }
  const events = [
    ...recording,
    ...annotations.map(({ time, type, text }) => ({
      type: EventType.Annotation,
      timestamp: start + time * 1000,
      data: { type, text },
    })),
  ].sort((a, b) => a.timestamp - b.timestamp);
  player?.$destroy();
  container.replaceChildren();
  playerWidth = Math.floor(container.clientWidth);
  player = new Player({
    target: container,
    props: {
      events,
      width: playerWidth,
      height: Math.round((playerWidth * 450) / 800),
      autoPlay: false,
      skipInactive: false,
      timelineMarkerColor: '#167b63',
      // showCaptions defaults to true in this preview.
    },
  });
  player.getReplayer().on('annotation', (event) => {
    const seconds = ((event.timestamp - start) / 1000).toFixed(1);
    document.querySelector('#last-event').textContent = `${seconds}s · ${
      event.data.type
    } · ${event.data.text || '(clear caption)'}`;
  });
  player.goto(time, false);
  setStatus('Ready. Press play, or hover a green timeline marker.');
  document.querySelector('#apply').disabled = false;
  document.querySelector('#restart').disabled = false;
}

for (const [id, type] of [
  ['add-caption', 'caption'],
  ['add-marker', 'timelineMarker'],
]) {
  document.querySelector(`#${id}`).addEventListener('click', () => {
    annotations.push({
      time: Math.min(
        duration,
        Math.round((player?.getReplayer().getCurrentTime() ?? 0) / 1000),
      ),
      type,
      text: type === 'caption' ? 'Your caption here.' : 'Explain this moment.',
    });
    renderEditor();
    list.lastElementChild.querySelector('textarea').focus();
    setStatus('Unapplied edits');
  });
}
document
  .querySelector('#apply')
  .addEventListener('click', () =>
    mountPlayer(player?.getReplayer().getCurrentTime() ?? 0),
  );
document
  .querySelector('#restart')
  .addEventListener('click', () => player.goto(0, true));
document.querySelector('#reset').addEventListener('click', () => {
  annotations = structuredClone(defaults);
  renderEditor();
  mountPlayer();
});
let resizeTimer;
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (player && Math.abs(container.clientWidth - playerWidth) > 2) {
      playerWidth = Math.floor(container.clientWidth);
      player.$set({
        width: playerWidth,
        height: Math.round((playerWidth * 450) / 800),
      });
      player.triggerResize();
    }
  }, 100);
}).observe(container);
renderEditor();
try {
  mountPlayer();
} catch (error) {
  setStatus(`Could not load the replay: ${error.message}`, true);
  console.error(error);
}
