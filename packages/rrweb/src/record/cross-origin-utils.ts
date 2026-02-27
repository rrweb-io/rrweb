function toOrigin(url: string): string | null {
  try {
    const origin = new URL(url).origin;
    return origin !== 'null' ? origin : null;
  } catch {
    return null;
  }
}

export function buildAllowedOriginSet(origins: string[]): ReadonlySet<string> {
  if (!Array.isArray(origins) || origins.length === 0) {
    throw new Error(
      '[rrweb] allowedOrigins must be a non-empty array of origin strings.',
    );
  }

  const set = new Set<string>();
  for (let i = 0; i < origins.length; i++) {
    const entry = origins[i];
    if (typeof entry !== 'string') {
      throw new Error(
        `[rrweb] allowedOrigins[${i}] must be a string, got ${typeof entry}.`,
      );
    }
    const origin = toOrigin(entry);
    if (origin) {
      set.add(origin);
    }
  }

  return Object.freeze(set);
}
