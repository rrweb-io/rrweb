import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import * as path from 'path';
import { buildManifest } from './buildManifest';
import type { ManifestSource } from './buildManifest';

// The same file the build reads.
const source = JSON.parse(
  readFileSync(path.resolve(__dirname, 'manifest.json'), 'utf8'),
) as ManifestSource;

// eslint-disable-next-line camelcase -- a manifest key
const base = { version: '2.2.2', version_name: '2.2.2', author: 'rrweb' };
const clerkHosts = ['https://app.rrweb.com/*', 'https://clerk.rrweb.com/*'];

const chrome = buildManifest(source, {
  browser: 'chrome',
  base,
  clerkHostPermissions: clerkHosts,
});
const firefox = buildManifest(source, {
  browser: 'firefox',
  base,
  clerkHostPermissions: clerkHosts,
});

describe('buildManifest', () => {
  it('gives Chrome no content script and no access to every site', () => {
    expect(chrome.manifest_version).toBe(3);
    expect(chrome).not.toHaveProperty('content_scripts');
    expect(JSON.stringify(chrome)).not.toContain('<all_urls>');
    expect(chrome.host_permissions).toEqual(clerkHosts);
  });

  it('lets Chrome inject the recorder into the tab the person records', () => {
    expect(chrome.permissions).toEqual(
      expect.arrayContaining(['activeTab', 'scripting', 'cookies', 'storage']),
    );
    // the page-world script is injected with chrome.scripting, not by URL
    expect(chrome).not.toHaveProperty('web_accessible_resources');
    expect(chrome.background).toEqual({
      // eslint-disable-next-line camelcase -- a manifest key
      service_worker: 'background/index.ts',
      type: 'module',
    });
  });

  it('gives Firefox no content script, no access to every site and no Clerk', () => {
    expect(firefox.manifest_version).toBe(2);
    expect(firefox).not.toHaveProperty('content_scripts');
    expect(JSON.stringify(firefox)).not.toContain('<all_urls>');
    expect(firefox).not.toHaveProperty('host_permissions');
    expect(firefox.permissions).toEqual(
      expect.arrayContaining(['activeTab', 'storage']),
    );
    expect(firefox.permissions).not.toContain('cookies');
    // the content script loads the page-world script by its extension URL
    expect(firefox.web_accessible_resources).toEqual(['**/*.js']);
  });

  it('pins the development key only when one is given', () => {
    expect(chrome).not.toHaveProperty('key');
    const dev = buildManifest(source, {
      browser: 'chrome',
      base,
      clerkHostPermissions: clerkHosts,
      key: 'dev-key',
    });
    expect(dev.key).toBe('dev-key');
  });
});
