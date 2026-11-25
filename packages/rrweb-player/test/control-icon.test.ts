// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import ControlIcon from '../src/components/ControlIcon.svelte';

let target: HTMLElement;
afterEach(() => target?.remove());

const pathOf = (name: string) => {
  target = document.body.appendChild(document.createElement('div'));
  const icon = new ControlIcon({ target, props: { name } });
  const d = target.querySelector('path')?.getAttribute('d');
  icon.$destroy();
  target.remove();
  return d;
};

it('draws a different icon for leaving fullscreen', () => {
  expect(pathOf('enter-fullscreen')).toBeTruthy();
  expect(pathOf('exit-fullscreen')).toBeTruthy();
  expect(pathOf('exit-fullscreen')).not.toBe(pathOf('enter-fullscreen'));
});
