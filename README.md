This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


Test path A — full UI flow (recommended):

Sign in to https://hiretuner.com with a verified-email account.
Go to #pricing (homepage scrolled down).
Click Get Starter Monthly (or any plan). You'll be redirected to Stripe Checkout.
Fill the form:

Card: 4242 4242 4242 4242
Expiry: any future date (e.g. 12 / 30)
CVC: any 3 digits (e.g. 123)
ZIP: any (90210)


Click Subscribe.
Stripe sends you back to /dashboard?upgrade=success.
Within ~5 seconds your account flips to planType=starter, status=active. You should see the plan badge update in /dashboard/settings → Subscription.

Other useful test cards (from Stripe's official set):
CardBehavior4242 4242 4242 4242Always succeeds4000 0025 0000 3155Triggers 3-D Secure auth — tests SCA flow4000 0000 0000 9995Declined for insufficient funds4000 0000 0000 0002Generic 