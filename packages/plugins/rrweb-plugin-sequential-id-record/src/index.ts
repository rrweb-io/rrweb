import type { RecordPlugin } from '@saola.ai/rrweb-types';

export type SequentialIdOptions = {
  key: string;
};

const defaultOptions: SequentialIdOptions = {
  key: '_sid',
};

export const PLUGIN_NAME = 'rrweb/sequential-id@1';

export const getRecordSequentialIdPlugin: (
  options?: Partial<SequentialIdOptions>,
) => RecordPlugin = (options) => {
  const _options = options
    ? Object.assign({}, defaultOptions, options)
    : defaultOptions;
  let id = 0;

  return {
    name: PLUGIN_NAME,
    eventProcessor(event) {
      Object.assign(event, {
        [_options.key]: ++id,
      });
      return event;
    },
    options: _options,
  };
};
