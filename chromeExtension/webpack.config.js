const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

/**
 * Minimal `.env` parser (no extra dependency). Reads the makemyresume root
 * `.env` so the extension can bake in the *public* Firebase web config at build
 * time. These NEXT_PUBLIC_FIREBASE_* values are client-safe — they're already
 * shipped to every browser by the website — so embedding them lets the
 * extension sign in out of the box without the user pasting keys into Options.
 */
function readRootEnv() {
  const out = {};
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

// process.env wins over the root .env file so CI can override at build time.
const rootEnv = readRootEnv();
function firebaseEnv(name) {
  return (
    process.env[`FIREBASE_${name}`] ||
    process.env[`NEXT_PUBLIC_FIREBASE_${name}`] ||
    rootEnv[`NEXT_PUBLIC_FIREBASE_${name}`] ||
    ''
  );
}

const firebaseDefines = {
  'process.env.FIREBASE_API_KEY': JSON.stringify(firebaseEnv('API_KEY')),
  'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(firebaseEnv('AUTH_DOMAIN')),
  'process.env.FIREBASE_PROJECT_ID': JSON.stringify(firebaseEnv('PROJECT_ID')),
  'process.env.FIREBASE_APP_ID': JSON.stringify(firebaseEnv('APP_ID')),
  'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(firebaseEnv('STORAGE_BUCKET')),
  'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(firebaseEnv('MESSAGING_SENDER_ID')),
};

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
    new webpack.DefinePlugin(firebaseDefines),
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
