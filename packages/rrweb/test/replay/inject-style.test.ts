import { expect, it } from 'vitest';
import injectStyleRules from '../../src/replay/styles/inject-style';

it('keeps replayed text at its recorded size unless the page sets its own', () => {
  const rule = injectStyleRules('rr-block').find((css) =>
    css.startsWith('html {'),
  );
  // Both spellings: phone browsers that only know the prefixed one need it.
  expect(rule).toContain('-webkit-text-size-adjust: 100%;');
  expect(rule).toContain(' text-size-adjust: 100%;');
  // Without !important, a declaration in the recorded page wins.
  expect(rule).not.toContain('!important');
});
