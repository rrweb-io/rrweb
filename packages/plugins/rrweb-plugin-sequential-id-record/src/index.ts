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
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function normalizeStartId(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : 0;
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
