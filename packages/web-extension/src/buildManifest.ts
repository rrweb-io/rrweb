type ManifestPart = Record<string, unknown>;
type ManifestBase = {
  common: ManifestPart;
  chrome: ManifestPart;
  firefox: ManifestPart;
};
export type ManifestSource = {
  common: ManifestPart & { permissions: string[] };
  v2: ManifestBase;
  v3: ManifestBase;
};

/**
 * Build the manifest for one browser from `src/manifest.json`. Chrome gets
 * MV3, Firefox MV2.
 *
 * Neither build has a content script or host access to every site. Pressing
 * record injects the recorder into the current tab only, through `activeTab`
 * (plus `scripting` on Chrome). Clerk sign-in is Chromium only, so only the
 * Chrome manifest gets `cookies` and the Clerk hosts.
 */
export function buildManifest(
  source: ManifestSource,
  options: {
    browser: 'chrome' | 'firefox';
    base: ManifestPart;
    clerkHostPermissions: string[];
    key?: string;
  },
): ManifestPart {
  const version = options.browser === 'chrome' ? 'v3' : 'v2';
  const manifest: ManifestPart = {
    ...options.base,
    ...source.common,
    ...source[version].common,
    ...source[version][options.browser],
  };
  if (version === 'v3')
    Object.assign(manifest, {
      permissions: [...source.common.permissions, 'scripting', 'cookies'],
      // eslint-disable-next-line camelcase -- a manifest key
      host_permissions: [...options.clerkHostPermissions],
      ...(options.key ? { key: options.key } : {}),
    });
  return manifest;
}
