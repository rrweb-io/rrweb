module.exports = [
  // Main browser webpack builds
  {
    name: 'rrweb - record only (gzipped)',
    path: 'packages/rrweb/es/rrweb/packages/rrweb/src/entries/all.js',
    import: '{ record }',
    gzip: true,
  },
  {
    name: 'rrweb - record & CanvasManager only (gzipped)',
    path: 'packages/rrweb/es/rrweb/packages/rrweb/src/entries/all.js',
    import: '{ record, CanvasManager }',
    gzip: true,
  },
  {
    name: 'rrweb - record only (min)',
    path: 'packages/rrweb/es/rrweb/packages/rrweb/src/entries/all.js',
    import: '{ record }',
    gzip: false,
  },
  {
    name: 'rrweb - record with treeshaking flags (gzipped)',
    path: 'packages/rrweb/es/rrweb/packages/rrweb/src/entries/all.js',
    import: '{ record }',
    gzip: true,
    modifyWebpackConfig: function (config) {
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.DefinePlugin({
          __RRWEB_EXCLUDE_SHADOW_DOM__: true,
          __RRWEB_EXCLUDE_IFRAME__: true,
        }),
      );
      return config;
    },
  },
  {
    name: 'rrweb - Replayer',
    path: 'packages/rrweb/es/rrweb/packages/rrweb/src/entries/all.js',
    import: '{ Replayer }',
    gzip: true,
  },
];
