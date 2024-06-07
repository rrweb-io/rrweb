import { describe, it, expect } from 'vitest';
import { record } from '../src/index';

describe('record', () => {
  it('should be a function', () => {
    expect(typeof record).toBe('function');
  });
});
