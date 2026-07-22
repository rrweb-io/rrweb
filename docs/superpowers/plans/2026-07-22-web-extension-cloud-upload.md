# Web Extension Cloud Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure, configurable uploads of completed extension sessions to `https://api.rrweb.com` without changing recording startup or session identity behavior.

**Architecture:** Keep IndexedDB operations in `storage.ts`, add pure/testable cloud settings and upload modules, and make the React settings and session-list views thin consumers. Credentials live only in `Browser.storage.local`; the upload transport serializes NDJSON and degrades from Brotli to gzip to an uncompressed request.

**Tech Stack:** TypeScript, React 18, Chakra UI, WebExtension storage, Vitest, Happy DOM, Testing Library, Vite.

---

### Task 1: Establish the extension unit-test harness

**Files:**
- Modify: `packages/web-extension/package.json`
- Create: `packages/web-extension/vitest.config.ts`
- Create: `packages/web-extension/test/setup.ts`

- [ ] **Step 1: Add test scripts and direct test dependencies**

Add these scripts to `packages/web-extension/package.json`:

```json
"test:unit": "vitest run --config vitest.config.ts",
"test:unit:watch": "vitest --config vitest.config.ts"
```

Add these development dependencies and update `yarn.lock` with:

```json
"@testing-library/react": "^14.3.1",
"@testing-library/user-event": "^14.6.1",
"vitest": "^1.4.0"
```

```bash
PUPPETEER_SKIP_DOWNLOAD=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  yarn install --ignore-scripts
```

- [ ] **Step 2: Configure Vitest for extension modules and React tests**

Create `packages/web-extension/vitest.config.ts`:

```ts
/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';
import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../../vitest.config';

export default mergeConfig(
  configShared,
  defineProject({
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./test/setup.ts'],
    },
  }),
);
```

Create `packages/web-extension/test/setup.ts`:

```ts
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});
```

- [ ] **Step 3: Verify the empty harness**

Run: `yarn workspace @rrweb/web-extension test:unit --passWithNoTests`

Expected: exit 0 with no test files found.

- [ ] **Step 4: Commit the harness**

```bash
git add packages/web-extension/package.json packages/web-extension/vitest.config.ts packages/web-extension/test/setup.ts yarn.lock
git commit -m "test(web-extension): add unit test harness"
```

### Task 2: Define and persist secure cloud settings

**Files:**
- Modify: `packages/web-extension/src/types.ts`
- Create: `packages/web-extension/src/utils/cloud-settings.ts`
- Create: `packages/web-extension/test/cloud-settings.test.ts`

- [ ] **Step 1: Write failing settings tests**

Create `packages/web-extension/test/cloud-settings.test.ts` with tests that describe the intended API:

```ts
import {
  CLOUD_SETTINGS_STORAGE_KEY,
  DEFAULT_CLOUD_SETTINGS,
  loadCloudSettings,
  normalizeApiBaseUrl,
  saveCloudSettings,
} from '../src/utils/cloud-settings';

describe('cloud settings', () => {
  it('defaults to api.rrweb.com and an empty token', async () => {
    const storage = { get: vi.fn().mockResolvedValue({}), set: vi.fn() };
    await expect(loadCloudSettings(storage)).resolves.toEqual(
      DEFAULT_CLOUD_SETTINGS,
    );
  });

  it('normalizes trailing slashes before saving locally', async () => {
    const storage = { get: vi.fn(), set: vi.fn().mockResolvedValue(undefined) };
    await saveCloudSettings(storage, {
      apiBaseUrl: 'https://example.test/api///',
      authToken: ' secret ',
    });
    expect(storage.set).toHaveBeenCalledWith({
      [CLOUD_SETTINGS_STORAGE_KEY]: {
        apiBaseUrl: 'https://example.test/api',
        authToken: 'secret',
      },
    });
  });

  it.each(['ftp://example.test', 'not a url'])('rejects %s', (value) => {
    expect(() => normalizeApiBaseUrl(value)).toThrow('HTTP or HTTPS');
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `yarn workspace @rrweb/web-extension test:unit test/cloud-settings.test.ts`

Expected: FAIL because `src/utils/cloud-settings.ts` does not exist.

- [ ] **Step 3: Add the cloud settings types and pure storage adapter**

Add to `packages/web-extension/src/types.ts`:

```ts
export type CloudSettings = {
  apiBaseUrl: string;
  authToken: string;
};
```

Create `packages/web-extension/src/utils/cloud-settings.ts` with:

```ts
import type { CloudSettings } from '~/types';

export const CLOUD_SETTINGS_STORAGE_KEY = 'rrweb-cloud-settings';
export const DEFAULT_CLOUD_SETTINGS: CloudSettings = {
  apiBaseUrl: 'https://api.rrweb.com',
  authToken: '',
};

type LocalStorageArea = {
  get(key: string): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
};

export function normalizeApiBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('API base URL must be a valid HTTP or HTTPS URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('API base URL must use HTTP or HTTPS.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('API base URL cannot include credentials, a query, or a hash.');
  }
  return url.href.replace(/\/+$/, '');
}

export function normalizeCloudSettings(
  value?: Partial<CloudSettings>,
): CloudSettings {
  return {
    apiBaseUrl: normalizeApiBaseUrl(
      value?.apiBaseUrl || DEFAULT_CLOUD_SETTINGS.apiBaseUrl,
    ),
    authToken: value?.authToken?.trim() || '',
  };
}

export async function loadCloudSettings(
  storage: LocalStorageArea,
): Promise<CloudSettings> {
  const stored = await storage.get(CLOUD_SETTINGS_STORAGE_KEY);
  return normalizeCloudSettings(
    stored[CLOUD_SETTINGS_STORAGE_KEY] as Partial<CloudSettings> | undefined,
  );
}

export async function saveCloudSettings(
  storage: LocalStorageArea,
  settings: CloudSettings,
): Promise<void> {
  await storage.set({
    [CLOUD_SETTINGS_STORAGE_KEY]: normalizeCloudSettings(settings),
  });
}
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `yarn workspace @rrweb/web-extension test:unit test/cloud-settings.test.ts`

Expected: 4 tests pass.

- [ ] **Step 5: Commit settings primitives**

```bash
git add packages/web-extension/src/types.ts packages/web-extension/src/utils/cloud-settings.ts packages/web-extension/test/cloud-settings.test.ts
git commit -m "feat(web-extension): add local cloud settings"
```

### Task 3: Implement the upload transport with compression fallbacks

**Files:**
- Create: `packages/web-extension/src/utils/cloud-upload.ts`
- Create: `packages/web-extension/test/cloud-upload.test.ts`

- [ ] **Step 1: Write failing URL, authentication, and fallback tests**

Create `packages/web-extension/test/cloud-upload.test.ts`. Use real `Session` and event-shaped values, injected `getSession`, `getEvents`, `fetchFn`, and `compress` dependencies. Cover these assertions in separate tests:

```ts
expect(buildUploadUrl('https://api.rrweb.com/', 'a/b')).toBe(
  'https://api.rrweb.com/recordings/a%2Fb/ingest',
);
expect(fetchFn).toHaveBeenCalledWith(
  'https://api.rrweb.com/recordings/session-1/ingest',
  expect.objectContaining({
    method: 'POST',
    headers: {
      Authorization: 'Bearer token-value',
      'Content-Type': 'application/x-ndjson',
      'Content-Encoding': 'br',
    },
  }),
);
```

Add focused tests proving:

1. a missing token returns a failure without calling storage or fetch;
2. Brotli success sets `Content-Encoding: br`;
3. Brotli rejection followed by gzip success sets `Content-Encoding: gzip`;
4. two compression rejections send the raw NDJSON string with no
   `Content-Encoding` header;
5. an HTTP 401 becomes a per-session error; and
6. a failed first session does not prevent a second session from uploading.

- [ ] **Step 2: Run the tests and verify RED**

Run: `yarn workspace @rrweb/web-extension test:unit test/cloud-upload.test.ts`

Expected: FAIL because `src/utils/cloud-upload.ts` does not exist.

- [ ] **Step 3: Implement the transport boundary**

Create `packages/web-extension/src/utils/cloud-upload.ts` with these public interfaces:

```ts
import type { eventWithTime } from '@rrweb/types';
import type { CloudSettings, Session } from '~/types';
import { getEvents, getSession } from './storage';
import { normalizeApiBaseUrl } from './cloud-settings';

export type SessionUploadResult = {
  id: string;
  name: string;
  ok: boolean;
  error?: string;
};

type CompressionFormat = 'brotli' | 'gzip';
type Compressor = (
  payload: string,
  format: CompressionFormat,
) => Promise<ArrayBuffer>;

type UploadDependencies = {
  getSession(id: string): Promise<Session | undefined>;
  getEvents(id: string): Promise<eventWithTime[]>;
  fetchFn: typeof fetch;
  compress: Compressor;
};

export function buildUploadUrl(baseUrl: string, sessionId: string): string;
export async function uploadSessions(
  ids: string[],
  settings: CloudSettings,
  dependencies?: Partial<UploadDependencies>,
): Promise<SessionUploadResult[]>;
```

The default compressor must use `CompressionStream` through a narrow constructor cast, return an `ArrayBuffer`, and never log its input. `uploadSessions` must validate and trim configuration before loading a session, serialize events with `events.map(JSON.stringify).join('\n')`, merge injected dependencies over `{ getSession, getEvents, fetchFn: fetch, compress: compressWithCompressionStream }`, and process IDs sequentially so every result is retained.

Use this fallback loop rather than duplicating request construction:

```ts
async function prepareBody(payload: string, compress: Compressor) {
  for (const [format, encoding] of [
    ['brotli', 'br'],
    ['gzip', 'gzip'],
  ] as const) {
    try {
      return { body: await compress(payload, format), encoding };
    } catch {
      // Try the next supported representation.
    }
  }
  return { body: payload };
}
```

- [ ] **Step 4: Run the transport tests and verify GREEN**

Run: `yarn workspace @rrweb/web-extension test:unit test/cloud-upload.test.ts`

Expected: all transport tests pass with no console output.

- [ ] **Step 5: Commit the transport**

```bash
git add packages/web-extension/src/utils/cloud-upload.ts packages/web-extension/test/cloud-upload.test.ts
git commit -m "feat(web-extension): upload sessions to rrweb API"
```

### Task 4: Add and test the local settings screen

**Files:**
- Create: `packages/web-extension/src/options/Settings.tsx`
- Modify: `packages/web-extension/src/options/App.tsx`
- Create: `packages/web-extension/test/Settings.test.tsx`

- [ ] **Step 1: Write a failing settings-screen test**

Mock `webextension-polyfill` before importing the component. Render
`SettingsView` inside `ChakraProvider`, wait for the default API URL to appear,
enter a token, replace the URL with `https://uploads.example.test/`, click Save,
and assert:

```ts
expect(localStorageArea.set).toHaveBeenCalledWith({
  'rrweb-cloud-settings': {
    apiBaseUrl: 'https://uploads.example.test',
    authToken: 'entered-token',
  },
});
expect(syncStorageArea.set).not.toHaveBeenCalled();
```

Add a second test entering `ftp://uploads.example.test` and assert that the
validation error is shown and neither storage area writes.

- [ ] **Step 2: Run the component test and verify RED**

Run: `yarn workspace @rrweb/web-extension test:unit test/Settings.test.tsx`

Expected: FAIL because `Settings.tsx` does not exist.

- [ ] **Step 3: Implement the settings view**

Build `SettingsView` with Chakra `FormControl`, `FormLabel`, `Input`, `Button`,
and toast components. It must:

- call `loadCloudSettings(Browser.storage.local)` on mount;
- render named inputs `apiBaseUrl` and `authToken`;
- use `type="url"` for the base URL and `type="password"` for the token;
- call `saveCloudSettings(Browser.storage.local, settings)` on Save;
- show validation failures without writing storage; and
- describe the endpoint as `<base URL>/recordings/<session ID>/ingest`.

Update `options/App.tsx` to import `SettingsView` and replace the empty route:

```tsx
<Route path="/" element={<SettingsView />} />
```

- [ ] **Step 4: Run the settings tests and verify GREEN**

Run: `yarn workspace @rrweb/web-extension test:unit test/Settings.test.tsx`

Expected: both component tests pass.

- [ ] **Step 5: Commit the settings UI**

```bash
git add packages/web-extension/src/options/App.tsx packages/web-extension/src/options/Settings.tsx packages/web-extension/test/Settings.test.tsx
git commit -m "feat(web-extension): configure cloud uploads locally"
```

### Task 5: Add and test session-list uploads

**Files:**
- Modify: `packages/web-extension/src/pages/SessionList.tsx`
- Create: `packages/web-extension/test/SessionList.test.tsx`

- [ ] **Step 1: Write a failing upload-action test**

Mock `~/utils/storage`, `~/utils/cloud-settings`, and `~/utils/cloud-upload`.
Return one saved session from `getAllSessions`, render `SessionList` inside
`ChakraProvider` and `MemoryRouter`, select the session row, and click Upload.
Assert:

```ts
expect(loadCloudSettings).toHaveBeenCalledWith(Browser.storage.local);
expect(uploadSessions).toHaveBeenCalledWith(
  ['session-1'],
  expect.objectContaining({ apiBaseUrl: 'https://api.rrweb.com' }),
);
```

Add separate tests that make `uploadSessions` return all-success and
partial-failure arrays, then assert the corresponding `Upload complete` and
`Upload completed with errors` toast content.

- [ ] **Step 2: Run the component test and verify RED**

Run: `yarn workspace @rrweb/web-extension test:unit test/SessionList.test.tsx`

Expected: FAIL because the Upload action is absent.

- [ ] **Step 3: Wire the session-list UI to the upload boundary**

In `SessionList.tsx`:

- import `Browser`, `loadCloudSettings`, and `uploadSessions`;
- add `isUploading` state;
- implement `handleUpload` with a `try/finally` loading guard;
- preserve per-session failure names and messages in the error toast;
- clear neither row selection nor saved sessions after upload; and
- add a blue Upload button beside Download with `isLoading={isUploading}` and
  `loadingText="Uploading"`.

The handler must load settings from `Browser.storage.local` and pass only the
selected session IDs and settings to `uploadSessions`.

- [ ] **Step 4: Run the session-list tests and verify GREEN**

Run: `yarn workspace @rrweb/web-extension test:unit test/SessionList.test.tsx`

Expected: upload invocation and feedback tests pass.

- [ ] **Step 5: Commit the session UI**

```bash
git add packages/web-extension/src/pages/SessionList.tsx packages/web-extension/test/SessionList.test.tsx
git commit -m "feat(web-extension): add session upload action"
```

### Task 6: Document and verify the complete feature

**Files:**
- Modify: `packages/web-extension/README.md`

- [ ] **Step 1: Document configuration and behavior**

Add a Cloud uploads section explaining:

- recordings remain local until the user selects and uploads them;
- the default base URL is `https://api.rrweb.com`;
- the bearer token is stored in extension-local storage and is not synced;
- custom HTTP/HTTPS base URLs are supported for proxies and local development;
- the endpoint path is `/recordings/<session ID>/ingest`; and
- automatic recording and session-ID bridging are not part of this feature.

- [ ] **Step 2: Run formatting and inspect intentional changes**

Run:

```bash
yarn prettier --write \
  packages/web-extension/src/types.ts \
  packages/web-extension/src/utils/cloud-settings.ts \
  packages/web-extension/src/utils/cloud-upload.ts \
  packages/web-extension/src/options/App.tsx \
  packages/web-extension/src/options/Settings.tsx \
  packages/web-extension/src/pages/SessionList.tsx \
  packages/web-extension/test \
  packages/web-extension/vitest.config.ts \
  packages/web-extension/README.md
git diff --check
```

Expected: formatter exits 0 and `git diff --check` produces no output.

- [ ] **Step 3: Run the complete extension test suite**

Run: `yarn workspace @rrweb/web-extension test:unit`

Expected: every extension unit and component test passes.

- [ ] **Step 4: Run dependency-aware type checking**

Run: `yarn turbo run check-types --filter @rrweb/web-extension`

Expected: all dependency builds and the extension type-check pass. Do not use
the direct workspace `check-types` command in a fresh checkout because it does
not build referenced workspace packages first.

- [ ] **Step 5: Build both browser targets**

Run:

```bash
yarn workspace @rrweb/web-extension build:chrome
yarn workspace @rrweb/web-extension build:firefox
```

Expected: both Vite builds exit 0 and produce extension bundles.

- [ ] **Step 6: Confirm scope and credential hygiene**

Run:

```bash
git diff --name-only HEAD~5..HEAD
rg -n "rrwebcloud|console\.(log|debug).*payload|storage\.sync.*auth|authToken:\s*['\"][^'\"]+" packages/web-extension/src packages/web-extension/test
```

Expected: no auto-start, session-ID bridge, hardcoded token, payload logging,
sync credential storage, or `rrwebcloud` hostname appears. Inspect any benign
test fixture match before proceeding.

- [ ] **Step 7: Commit documentation and any formatting-only changes**

```bash
git add packages/web-extension/README.md packages/web-extension
git commit -m "docs(web-extension): document cloud session uploads"
```

- [ ] **Step 8: Review final branch state**

Run: `git status --short --branch && git log --oneline --decorate -8`

Expected: only known setup-generated files outside the feature remain unstaged;
all feature changes are committed on `codex/web-extension-cloud-upload`.
