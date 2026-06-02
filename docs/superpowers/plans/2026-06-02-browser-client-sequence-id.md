# Browser Client Sequence ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stable top-level `sequenceId` values to every event sent by `@rrweb/browser-client`, continuing per recording across same-tab page navigations.

**Architecture:** Browser-client owns the final outbound sequence state and persists it per `recordingId` in `sessionStorage`. The existing sequential-id record plugin is extended with `startId` and `preserveExisting` so browser-client can include it in the rrweb pipeline without duplicating or overwriting valid IDs.

**Tech Stack:** TypeScript, Yarn workspaces, Vite, Vitest, happy-dom, Puppeteer integration tests, rrweb record plugins.

---

## File Structure

- Modify `packages/plugins/rrweb-plugin-sequential-id-record/src/index.ts`: add `startId` and `preserveExisting` options with backward-compatible defaults.
- Create `packages/plugins/rrweb-plugin-sequential-id-record/test/index.test.ts`: plugin unit tests for default behavior, `startId`, invalid `startId`, and `preserveExisting`.
- Create `packages/plugins/rrweb-plugin-sequential-id-record/vitest.config.ts`: match the existing console-record plugin test config.
- Modify `packages/plugins/rrweb-plugin-sequential-id-record/package.json`: add `test` and `test:watch` scripts and Vitest dev dependency.
- Modify `packages/browser-client/package.json`: add `@rrweb/rrweb-plugin-sequential-id-record` dependency.
- Modify `packages/browser-client/tsconfig.json`: add a project reference to the sequential-id record plugin package.
- Modify `packages/browser-client/src/index.ts`: add sequence storage/state helpers, normalize every serialized event, construct a fresh browser-client sequential-id plugin before each `record()` call, and clear sequence state on permanent stop.
- Create `packages/browser-client/test/sequence-id.test.ts`: focused happy-dom tests for metadata, rrweb events, custom events, close events, resume, malformed storage, delayed start, freeze restart, and plugin options.
- Modify `packages/browser-client/test/integration.test.ts`: assert returned Cloud/server events have numeric increasing `sequenceId` before normalizing for event comparison.
- Create `.changeset/browser-client-sequence-id.md`: patch release note for browser-client and sequential-id plugin.

---

### Task 1: Add Sequential ID Plugin Tests

**Files:**
- Create: `packages/plugins/rrweb-plugin-sequential-id-record/test/index.test.ts`
- Create: `packages/plugins/rrweb-plugin-sequential-id-record/vitest.config.ts`
- Modify: `packages/plugins/rrweb-plugin-sequential-id-record/package.json`

- [ ] **Step 1: Add test scripts and Vitest dependency**

Edit `packages/plugins/rrweb-plugin-sequential-id-record/package.json` so `scripts` includes `test` and `test:watch`, and `devDependencies` includes `vitest`.

```json
{
  "scripts": {
    "dev": "vite build --watch",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "build": "yarn turbo run prepublish",
    "check-types": "tsc -noEmit",
    "prepublish": "tsc -noEmit && vite build"
  },
  "devDependencies": {
    "rrweb": "^2.0.0",
    "typescript": "^5.4.5",
    "vite": "^6.0.1",
    "vite-plugin-dts": "^3.9.1",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 2: Add Vitest config**

Create `packages/plugins/rrweb-plugin-sequential-id-record/vitest.config.ts`.

```ts
/// <reference types="vitest" />
import { defineProject, mergeConfig } from 'vitest/config';
import configShared from '../../../vitest.config.ts';

export default mergeConfig(configShared, defineProject({}));
```

- [ ] **Step 3: Write failing plugin tests**

Create `packages/plugins/rrweb-plugin-sequential-id-record/test/index.test.ts`.

```ts
import { describe, expect, it } from 'vitest';
import type { eventWithTime } from '@rrweb/types';
import { EventType } from '@rrweb/types';
import { getRecordSequentialIdPlugin } from '../src/index';

function event(sequenceId?: unknown): eventWithTime & { sequenceId?: unknown } {
  const e: eventWithTime & { sequenceId?: unknown } = {
    timestamp: 1,
    type: EventType.Custom,
    data: {
      tag: 'test',
      payload: {},
    },
  };
  if (sequenceId !== undefined) {
    e.sequenceId = sequenceId;
  }
  return e;
}

describe('getRecordSequentialIdPlugin', () => {
  it('keeps default behavior of assigning 1 then 2', () => {
    const plugin = getRecordSequentialIdPlugin({ key: 'sequenceId' });

    expect(plugin.eventProcessor?.(event())).toMatchObject({ sequenceId: 1 });
    expect(plugin.eventProcessor?.(event())).toMatchObject({ sequenceId: 2 });
  });

  it('starts generated ids after startId', () => {
    const plugin = getRecordSequentialIdPlugin({
      key: 'sequenceId',
      startId: 10,
    });

    expect(plugin.eventProcessor?.(event())).toMatchObject({ sequenceId: 11 });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5])(
    'treats invalid startId %s as 0',
    (startId) => {
      const plugin = getRecordSequentialIdPlugin({
        key: 'sequenceId',
        startId,
      });

      expect(plugin.eventProcessor?.(event())).toMatchObject({
        sequenceId: 1,
      });
    },
  );

  it('overwrites an existing key by default', () => {
    const plugin = getRecordSequentialIdPlugin({ key: 'sequenceId' });

    expect(plugin.eventProcessor?.(event(50))).toMatchObject({
      sequenceId: 1,
    });
  });

  it('preserves existing positive integer ids and advances the counter', () => {
    const plugin = getRecordSequentialIdPlugin({
      key: 'sequenceId',
      preserveExisting: true,
    });

    expect(plugin.eventProcessor?.(event(50))).toMatchObject({
      sequenceId: 50,
    });
    expect(plugin.eventProcessor?.(event())).toMatchObject({
      sequenceId: 51,
    });
  });

  it.each([0, -1, 1.5, Number.NaN, '2'])(
    'replaces invalid existing id %s when preserving existing ids',
    (sequenceId) => {
      const plugin = getRecordSequentialIdPlugin({
        key: 'sequenceId',
        preserveExisting: true,
      });

      expect(plugin.eventProcessor?.(event(sequenceId))).toMatchObject({
        sequenceId: 1,
      });
    },
  );
});
```

- [ ] **Step 4: Run plugin tests and verify they fail**

Run:

```sh
yarn workspace @rrweb/rrweb-plugin-sequential-id-record test
```

Expected: tests fail with TypeScript/runtime errors because `startId` and `preserveExisting` do not exist yet and the plugin always starts from `0` internally.

- [ ] **Step 5: Commit failing tests**

```sh
git add packages/plugins/rrweb-plugin-sequential-id-record/package.json packages/plugins/rrweb-plugin-sequential-id-record/vitest.config.ts packages/plugins/rrweb-plugin-sequential-id-record/test/index.test.ts
git commit -m "test: cover sequential id plugin options"
```

---

### Task 2: Implement Sequential ID Plugin Options

**Files:**
- Modify: `packages/plugins/rrweb-plugin-sequential-id-record/src/index.ts`
- Test: `packages/plugins/rrweb-plugin-sequential-id-record/test/index.test.ts`

- [ ] **Step 1: Implement option normalization and preservation**

Replace `packages/plugins/rrweb-plugin-sequential-id-record/src/index.ts` with this implementation.

```ts
import type { RecordPlugin } from '@rrweb/types';

export type SequentialIdOptions = {
  key: string;
  startId?: number;
  preserveExisting?: boolean;
};

const defaultOptions: SequentialIdOptions = {
  key: '_sid',
  startId: 0,
  preserveExisting: false,
};

export const PLUGIN_NAME = 'rrweb/sequential-id@1';

function isValidSequenceId(value: unknown): value is number {
  return Number.isInteger(value) && value > 0;
}

function normalizeStartId(value: unknown): number {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export const getRecordSequentialIdPlugin: (
  options?: Partial<SequentialIdOptions>,
) => RecordPlugin = (options) => {
  const _options = Object.assign({}, defaultOptions, options);
  let id = normalizeStartId(_options.startId);

  return {
    name: PLUGIN_NAME,
    eventProcessor(event) {
      if (
        _options.preserveExisting &&
        isValidSequenceId((event as Record<string, unknown>)[_options.key])
      ) {
        id = Math.max(id, (event as Record<string, number>)[_options.key]);
        return event;
      }

      Object.assign(event, {
        [_options.key]: ++id,
      });
      return event;
    },
    options: _options,
  };
};
```

- [ ] **Step 2: Run plugin tests and typecheck**

Run:

```sh
yarn workspace @rrweb/rrweb-plugin-sequential-id-record test
yarn workspace @rrweb/rrweb-plugin-sequential-id-record check-types
```

Expected: both commands pass.

- [ ] **Step 3: Commit plugin implementation**

```sh
git add packages/plugins/rrweb-plugin-sequential-id-record/src/index.ts
git commit -m "feat: add sequential id plugin start options"
```

---

### Task 3: Add Browser Client Sequence Tests

**Files:**
- Create: `packages/browser-client/test/sequence-id.test.ts`

- [ ] **Step 1: Write failing happy-dom tests**

Create `packages/browser-client/test/sequence-id.test.ts`.

```ts
// @vitest-environment happy-dom
import { EventType } from '@rrweb/types';
import type { RecordPlugin } from '@rrweb/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QueueLike = {
  items: string[];
  add(value: string): void;
  clear(): void;
  length(): number;
  read(): string | undefined;
};

type WebsocketLike = {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

type MockState = {
  buffers: QueueLike[];
  recordCalls: Array<Record<string, unknown>>;
  websockets: WebsocketLike[];
  hidden: boolean;
  pluginOptions: Array<Record<string, unknown>>;
};

const mockState = vi.hoisted(
  (): MockState => ({
    buffers: [],
    recordCalls: [],
    websockets: [],
    hidden: false,
    pluginOptions: [],
  }),
);

vi.mock('@rrweb/rrweb-plugin-sequential-id-record', () => {
  function isPositiveInteger(value: unknown): value is number {
    return Number.isInteger(value) && value > 0;
  }

  return {
    getRecordSequentialIdPlugin: vi.fn((options: Record<string, unknown>) => {
      mockState.pluginOptions.push(options);
      let id = Number(options.startId) || 0;
      const plugin: RecordPlugin = {
        name: 'rrweb/sequential-id@1',
        options,
        eventProcessor(event) {
          const current = (event as Record<string, unknown>)[
            String(options.key)
          ];
          if (options.preserveExisting && isPositiveInteger(current)) {
            id = Math.max(id, current);
            return event;
          }
          Object.assign(event, { [String(options.key)]: ++id });
          return event;
        },
      };
      return plugin;
    }),
  };
});

vi.mock('@rrweb/record', () => {
  const record = vi.fn((options: Record<string, unknown>) => {
    mockState.recordCalls.push(options);
    const event = {
      timestamp: 1,
      type: EventType.Meta,
      data: {
        href: document.location.href,
        width: 1024,
        height: 768,
      },
    };
    const plugins = (options.plugins || []) as RecordPlugin[];
    const processed = plugins.reduce(
      (acc, plugin) => plugin.eventProcessor?.(acc) || acc,
      event,
    );
    (options.emit as (event: unknown) => void)?.(processed);
    return vi.fn();
  });
  record.addCustomEvent = vi.fn();
  record.freezePage = vi.fn();
  return { record };
});

vi.mock('websocket-ts', () => {
  class ArrayQueue {
    items: string[] = [];
    add(value: string) {
      this.items.push(value);
    }
    clear() {
      this.items = [];
    }
    length() {
      return this.items.length;
    }
    read() {
      return this.items.shift();
    }
  }

  class ExponentialBackoff {
    constructor(
      public readonly initial: number,
      public readonly exponent: number,
    ) {}
  }

  class Websocket {
    send = vi.fn();
    close = vi.fn();
    addEventListener = vi.fn();
  }

  class WebsocketBuilder {
    constructor(private readonly url: string) {}
    withBuffer(buffer: QueueLike) {
      mockState.buffers.push(buffer);
      return this;
    }
    withBackoff() {
      return this;
    }
    build() {
      const ws = new Websocket();
      mockState.websockets.push(ws);
      return ws;
    }
  }

  return {
    ArrayQueue,
    ExponentialBackoff,
    Websocket,
    WebsocketBuilder,
    WebsocketEvent: {
      open: 'open',
      message: 'message',
      close: 'close',
    },
  };
});

function setDocumentHidden(value: boolean) {
  mockState.hidden = value;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => mockState.hidden,
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (mockState.hidden ? 'hidden' : 'visible'),
  });
}

async function importFreshClient() {
  vi.resetModules();
  mockState.buffers = [];
  mockState.recordCalls = [];
  mockState.websockets = [];
  mockState.pluginOptions = [];
  return await import('../src/index');
}

function recordingId(): string {
  const value = sessionStorage.getItem('rrweb-browser-client-recording-id');
  expect(value).toBeTruthy();
  return value as string;
}

function sequenceKey() {
  return `rrweb-browser-client-sequence-id:${recordingId()}`;
}

function bufferEvents() {
  return mockState.buffers.flatMap((buffer) =>
    buffer.items.map((item) => JSON.parse(item) as Record<string, unknown>),
  );
}

function sentEvents() {
  return mockState.websockets.flatMap((ws) =>
    ws.send.mock.calls.map(
      ([payload]) => JSON.parse(String(payload)) as Record<string, unknown>,
    ),
  );
}

beforeEach(() => {
  sessionStorage.clear();
  document.body.innerHTML = '';
  setDocumentHidden(false);
  window.history.replaceState({}, '', 'http://localhost/');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('@rrweb/browser-client sequenceId', () => {
  it('assigns recording-meta before constructing the rrweb plugin', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });

    expect(bufferEvents()[0]).toMatchObject({ sequenceId: 1 });
    expect(mockState.pluginOptions[0]).toMatchObject({
      key: 'sequenceId',
      startId: 1,
      preserveExisting: true,
    });
    expect(sentEvents()[0]).toMatchObject({ sequenceId: 2 });
    expect(sessionStorage.getItem(sequenceKey())).toBe('2');
  });

  it('continues from stored sequence state on resume', async () => {
    const client = await importFreshClient();
    sessionStorage.setItem('rrweb-browser-client-recording-id', 'recording-1');
    sessionStorage.setItem(
      'rrweb-browser-client-sequence-id:recording-1',
      '41',
    );

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });

    expect(bufferEvents()[0]).toMatchObject({ sequenceId: 42 });
    expect(mockState.pluginOptions[0]).toMatchObject({ startId: 42 });
    expect(sentEvents()[0]).toMatchObject({ sequenceId: 43 });
    expect(sessionStorage.getItem(sequenceKey())).toBe('43');
  });

  it('recovers malformed stored sequence state by assigning 1', async () => {
    const client = await importFreshClient();
    sessionStorage.setItem('rrweb-browser-client-recording-id', 'recording-1');
    sessionStorage.setItem(
      'rrweb-browser-client-sequence-id:recording-1',
      'bad',
    );

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });

    expect(bufferEvents()[0]).toMatchObject({ sequenceId: 1 });
  });

  it('assigns ids to fallback custom events before recording is active', async () => {
    const client = await importFreshClient();

    client.addCustomEvent('pre-start', { ok: true });

    expect(bufferEvents()[0]).toMatchObject({
      type: EventType.Custom,
      sequenceId: 1,
      data: {
        tag: 'pre-start',
      },
    });
    expect(sessionStorage.getItem(sequenceKey())).toBe('1');
  });

  it('assigns ids to close events and clears state on permanent stop', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });
    const key = sequenceKey();

    client.stop(true);

    expect(sentEvents().at(-1)).toMatchObject({
      sequenceId: 3,
      data: {
        tag: 'close-permanent',
      },
    });
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('builds the plugin from latest state after delayed visible start', async () => {
    setDocumentHidden(true);
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });
    client.addCustomEvent('queued-while-hidden', {});

    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(bufferEvents().map((event) => event.sequenceId)).toEqual([1, 2]);
    expect(mockState.pluginOptions[0]).toMatchObject({ startId: 2 });
    expect(sentEvents()[0]).toMatchObject({ sequenceId: 3 });
  });

  it('builds a fresh plugin after freeze restart without accumulating browser-client plugins', async () => {
    const client = await importFreshClient();

    client.start({
      serverUrl: 'http://localhost:8787/recordings/{recordingId}/events/ws',
      publicApiKey: 'public_key_rr_test',
      includePii: false,
      autostart: false,
      emit: () => undefined,
    });
    document.dispatchEvent(new Event('freeze'));
    client.addCustomEvent('between-records', {});
    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockState.pluginOptions).toHaveLength(2);
    expect(mockState.pluginOptions[1]).toMatchObject({ startId: 3 });
    for (const call of mockState.recordCalls) {
      const plugins = call.plugins as RecordPlugin[];
      expect(
        plugins.filter((plugin) => plugin.name === 'rrweb/sequential-id@1'),
      ).toHaveLength(1);
    }
  });
});
```

- [ ] **Step 2: Run the focused browser-client tests and verify they fail**

Run:

```sh
yarn workspace @rrweb/browser-client retest test/sequence-id.test.ts
```

Expected: tests fail because browser-client does not import the plugin, assign `sequenceId`, persist sequence state, or clear the sequence key.

- [ ] **Step 3: Commit failing browser-client tests**

```sh
git add packages/browser-client/test/sequence-id.test.ts
git commit -m "test: cover browser client sequence ids"
```

---

### Task 4: Implement Browser Client Sequence State

**Files:**
- Modify: `packages/browser-client/package.json`
- Modify: `packages/browser-client/tsconfig.json`
- Modify: `packages/browser-client/src/index.ts`
- Test: `packages/browser-client/test/sequence-id.test.ts`

- [ ] **Step 1: Add browser-client dependency and TypeScript reference**

In `packages/browser-client/package.json`, add the dependency.

```json
{
  "dependencies": {
    "@rrweb/record": "^2.0.0",
    "@rrweb/rrweb-plugin-sequential-id-record": "^2.0.0",
    "@rrweb/types": "^2.0.0",
    "@rrweb/utils": "^2.0.0",
    "rrweb": "^2.0.0",
    "websocket-ts": "^2.2.1"
  }
}
```

In `packages/browser-client/tsconfig.json`, add the plugin reference after `../record`.

```json
{
  "references": [
    {
      "path": "../record"
    },
    {
      "path": "../plugins/rrweb-plugin-sequential-id-record"
    },
    {
      "path": "../types"
    },
    {
      "path": "../utils"
    },
    {
      "path": "../rrweb"
    }
  ]
}
```

- [ ] **Step 2: Import the plugin and add sequence types/constants**

In `packages/browser-client/src/index.ts`, add the import and constants near existing imports/constants.

```ts
import { record } from '@rrweb/record';
import { getRecordSequentialIdPlugin } from '@rrweb/rrweb-plugin-sequential-id-record';

import { EventType } from '@rrweb/types';
```

Add these types/constants near `sessionStorageName`.

```ts
type eventWithSequenceId = eventWithTime & {
  sequenceId?: unknown;
};

type SequenceState = {
  recordingId: string;
  sequenceId: number;
};

const sessionStorageName = 'rrweb-browser-client-recording-id';
const sequenceStoragePrefix = 'rrweb-browser-client-sequence-id:';
let sequenceState: SequenceState | undefined;
```

- [ ] **Step 3: Add storage and sequence helper functions**

Add these helpers after `getSetRecordingId()`.

```ts
function sequenceStorageName(recordingId: string): string {
  return `${sequenceStoragePrefix}${recordingId}`;
}

function isValidSequenceId(value: unknown): value is number {
  return Number.isInteger(value) && value > 0;
}

function readSequenceId(recordingId: string): number {
  try {
    const value = Number(sessionStorage.getItem(sequenceStorageName(recordingId)));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function persistSequenceId(state: SequenceState): void {
  try {
    sessionStorage.setItem(
      sequenceStorageName(state.recordingId),
      String(state.sequenceId),
    );
  } catch {
    // Best-effort only; keep in-memory sequencing for this page.
  }
}

function getCurrentRecordingId(): string | null {
  try {
    return sessionStorage.getItem(sessionStorageName);
  } catch {
    return null;
  }
}

function getSequenceState(recordingId: string): SequenceState {
  if (sequenceState?.recordingId === recordingId) {
    return sequenceState;
  }
  sequenceState = {
    recordingId,
    sequenceId: readSequenceId(recordingId),
  };
  return sequenceState;
}

function removeSequenceId(recordingId: string): void {
  try {
    sessionStorage.removeItem(sequenceStorageName(recordingId));
  } catch {
    // Best-effort cleanup only.
  }
  if (sequenceState?.recordingId === recordingId) {
    sequenceState = undefined;
  }
}

function ensureSequenceId(
  event: eventWithTime,
  state: SequenceState,
): eventWithTime & { sequenceId: number } {
  const eventWithSequence = event as eventWithSequenceId;
  if (isValidSequenceId(eventWithSequence.sequenceId)) {
    state.sequenceId = Math.max(state.sequenceId, eventWithSequence.sequenceId);
  } else {
    state.sequenceId += 1;
    eventWithSequence.sequenceId = state.sequenceId;
  }
  persistSequenceId(state);
  return eventWithSequence as eventWithTime & { sequenceId: number };
}

function getSetSequenceState(): SequenceState | undefined {
  const recordingId = getSetRecordingId();
  return recordingId ? getSequenceState(recordingId) : undefined;
}

function buildRecordOptionsWithSequencePlugin(
  recordOptions: Omit<browserClientRecordOptions, keyof clientConfig>,
  state: SequenceState,
): Omit<browserClientRecordOptions, keyof clientConfig> {
  return {
    ...recordOptions,
    plugins: [
      ...(recordOptions.plugins || []),
      getRecordSequentialIdPlugin({
        key: 'sequenceId',
        startId: state.sequenceId,
        preserveExisting: true,
      }),
    ],
  };
}
```

- [ ] **Step 4: Normalize metadata before buffering**

In `start()`, after `recordingId` is known, initialize sequence state.

```ts
const recordingId = getSetRecordingId();
if (!recordingId) {
  console.error(
    '@rrweb/browser-client: Unable to start(); sessionStorage unavailable',
  );
  return;
}
const activeSequenceState = getSequenceState(recordingId);
```

When adding `metaEvent` to `buffer`, wrap it.

```ts
// metadata event should be the first seen server side
buffer.add(JSON.stringify(ensureSequenceId(metaEvent, activeSequenceState)));
```

- [ ] **Step 5: Normalize rrweb events before user callbacks and serialization**

At the top of `recordOptions.emit`, normalize the event once.

```ts
recordOptions.emit = (event: eventWithTime) => {
  const sequencedEvent = ensureSequenceId(event, activeSequenceState);
  if (!ws) {
    ws = connect(serverUrl, postUrl, publicApiKey, handleMessage);

    ws.addEventListener(WebsocketEvent.close, () => {
      wsConnectionPaused = true;
    });
  }
  if (configEmit !== undefined) {
    if (typeof configEmit === 'function') {
      configEmit(sequencedEvent);
    } else if (
      typeof (window as unknown as Record<string, unknown>)[configEmit] ===
      'function'
    ) {
      const emit = (window as unknown as Record<string, unknown>)[
        configEmit
      ] as (event: eventWithTime) => void;
      emit(sequencedEvent);
    } else {
      console.error('Could not understand emit config option:', configEmit);
    }
  }
  if (sequencedEvent.type === EventType.Meta && includePii) {
    const metaData = sequencedEvent.data as typeof sequencedEvent.data & {
      title?: string;
      referrer?: string;
    };
    metaData.title = document.title.substring(0, 500);
    metaData.referrer = document.referrer;
  }

  const eventStr = JSON.stringify(sequencedEvent);
  if (eventStr.length > wsLimit) {
    void postData(postUrl, publicApiKey, eventStr);
  } else if (ws && !wsConnectionPaused) {
    ws.send(eventStr);
  } else {
    buffer.add(eventStr);
  }
};
```

- [ ] **Step 6: Build fresh record options for each `record()` call**

Replace each `record(recordOptions as recordOptions<eventWithTime>)` call in `start()` with a helper that appends exactly one browser-client plugin from the latest sequence state.

```ts
const startRecording = () => {
  rrwebStopFn = record(
    buildRecordOptionsWithSequencePlugin(
      recordOptions,
      activeSequenceState,
    ) as recordOptions<eventWithTime>,
  );
};

let startWhenVisible = false;
if (!document.hidden) {
  startRecording();
} else {
  startWhenVisible = true;
}
```

In the `visibilitychange` listener, use `startRecording()` instead of calling `record()` directly.

```ts
if (!document.hidden && startWhenVisible) {
  startRecording();
  startWhenVisible = false;
  return;
}
```

- [ ] **Step 7: Run focused browser-client tests**

Run:

```sh
yarn workspace @rrweb/browser-client retest test/sequence-id.test.ts
```

Expected: tests pass.

- [ ] **Step 8: Commit browser-client sequence implementation**

```sh
git add packages/browser-client/package.json packages/browser-client/tsconfig.json packages/browser-client/src/index.ts
git commit -m "feat: add browser client sequence ids"
```

---

### Task 5: Cover Custom Events, Close Events, and Reset Semantics

**Files:**
- Modify: `packages/browser-client/src/index.ts`
- Test: `packages/browser-client/test/sequence-id.test.ts`

- [ ] **Step 1: Ensure custom fallback events are sequenced**

In `addCustomEvent()`, normalize fallback custom events before buffering. Replace the fallback branch with:

```ts
} else {
  const customEvent: customEventWithTime = {
    timestamp: nowTimestamp(),
    type: EventType.Custom,
    data: {
      tag,
      payload,
    },
  };
  const state = getSetSequenceState();
  if (!state) {
    console.error(
      '@rrweb/browser-client: Unable to addCustomEvent(); sessionStorage unavailable',
    );
    return;
  }
  buffer.add(JSON.stringify(ensureSequenceId(customEvent, state)));
}
```

- [ ] **Step 2: Ensure close events are sequenced and reset clears the key**

At the start of `stop(resetRecordingId)`, capture the current recording ID without creating a new one.

```ts
export function stop(resetRecordingId: boolean) {
  const recordingId = getCurrentRecordingId();
  const state = recordingId ? getSequenceState(recordingId) : undefined;
```

When sending `closeEvent`, normalize it if `state` exists.

```ts
const eventStr = state
  ? JSON.stringify(ensureSequenceId(closeEvent, state))
  : JSON.stringify(closeEvent);
buffer.clear();
ws.send(eventStr);
```

When resetting, remove the sequence ID before removing the recording ID.

```ts
if (resetRecordingId) {
  if (recordingId) {
    removeSequenceId(recordingId);
  }
  removeRecordingId();
}
```

- [ ] **Step 3: Run focused browser-client tests**

Run:

```sh
yarn workspace @rrweb/browser-client retest test/sequence-id.test.ts
```

Expected: tests pass, including `addCustomEvent()` fallback and `stop(true)` reset coverage.

- [ ] **Step 4: Run browser-client typecheck**

Run:

```sh
yarn workspace @rrweb/browser-client check-types
```

Expected: typecheck passes.

- [ ] **Step 5: Commit event path completion**

```sh
git add packages/browser-client/src/index.ts packages/browser-client/test/sequence-id.test.ts
git commit -m "fix: sequence browser client custom events"
```

---

### Task 6: Update Integration Assertions

**Files:**
- Modify: `packages/browser-client/test/integration.test.ts`

- [ ] **Step 1: Add a helper for increasing sequence IDs**

Near `pollUntil()` in `packages/browser-client/test/integration.test.ts`, add:

```ts
function expectIncreasingSequenceIds(events: Array<Record<string, unknown>>) {
  let previous = 0;
  for (const event of events) {
    expect(event.sequenceId).toEqual(expect.any(Number));
    expect(Number.isInteger(event.sequenceId)).toBe(true);
    expect(event.sequenceId as number).toBeGreaterThan(previous);
    previous = event.sequenceId as number;
  }
}
```

- [ ] **Step 2: Assert sequence IDs before server-event normalization**

In the `can roundtrip events` test, after `expect(serverEvents.length).toBeGreaterThan(1);`, add:

```ts
expectIncreasingSequenceIds(serverEvents as Array<Record<string, unknown>>);
```

Keep the existing deletion of `sequenceId` before comparing `snapshots` to `serverEvents`.

- [ ] **Step 3: Assert sequence IDs across stop/restart replay results**

In the `can clear recordingId using stop()` test, before collecting custom events, add:

```ts
for (const id of recordingIds) {
  const eventsForRecording = serverEvents.filter(
    (event) => event.recordingId === id,
  ) as Array<Record<string, unknown>>;
  expectIncreasingSequenceIds(eventsForRecording);
}
```

If this cannot be placed before `recordingIds` is populated, split collection into two passes:

```ts
const recordingIds = new Set<string>();
serverEvents.forEach((e) => {
  if ('recordingId' in e && typeof e.recordingId === 'string') {
    recordingIds.add(e.recordingId);
  }
});
for (const id of recordingIds) {
  const eventsForRecording = serverEvents.filter(
    (event) => event.recordingId === id,
  ) as Array<Record<string, unknown>>;
  expectIncreasingSequenceIds(eventsForRecording);
}
const customEvents = [];
serverEvents.forEach((e) => {
  if (e.type === EventType.Custom) {
    customEvents.push(e);
  }
});
```

- [ ] **Step 4: Run browser-client tests without external Cloud env**

Run:

```sh
yarn workspace @rrweb/browser-client retest test/sequence-id.test.ts test/load-diagnostics.test.ts
```

Expected: local happy-dom tests pass. Integration tests remain skipped unless `VITE_TEST_API_KEY` is set.

- [ ] **Step 5: Commit integration assertions**

```sh
git add packages/browser-client/test/integration.test.ts
git commit -m "test: assert browser client sequence ids"
```

---

### Task 7: Add Release Metadata and Documentation

**Files:**
- Create: `.changeset/browser-client-sequence-id.md`
- Modify: `packages/browser-client/README.md`
- Modify: `packages/plugins/rrweb-plugin-sequential-id-record/README.md`

- [ ] **Step 1: Add changeset**

Create `.changeset/browser-client-sequence-id.md`.

```md
---
"@rrweb/browser-client": patch
"@rrweb/rrweb-plugin-sequential-id-record": patch
---

Add browser-client `sequenceId` assignment for Cloud-bound events and allow the sequential-id record plugin to resume from a provided starting ID.
```

- [ ] **Step 2: Document browser-client sequencing behavior**

In `packages/browser-client/README.md`, add this paragraph under `Recording Helpers` after the `stop(resetRecordingId)` bullet.

```md
Browser-client events sent to rrweb Cloud include a top-level `sequenceId`. The client stores the latest assigned sequence ID in `sessionStorage` per recording ID, so same-tab page navigations continue ordering from the previous page. Sequence IDs are persisted when events are queued or sent, so gaps can appear if a page exits before an event reaches the server.
```

- [ ] **Step 3: Document plugin options**

In `packages/plugins/rrweb-plugin-sequential-id-record/README.md`, update the usage snippet to include the new options.

```js
record({
  emit: function emit(event) {
    // send events to server
  },
  plugins: [
    getRecordSequentialIdPlugin({
      key: '_sid', // default value
      startId: 0, // next generated id will be startId + 1
      preserveExisting: false, // keep current overwrite behavior by default
    }),
  ],
});
```

Add this paragraph after the snippet:

```md
Use `startId` when recording resumes from a known last ID. Set `preserveExisting` to `true` if another event processor may already provide a valid positive integer at the configured key.
```

- [ ] **Step 4: Commit release metadata and docs**

```sh
git add .changeset/browser-client-sequence-id.md packages/browser-client/README.md packages/plugins/rrweb-plugin-sequential-id-record/README.md
git commit -m "docs: document browser client sequence ids"
```

---

### Task 8: Final Verification

**Files:**
- Verify all touched implementation, test, package, docs, and changeset files.

- [ ] **Step 1: Run plugin verification**

Run:

```sh
yarn workspace @rrweb/rrweb-plugin-sequential-id-record test
yarn workspace @rrweb/rrweb-plugin-sequential-id-record check-types
yarn workspace @rrweb/rrweb-plugin-sequential-id-record build
```

Expected: all commands pass.

- [ ] **Step 2: Run browser-client focused verification**

Run:

```sh
yarn workspace @rrweb/browser-client check-types
yarn workspace @rrweb/browser-client build
yarn workspace @rrweb/browser-client retest test/sequence-id.test.ts test/load-diagnostics.test.ts
```

Expected: all commands pass.

- [ ] **Step 3: Run browser-client integration command**

Run:

```sh
yarn workspace @rrweb/browser-client retest test/integration.test.ts
```

Expected without `VITE_TEST_API_KEY`: suite is skipped by `describe.skip`. Expected with env configured: integration tests pass and assert increasing sequence IDs.

- [ ] **Step 4: Inspect final git state**

Run:

```sh
git status --short
git log --oneline -8
```

Expected: only known unrelated user changes remain unstaged, especially `packages/rrweb-player/.svelte-kit/ambient.d.ts` if it is still present. Recent commits should show the task commits from this plan.
