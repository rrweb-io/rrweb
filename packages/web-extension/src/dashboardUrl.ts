/**
 * The dashboard's address, shared by the build (the manifest's
 * `externally_connectable`) and the extension (`config.dashboardUrl`), so
 * both read the same override.
 */
export function dashboardUrlFrom(override: string | undefined): string {
  return withoutTrailingSlash(override || 'https://app.rrweb.com');
}

export function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
