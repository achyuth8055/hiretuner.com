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
  GoogleAuthProvider,
  signInWithCredential,
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
 * Read Firebase config from extension settings (chrome.storage.sync) so users
 * can configure it via the Options page without rebuilding the extension.
 *
 * Defaults can be baked in at build time via process.env.FIREBASE_* if you
 * prefer not to ship raw keys in source.
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
    apiKey: stored.firebaseApiKey,
    authDomain: stored.firebaseAuthDomain,
    projectId: stored.firebaseProjectId,
    appId: stored.firebaseAppId,
    storageBucket: stored.firebaseStorageBucket,
    messagingSenderId: stored.firebaseMessagingSenderId,
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

/** Wrapper around chrome.identity.getAuthToken that returns a Promise. */
function getGoogleAccessToken(interactive: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    if (!chrome.identity || !chrome.identity.getAuthToken) {
      resolve(null);
      return;
    }
    chrome.identity.getAuthToken({ interactive }, (token: unknown) => {
      if (chrome.runtime.lastError || !token) {
        resolve(null);
        return;
      }
      if (typeof token === "string") {
        resolve(token);
        return;
      }
      const objToken = token as { token?: string };
      resolve(objToken.token ?? null);
    });
  });
}

/**
 * Start a fresh Google sign-in. Returns the Firebase ID token after a
 * successful exchange with the HireTuner backend.
 */
export async function signInWithGoogle(): Promise<{
  idToken: string;
  user: { email: string | null; name: string | null; uid: string };
} | null> {
  const auth = await getFirebase();
  if (!auth) {
    throw new Error(
      "Firebase isn't configured in extension settings yet. Open Settings to add your project keys.",
    );
  }

  const accessToken = await getGoogleAccessToken(true);
  if (!accessToken) {
    throw new Error("Could not obtain a Google access token from chrome.identity.");
  }

  // Sign into Firebase using the access token from chrome.identity.
  const credential = GoogleAuthProvider.credential(null, accessToken);
  const result = await signInWithCredential(auth, credential);
  const idToken = await result.user.getIdToken();

  // Tell the backend so it can mint a HireTuner session and provision the user.
  const apiUrl = (await getApiUrl()).replace(/\/$/, "");
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
  if (stored.firebaseIdToken && ageMinutes < 50) {
    return stored.firebaseIdToken as string;
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

  // Revoke the cached Google token so the next sign-in shows the chooser.
  const stored = await chrome.storage.local.get(["firebaseIdToken"]);
  if (stored.firebaseIdToken) {
    try {
      const accessToken = await getGoogleAccessToken(false);
      if (accessToken && chrome.identity?.removeCachedAuthToken) {
        await new Promise<void>((resolve) =>
          chrome.identity.removeCachedAuthToken({ token: accessToken }, () => resolve()),
        );
      }
    } catch {
      /* ignore */
    }
  }
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
