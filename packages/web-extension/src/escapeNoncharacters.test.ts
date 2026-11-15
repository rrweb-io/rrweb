import { describe, expect, it } from 'vitest';
import { escapeNoncharacters } from './escapeNoncharacters';

describe('escapeNoncharacters', () => {
  it('escapes the noncharacters Chrome rejects in injected files', () => {
    expect(
      escapeNoncharacters('a===`\uFFFE`||b===`\uFFFF`||c===`\uFDD0`'),
    ).toBe('a===`\\uFFFE`||b===`\\uFFFF`||c===`\\uFDD0`');
  });

  it('leaves other text, including a BOM character, unchanged', () => {
    expect(escapeNoncharacters('x===`\uFEFF`;\u00E9')).toBe(
      'x===`\uFEFF`;\u00E9',
    );
  });
});
