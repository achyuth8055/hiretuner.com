/**
 * Auth module for the HireTuner Chrome extension.
 *
 * Flow:
 *  1. chrome.identity.getAuthToken → Google OAuth access token (requires
 *     `oauth2.client_id` in manifest + `identity` permission).
 *  2. Convert that into a Firebase credential and sign in with the modular
 *     Firebase web SDK to get a Firebase ID token.
 *  3. POST the ID token to /api/auth/firebase, which mints our HireTuner
 *     session cookie (web flow) — and importantly, returns 200 so we know
 *     the token is trusted by the backend.
 *  4. For every subsequent API request the extension makes, send
 *     `Authorization: Bearer <firebaseIdToken>` and let
 *     requireApiUserAsync on the server verify it.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

/**
 * Public Firebase web config baked in at build time (see webpack DefinePlugin,
 * sourced from the root .env NEXT_PUBLIC_FIREBASE_* values). These keys are
 * client-safe — the website already ships them to every browser — so they let
 * the extension authenticate out of the box. The Options page can still
 * override them for a different project without rebuilding.
 */
const BUILT_IN_CONFIG: FirebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ?? "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.FIREBASE_PROJECT_ID ?? "",
  appId: process.env.FIREBASE_APP_ID ?? "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? "",
};

/**
 * Read Firebase config from extension settings (chrome.storage.sync) so users
 * can override it via the Options page, falling back to the build-time
 * defaults baked in from the root .env.
 */
async function loadFirebaseConfig(): Promise<FirebaseConfig | null> {
  const stored = await chrome.storage.sync.get([
    "firebaseApiKey",
    "firebaseAuthDomain",
    "firebaseProjectId",
    "firebaseAppId",
    "firebaseStorageBucket",
    "firebaseMessagingSenderId",
  ]);

  const cfg: FirebaseConfig = {
    apiKey: stored.firebaseApiKey || BUILT_IN_CONFIG.apiKey,
    authDomain: stored.firebaseAuthDomain || BUILT_IN_CONFIG.authDomain,
    projectId: stored.firebaseProjectId || BUILT_IN_CONFIG.projectId,
    appId: stored.firebaseAppId || BUILT_IN_CONFIG.appId,
    storageBucket: stored.firebaseStorageBucket || BUILT_IN_CONFIG.storageBucket,
    messagingSenderId: stored.firebaseMessagingSenderId || BUILT_IN_CONFIG.messagingSenderId,
  };

  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) return null;
  return cfg;
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

async function getFirebase(): Promise<Auth | null> {
  if (cachedAuth) return cachedAuth;
  const cfg = await loadFirebaseConfig();
  if (!cfg) return null;

  if (!cachedApp) {
    cachedApp = getApps()[0] ?? initializeApp(cfg);
  }
  cachedAuth = getAuth(cachedApp);
  return cachedAuth;
}

/**
 * Run the website-bridge OAuth flow. The bridge page on hiretuner.com handles
 * Firebase signInWithPopup and redirects back to our chromiumapp.org callback
 * with the ID token in the URL fragment. This avoids needing a separate
 * Chrome App OAuth client_id and works with the existing Firebase setup.
 */
function launchBridgeFlow(apiUrl: string): Promise<{
  idToken: string;
  email: string | null;
  name: string | null;
  uid: string | null;
}> {
  return new Promise((resolve, reject) => {
    if (!chrome.identity || !chrome.identity.launchWebAuthFlow) {
      reject(new Error("chrome.identity.launchWebAuthFlow is unavailable."));
      return;
    }
    const redirectUri = chrome.identity.getRedirectURL("oauth");
    const bridgeUrl = `${apiUrl.replace(/\/$/, "")}/extension-auth?redirect=${encodeURIComponent(
      redirectUri,
    )}`;
    chrome.identity.launchWebAuthFlow(
      { url: bridgeUrl, interactive: true },
      (responseUrl) => {
        const errMsg = chrome.runtime.lastError?.message;
        if (errMsg || !responseUrl) {
          reject(new Error(errMsg || "Sign-in cancelled."));
          return;
        }
        try {
          const parsed = new URL(responseUrl);
          const hashStr = (parsed.hash || "").replace(/^#/, "");
          const hash = new URLSearchParams(hashStr);
          const idToken = hash.get("idToken");
          if (!idToken) {
            reject(new Error("Bridge response did not include an ID token."));
            return;
          }
          resolve({
            idToken,
            email: hash.get("email"),
            name: hash.get("name"),
            uid: hash.get("uid"),
          });
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Failed to parse bridge response."));
        }
      },
    );
  });
}

/**
 * Start a fresh Google sign-in via the hiretuner.com bridge. Returns the
 * Firebase ID token after a successful exchange with the HireTuner backend.
 */
export async function signInWithGoogle(): Promise<{
  idToken: string;
  user: { email: string | null; name: string | null; uid: string };
} | null> {
  // Firebase Web SDK is no longer strictly required in the extension itself —
  // the bridge page handles signInWithPopup — but we still load it so the
  // cached current user / token-refresh paths can run inside the extension.
  await getFirebase().catch(() => null);

  const apiUrl = (await getApiUrl()).replace(/\/$/, "");
  const bridge = await launchBridgeFlow(apiUrl);
  const idToken = bridge.idToken;

  // Build a user object using the bridge result. Use the real Firebase UID
  // returned by the bridge page (EXT-E17) rather than the email — fixes
  // collisions when multiple installs share the same address and avoids
  // stale uids if the user changes their email.
  const result = {
    user: {
      uid: bridge.uid ?? bridge.email ?? "ext-user",
      email: bridge.email,
      displayName: bridge.name,
      getIdToken: async () => idToken,
    },
  };

  // Tell the backend so it can mint a HireTuner session and provision the user.
  // The bridge page already POSTed to /api/auth/firebase, but we repeat it from
  // the extension context so the Authorization: Bearer flow is exercised at
  // least once before user actions hit tool routes.
  const exchange = await fetch(`${apiUrl}/api/auth/firebase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ idToken }),
  });
  if (!exchange.ok) {
    const json = (await exchange.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message ?? `Backend rejected the Firebase token (HTTP ${exchange.status}).`);
  }

  await chrome.storage.local.set({
    firebaseIdToken: idToken,
    firebaseUid: result.user.uid,
    firebaseEmail: result.user.email,
    firebaseDisplayName: result.user.displayName,
    firebaseTokenIssuedAt: Date.now(),
  });

  return {
    idToken,
    user: {
      uid: result.user.uid,
      email: result.user.email,
      name: result.user.displayName,
    },
  };
}

/**
 * Returns the current Firebase ID token, refreshing it if older than 50 minutes
 * (Firebase tokens expire after 60 min). Returns null when the user is not
 * signed in.
 */
export async function getCurrentIdToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get([
    "firebaseIdToken",
    "firebaseTokenIssuedAt",
  ]);

  const issuedAt = (stored.firebaseTokenIssuedAt as number | undefined) ?? 0;
  const ageMinutes = (Date.now() - issuedAt) / 1000 / 60;
  // Use the cached token directly when it has plenty of life left.
  if (stored.firebaseIdToken && ageMinutes < 50) {
    return stored.firebaseIdToken as string;
  }

  // In the 50–58 minute window, try to refresh against the backend without
  // a user-visible re-sign-in. The bridge flow never signed Firebase in
  // inside the extension's origin, so we can't rely on Firebase Web SDK's
  // auto-refresh — we ask the server to mint a custom token and use that.
  if (stored.firebaseIdToken && ageMinutes < 58) {
    const fresh = await refreshViaBackend(stored.firebaseIdToken as string).catch(() => null);
    if (fresh) {
      await chrome.storage.local.set({
        firebaseIdToken: fresh,
        firebaseTokenIssuedAt: Date.now(),
      });
      return fresh;
    }
    // Refresh attempt failed — fall through and let the Web SDK try, then
    // ultimately return null which forces a re-sign-in.
  }

  const auth = await getFirebase();
  if (!auth) return null;

  // Wait for the live user to be ready (Firebase reads its persistence
  // asynchronously after init).
  const user = await waitForUser(auth);
  if (!user) return null;

  const idToken = await user.getIdToken(/* forceRefresh */ true);
  await chrome.storage.local.set({
    firebaseIdToken: idToken,
    firebaseTokenIssuedAt: Date.now(),
  });
  return idToken;
}

/**
 * Ask the server to mint a custom token from a still-valid ID token, then
 * sign the extension's Firebase auth in with that custom token and return a
 * fresh ID token. Returns null on any failure so the caller can fall back to
 * the interactive bridge flow.
 */
async function refreshViaBackend(cachedIdToken: string): Promise<string | null> {
  const apiUrl = (await getApiUrl()).replace(/\/$/, "");
  const response = await fetch(`${apiUrl}/api/auth/firebase/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cachedIdToken}`,
    },
    body: JSON.stringify({ idToken: cachedIdToken }),
  }).catch(() => null);
  if (!response || !response.ok) return null;
  const json = (await response.json().catch(() => null)) as
    | { ok?: boolean; data?: { customToken?: string } }
    | null;
  const customToken = json?.data?.customToken;
  if (!customToken) return null;

  const auth = await getFirebase();
  if (!auth) return null;
  try {
    const credential = await signInWithCustomToken(auth, customToken);
    return await credential.user.getIdToken();
  } catch {
    return null;
  }
}

function waitForUser(auth: Auth, timeoutMs = 4000): Promise<User | null> {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });
  });
}

export async function signOut(): Promise<void> {
  const auth = await getFirebase();
  if (auth) await firebaseSignOut(auth);

  // Bridge-flow sign-out: just drop the cached Firebase ID token and let the
  // user re-run the bridge next time. There's no chrome.identity-cached
  // access token to revoke since launchWebAuthFlow doesn't cache one.
  await chrome.storage.local.remove([
    "firebaseIdToken",
    "firebaseUid",
    "firebaseEmail",
    "firebaseDisplayName",
    "firebaseTokenIssuedAt",
  ]);
}

export async function getStoredUser(): Promise<{
  email: string | null;
  name: string | null;
  uid: string | null;
}> {
  const stored = await chrome.storage.local.get([
    "firebaseUid",
    "firebaseEmail",
    "firebaseDisplayName",
  ]);
  return {
    uid: (stored.firebaseUid as string | null) ?? null,
    email: (stored.firebaseEmail as string | null) ?? null,
    name: (stored.firebaseDisplayName as string | null) ?? null,
  };
}

async function getApiUrl(): Promise<string> {
  const stored = await chrome.storage.sync.get(["apiUrl"]);
  return (stored.apiUrl as string | undefined) || "https://hiretuner.com";
}
