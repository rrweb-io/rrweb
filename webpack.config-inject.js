const path = require('path');

module.exports = {
  mode: 'development',
  entry: {
    app: ['./src/electron-inject'],
  },
  output: {
    path: path.resolve(__dirname, 'dist-electron'),
    filename: 'index.js',
  },
  target: 'electron-preload',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.mjs'],

    alias: {
      'rrweb/record$': path.resolve(__dirname, 'src/record/index.ts'),
      rrweb$: path.resolve(__dirname, 'src/index.ts'),
    },
  },
  module: {

    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
      {
        test: /scrubber\/scripts\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    modules: 'auto', // commonjs,amd,umd,systemjs,false
                    useBuiltIns: 'usage',
                    targets: '> 0.25%, not dead',
                    corejs: 3,
                  },
                ],
              ],
            },
          },
        ],
      },
    ],
  },
};