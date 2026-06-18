/**
 * Build-time environment. `process.env.FIREBASE_*` references are statically
 * replaced by webpack's DefinePlugin (see webpack.config.js) — `process` never
 * exists at runtime in the browser. This ambient declaration just lets
 * TypeScript type-check those references without pulling in all of @types/node.
 */
declare const process: {
  env: {
    FIREBASE_API_KEY?: string;
    FIREBASE_AUTH_DOMAIN?: string;
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_APP_ID?: string;
    FIREBASE_STORAGE_BUCKET?: string;
    FIREBASE_MESSAGING_SENDER_ID?: string;
  };
};
