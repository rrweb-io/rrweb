import { describe, it, expect } from 'vitest';
import { buildAllowedOriginSet } from '../../src/record/cross-origin-utils';

describe('buildAllowedOriginSet', () => {
  it('should return a frozen Set for valid origins', () => {
    const result = buildAllowedOriginSet([
      'https://example.com',
      'https://app.example.com',
    ]);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(2);
    expect(result.has('https://example.com')).toBe(true);
    expect(result.has('https://app.example.com')).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('should normalize URLs to their origins', () => {
    const result = buildAllowedOriginSet([
      'https://example.com/',
      'https://example.com/path/to/page',
      'https://app.example.com?foo=bar',
      'http://localhost:3000#hash',
    ]);
    expect(result.size).toBe(3);
    expect(result.has('https://example.com')).toBe(true);
    expect(result.has('https://app.example.com')).toBe(true);
    expect(result.has('http://localhost:3000')).toBe(true);
  });

  it('should normalize default ports away', () => {
    const result = buildAllowedOriginSet([
      'https://example.com:443',
      'http://example.com:80',
    ]);
    expect(result.size).toBe(2);
    expect(result.has('https://example.com')).toBe(true);
    expect(result.has('http://example.com')).toBe(true);
  });

  it('should throw for empty array', () => {
    expect(() => buildAllowedOriginSet([])).toThrow(
      'allowedOrigins must be a non-empty array',
    );
  });

  it('should throw for non-array', () => {
    expect(() =>
      buildAllowedOriginSet(null as unknown as string[]),
    ).toThrow('allowedOrigins must be a non-empty array');
    expect(() =>
      buildAllowedOriginSet(undefined as unknown as string[]),
    ).toThrow('allowedOrigins must be a non-empty array');
  });

  it('should throw for non-string entries', () => {
    expect(() =>
      buildAllowedOriginSet([123 as unknown as string]),
    ).toThrow('must be a string');
  });

  it('should skip unparseable strings', () => {
    const result = buildAllowedOriginSet([
      'https://example.com',
      'not-a-url',
    ]);
    expect(result.size).toBe(1);
    expect(result.has('https://example.com')).toBe(true);
  });

  it('should deduplicate origins', () => {
    const result = buildAllowedOriginSet([
      'https://example.com',
      'https://example.com',
    ]);
    expect(result.size).toBe(1);
  });

  it('should deduplicate after normalization', () => {
    const result = buildAllowedOriginSet([
      'https://example.com',
      'https://example.com/path',
      'https://example.com:443',
    ]);
    expect(result.size).toBe(1);
    expect(result.has('https://example.com')).toBe(true);
  });
});
