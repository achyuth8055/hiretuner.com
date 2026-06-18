const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  // Mode is overridden by --mode flag in package.json scripts.
  mode: 'development',
  entry: {
    'src/background/service-worker': './src/background/service-worker.ts',
    'src/content/content': './src/content/content.ts',
    'src/popup/popup': './src/popup/popup.ts',
    'src/options/options': './src/options/options.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  // Copy manifest, static HTML/CSS, and icons into dist so the dist folder is loadable
  // directly as an unpacked Chrome extension.
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'src/popup/popup.html' },
        { from: 'src/popup/popup.css', to: 'src/popup/popup.css' },
        { from: 'src/options/options.html', to: 'src/options/options.html' },
        {
          from: 'public',
          to: 'public',
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  devtool: 'source-map',
};
