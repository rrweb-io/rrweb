export function normalizeKeys<T extends Record<string, unknown>>(
  input: T,
  canonical: Record<string, unknown>,
): T {
  const norm = (s: string) => s.toLowerCase().replace(/[-_ ]/g, '');
  const canonicalMap = new Map(Object.keys(canonical).map((k) => [norm(k), k]));
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(input)) {
    const match = canonicalMap.get(norm(key));
    if (match && match !== key) {
      result[match] = value;
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
