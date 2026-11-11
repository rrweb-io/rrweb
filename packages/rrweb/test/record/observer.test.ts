/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import {
  EventType,
  IncrementalSource,
  MouseInteractions,
  type eventWithTime,
} from '@rrweb/types';
import record from '../../src/record';
import { isMasked } from '../../src/record/observer';

describe('isMasked', () => {
  it.each([
    ['<input type="password">', true],
    ['<input type="text" data-rr-is-password>', true],
    ['<textarea></textarea>', true],
    ['<select></select>', true],
    ['<input type="text">', false],
    ['<input type="checkbox">', false],
    ['<input type="radio">', false],
    ['<div></div>', false],
    ['', false],
  ])('isMasked(%j) returns %s', (html, expected) => {
    const container = document.createElement('div');
    container.innerHTML = html;

    expect(
      isMasked(container.firstElementChild as HTMLElement | null, {
        password: true,
        textarea: true,
        select: true,
      }),
    ).toBe(expected);
  });
});

it.each([
  {
    name: 'maskAllInputs enabled',
    options: { maskAllInputs: true },
    state: 'masked',
  },
  {
    name: 'maskAllInputs disabled',
    options: { maskAllInputs: false },
    state: 'unmasked',
  },
  {
    name: 'maskInputOptions',
    options: { maskInputOptions: { text: true } },
    state: 'masked',
  },
  { name: 'rr-mask', html: '<input class="rr-mask">', state: 'unmasked' },
  {
    name: 'maskTextSelector',
    html: '<input data-private>',
    options: { maskTextSelector: '[data-private]' },
    state: 'unmasked',
  },
  { name: 'rr-ignore', html: '<input class="rr-ignore">', state: 'unmasked' },
  {
    name: 'ignoreSelector',
    html: '<input data-private>',
    options: { ignoreSelector: '[data-private]' },
    state: 'unmasked',
  },
  { name: 'rr-block', html: '<input class="rr-block">', state: 'blocked' },
  {
    name: 'blockSelector',
    html: '<input data-private>',
    options: { blockSelector: '[data-private]' },
    state: 'blocked',
  },
])(
  'records $state focus and blur with $name',
  ({ html = '<input>', options, state }) => {
    const container = document.createElement('div');
    container.innerHTML = html;
    const input = container.querySelector('input')!;
    document.body.appendChild(container);
    const events: eventWithTime[] = [];
    const stop = record({ ...options, emit: (event) => events.push(event) });

    try {
      input.focus();
      input.blur();

      const interactions = events
        .filter(
          (event) =>
            event.type === EventType.IncrementalSnapshot &&
            event.data.source === IncrementalSource.MouseInteraction,
        )
        .map((event) => event.data);
      if (state === 'blocked') {
        expect(interactions).toEqual([]);
        return;
      }
      const masked = state === 'masked';
      const id = record.mirror.getId(input);
      expect(interactions).toEqual([
        {
          source: IncrementalSource.MouseInteraction,
          type: MouseInteractions.Focus,
          id,
          ...(masked && { maskFocus: true }),
        },
        {
          source: IncrementalSource.MouseInteraction,
          type: MouseInteractions.Blur,
          id,
          ...(masked && { maskBlur: true }),
        },
      ]);
    } finally {
      stop?.();
      container.remove();
    }
  },
);
