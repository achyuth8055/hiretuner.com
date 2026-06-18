# Railway Production Environment Variables

Paste these into Railway → your service → **Variables** tab. Railway will redeploy
automatically when you save. Mark all of them as Production-scope unless you've
already created separate Stripe/Firebase projects per environment.

---

## ✅ Ready to paste as-is

```
NEXT_PUBLIC_APP_URL=https://hiretuner.com
AUTH_SECRET=Ozrg_pLeY50LRWrPVhgxWck0CnfTSAr4t6u4-eyQenQkE_8MrFAS2kmjsYryjrZV

NODE_ENV=production

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBHdWzqTPJnuhgmn7YQNNNEVFuwA3SrGgg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=hiretuner.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=hiretuner
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=hiretuner.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=202383803048
NEXT_PUBLIC_FIREBASE_APP_ID=1:202383803048:web:072740ec6de57d6f64789d
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-TQQNLW6KNC


FIREBASE_PROJECT_ID=hiretuner
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@hiretuner.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=hiretuner.firebasestorage.app
```

### FIREBASE_PRIVATE_KEY (multiline — see notes below)

The value is the **entire BEGIN/END PRIVATE KEY block** from the service-account JSON.
Two options for Railway:

- **Easiest:** in the Railway variable editor, paste it as **multiline** (Railway has a
  "Raw editor" toggle on the Variables tab). Copy the value from the JSON exactly,
  including the actual newlines.
- **Alternative:** paste it as a single line with literal `\n` between rows and wrap
  in double quotes. The code already handles `\n` un-escaping
  (`firebase-admin.ts → getServiceAccount`).

Your value (single-line form, already in `.env` locally — copy/paste into Railway):

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[your 1700-char key from
hiretuner-firebase-adminsdk-fbsvc-e6f54b4798.json]\n-----END PRIVATE KEY-----\n"
```

> ⚠️ I won't paste your actual key into this Markdown file. Copy it from your
> local `.env` line `FIREBASE_PRIVATE_KEY=...` — it's already there.

---

## ⏳ Fill in from Stripe Dashboard

Get these from https://dashboard.stripe.com/test/apikeys (test mode) or
https://dashboard.stripe.com/apikeys (live mode):

```
STRIPE_SECRET_KEY=sk_test_REPLACE_OR_sk_live_REPLACE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_OR_pk_live_REPLACE
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_AFTER_CREATING_WEBHOOK_ENDPOINT
STRIPE_STARTER_PRICE_ID=price_REPLACE_MONTHLY
STRIPE_STARTER_YEARLY_PRICE_ID=price_REPLACE_YEARLY
```

**To create the price IDs:**

1. Stripe Dashboard → **Products → + Add product**.
2. Name: `HireTuner Starter`. Description: "100 tailored resumes / month."
3. Add a price: **$5.49 / month**, recurring. Save → copy the `price_...` ID into
   `STRIPE_STARTER_PRICE_ID`.
4. On the same product, add a second price: **$54.99 / year**, recurring. Copy that
   `price_...` ID into `STRIPE_STARTER_YEARLY_PRICE_ID`.

**To create the webhook (after deploying):**

1. Stripe Dashboard → **Developers → Webhooks → + Add endpoint**.
2. URL: `https://hiretuner.com/api/billing/webhook`
3. Events to send: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
4. Save → reveal **Signing secret** → copy into `STRIPE_WEBHOOK_SECRET`.

---

## ⏳ Optional (only if you wire them up)

```
# OpenAI (only needed if you replace the local resume engine with OpenAI calls)
OPENAI_API_KEY=sk-REPLACE
OPENAI_MODEL=gpt-4.1-mini

# Email provider (for password-reset emails — currently dev-only logs the token)
EMAIL_FROM=support@hiretuner.com
EMAIL_PROVIDER_API_KEY=REPLACE
```

---

## After saving env vars on Railway

1. Railway auto-redeploys. Wait ~1 min, then refresh `https://hiretuner.com`.
2. Add Firebase Authorized Domains:
   - Firebase Console → Authentication → Settings → **Authorized domains** → Add
     `hiretuner.com`. Without this, the production Google sign-in popup will fail
     with `auth/unauthorized-domain`.
3. Test once: visit https://hiretuner.com/login → "Continue with Google" should
   open the Firebase popup and land you on `/dashboard`.
4. Test Stripe once: https://hiretuner.com/#pricing → "Upgrade Monthly" → Stripe
   Checkout opens → pay with test card `4242 4242 4242 4242` any future date /
   any CVC. Webhook should flip your subscription to `starter` within seconds.
5. Verify the webhook log in Stripe Dashboard → Developers → Webhooks → your
   endpoint → "Recent deliveries" → all events show `200 OK`.

---

## Outstanding work I couldn't do for you

- **Push latest commits to GitHub**: I rebuilt the Chrome extension and updated
  the LinkedIn DOM selectors in `chromeExtension/src/content/content.ts` plus
  added `src/app/icon.svg`, `src/app/apple-icon.svg`, regenerated
  `src/app/favicon.ico` from the new mark. These need a `git add . && git commit
  -m "fix(ext): refresh LinkedIn selectors + favicon" && git push` to redeploy.
- **Stripe key entry**: blocked by the MCP financial-site safety rule. You'll
  copy/paste from your Stripe Dashboard.
- **Firebase Storage**: requires upgrading Firebase project to Blaze. Skipped.
- **Delete the service-account JSON locally**: my sandbox can't `rm` it. Run
  `rm "/Users/achyuth/Documents/Website Ideas/makemyresume/hiretuner-firebase-adminsdk-fbsvc-e6f54b4798.json"`.
- **Rotate the Firebase private key**: it leaked into the conversation log via
  the system reminder mechanism. After everything is working, generate a new
  service-account key in Firebase Console and delete the old one.
