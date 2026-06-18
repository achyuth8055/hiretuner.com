# HireTuner — Production Setup Checklist

Follow this end-to-end to take the app live with real Stripe billing,
Firebase Auth + Firestore + Storage, and the Chrome extension.

## 1. Firebase project

1. Open https://console.firebase.google.com and create a project named
   **HireTuner** (or use an existing one).
2. **Authentication** → Sign-in method → enable **Google**.
   - Add the production domain (`hiretuner.com`) and `localhost` to
     Authorized domains.
3. **Firestore Database** → Create database → production mode.
   - Add a rule that only allows authenticated reads/writes to the user's
     own document (the server uses the Admin SDK and bypasses rules, so
     locking client access down is fine).
4. **Storage** → Get started → production mode.
   - Bucket name will be something like `hiretuner.appspot.com`.
5. **Project Settings → Service accounts → Generate new private key**.
   - You'll get a JSON file. Copy `project_id`, `client_email`, and
     `private_key` into the `FIREBASE_*` env vars (escape newlines as `\n`).
6. **Project Settings → General → Your apps → Add app → Web**.
   - Copy the `apiKey`, `authDomain`, `projectId`, `appId`,
     `storageBucket`, `messagingSenderId` into `NEXT_PUBLIC_FIREBASE_*`.

## 2. Stripe project

1. Dashboard → Developers → API keys → copy secret + publishable keys.
2. Products → create **HireTuner Starter** with two prices:
   - $5.49 / month (recurring) → `STRIPE_STARTER_PRICE_ID`
   - $49.99 / year (recurring) → `STRIPE_STARTER_YEARLY_PRICE_ID`
3. Developers → Webhooks → Add endpoint
   `https://hiretuner.com/api/billing/webhook` listening to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Settings → Customer portal → Activate and configure the products you
   want users to be able to manage.

## 3. Deploy the Next.js app

1. `npm install`
2. Populate `.env` from `.env.example`. Required for live use:
   `AUTH_SECRET`, all `STRIPE_*`, all `FIREBASE_*` (admin), and all
   `NEXT_PUBLIC_FIREBASE_*`.
3. Build & deploy (`npm run build && npm start`, or Vercel / Render).

## 4. Smoke-test the live app

- `/signup` → email/password → lands on dashboard.
- `/login` → "Continue with Google" → Firebase popup → dashboard.
- `/#pricing` → "Upgrade Monthly" → Stripe Checkout opens with the
  monthly price.
- Complete the Stripe test checkout (use `4242 4242 4242 4242`). The
  webhook should mark the subscription `active` and the dashboard usage
  page should report `plan: starter`.
- POST 100 tailored resumes → the 101st should respond `402` with the
  monthly limit message.

## 5. Chrome extension

1. `cd chromeExtension && npm install && npm run build`
2. Create a **Google OAuth Client ID** for the extension:
   - In Google Cloud Console → APIs & Services → Credentials.
   - **Create Credentials → OAuth client ID → Chrome App**.
   - The "Application ID" is your Chrome extension's ID (you'll get it
     after the first `Load unpacked`).
3. Open `chromeExtension/manifest.json` and replace
   `REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com`.
4. Re-run `npm run build`. Reload the extension at `chrome://extensions`.
5. In the extension Settings page (right-click extension → Options),
   paste the Firebase web config + API URL `https://hiretuner.com`.
6. Open the popup → "Sign in with Google" → choose account →
   "Signed in as you@example.com" appears.
7. Run an analysis from a job page. The request should appear in your
   server logs with the authenticated user's ID (instead of anonymous).

## 6. Go-live checks

- [ ] `npm run lint` is clean.
- [ ] `npx tsc --noEmit` is clean.
- [ ] `node scripts/verify-live-limit.mjs` passes (sanity-check of the
       paid-plan cap and yearly checkout switch).
- [ ] DNS `hiretuner.com` → app host.
- [ ] TLS / HTTPS configured (Stripe webhook requires HTTPS).
- [ ] Stripe webhook delivers `200 OK` for the test event in the
       Stripe Dashboard.
- [ ] Firebase Auth shows your test user under Authentication.
- [ ] Firestore `users/{uid}` document gets created the first time a
       Firebase user signs in (`isFirestoreEnabled()` is true).
- [ ] Chrome extension submitted to the Chrome Web Store (icons, store
       listing, privacy policy URL → `https://hiretuner.com/privacy-policy`).

## 7. Operational

- Logs are structured JSON; pipe `stderr` to your log shipper.
- `scripts/verify-live-limit.mjs` and `scripts/verify-limits.mjs` can
  run in CI as fast sanity checks.
- Keep `STRIPE_WEBHOOK_SECRET` in a managed secret store; rotate when
  staff change.
- Firebase Admin private keys: same — never commit, never log.
