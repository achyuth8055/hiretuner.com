# SEO & AdSense Compliance Checklist

**Run this checklist every time you add or change a page, route, or significant content block.**
Nothing ships unless every applicable box passes. This protects our Google Search ranking
and keeps us inside Google AdSense program policies (a single violation can demote the whole site).

How the pieces fit together:
- SEO metadata is centralized in [`src/lib/seo.tsx`](src/lib/seo.tsx) (`pageMetadata`, `JsonLd`) and [`src/lib/site.ts`](src/lib/site.ts) (`siteConfig`, `marketingRoutes`).
- Sitemap = [`src/app/sitemap.ts`](src/app/sitemap.ts) (driven by `marketingRoutes`). Robots = [`src/app/robots.ts`](src/app/robots.ts).
- Ads are gated in [`src/lib/ads.ts`](src/lib/ads.ts) (`isAdFree`, `ADSENSE_CLIENT_ID`, `AD_SLOTS`) and rendered via
  [`src/components/ads/AdsProvider.tsx`](src/components/ads/AdsProvider.tsx) + [`src/components/ads/AdSlot.tsx`](src/components/ads/AdSlot.tsx).
- Seller declaration = [`public/ads.txt`](public/ads.txt).

---

## A. Every new/edited page — SEO

- [ ] **Metadata via helper.** Page exports `export const metadata = pageMetadata({ title, description, path })` from `@/lib/seo`. Never hand-roll a bare `{ title, description }` object (it loses canonical/OG/Twitter).
- [ ] **Unique title** ~50–60 chars. Do **not** append `| RoleFit Resume` yourself — `pageMetadata` does it for non-home paths.
- [ ] **Unique description** ~150–160 chars, natural language, describes the page, includes a relevant keyword.
- [ ] **Correct `path`** matches the real route (drives the canonical URL).
- [ ] **Canonical is correct** (one canonical per URL; no duplicate-content pages competing).
- [ ] **Indexability set intentionally.** Content/tool pages: indexable (default). Auth/utility/thank-you/duplicate pages (`/login`, `/signup`, `/reset-password`, dashboards): `index: false`.
- [ ] **Added to `marketingRoutes`** in `src/lib/site.ts` if it is a public, indexable page (so it appears in the sitemap). Do **not** add noindex/app routes.
- [ ] **Robots updated** in `src/app/robots.ts` if a new private/app path family was introduced (add to `disallow`).
- [ ] **One `<h1>` per page**, then a logical `<h2>`/`<h3>` outline. No skipped heading levels.
- [ ] **Descriptive internal links** (anchor text says where it goes; no naked "click here").
- [ ] **All `<Image>`/`<img>` have meaningful `alt` text.**
- [ ] **Structured data (JSON-LD)** added where it fits using the `JsonLd` component: `FAQPage` for FAQs, `Article`/`BlogPosting` for posts, `BreadcrumbList` for nested pages, `Product`/`SoftwareApplication`/`Offer` for pricing. Validate at https://search.google.com/test/rich-results.
- [ ] **No broken links** (including in-page anchors like `/#faq`, `/#pricing`, `/#product`).
- [ ] **Mobile responsive** (we are mobile-first; verify at 360px width).

## B. Every new/edited page — content quality (AdSense gate)

> AdSense rejects "thin", low-value, or scraped content. Pages carrying ads must stand on their own.

- [ ] **Substantial original content** — real, useful prose (rule of thumb: 500+ words for content pages). No placeholder/Lorem ipsum, no near-duplicate pages.
- [ ] **Genuinely useful** to a visitor independent of the ads.
- [ ] **No prohibited content** — nothing adult, violent, hateful, dangerous, deceptive, IP-infringing, or misrepresentative (Google AdSense Program Policies).
- [ ] **Claims are honest** — match-score/ATS language stays "estimated", never "guaranteed interviews". Reuse the disclaimer constants in `src/lib/rolefit-types.ts`.
- [ ] **No incentive to click ads** and no language like "support us by clicking ads".

## C. When adding ads to a page

- [ ] **Use `<AdSlot slot="..." />`** only — never paste raw AdSense `<ins>`/script tags. The provider handles loading + ad-free gating.
- [ ] **Ads only on content-rich pages.** ❌ Never on: error pages, `404`, login/signup, thank-you/confirmation, empty states, or pages that are mostly a form/tool with little text. ❌ Never on legal pages (privacy/terms/cookie) by policy convention here.
- [ ] **Page has more content than ads** (content-to-ad ratio well above 1; don't stack ads).
- [ ] **Ads are clearly labeled** — `AdSlot` renders an "Advertisement" label; keep it.
- [ ] **No ads in modals, popups, floating/sticky bars, or on top of content** (no accidental clicks).
- [ ] **Ad-free tiers respected.** Confirm `isAdFree` logic still holds: yearly + `plus` = ad-free; free + monthly = ads. `AdSlot` renders nothing for ad-free users — verify you didn't bypass it.
- [ ] **New named slot?** Add it to `AD_SLOTS` in `src/lib/ads.ts` and to `.env.example`, then create the unit in the AdSense dashboard.

## D. Site-wide AdSense prerequisites (verify before going live / on each release)

- [ ] **`NEXT_PUBLIC_ADSENSE_CLIENT_ID` set** in the production environment (empty = ads fully disabled, which is the safe default).
- [ ] **`public/ads.txt` contains the real publisher ID** (replace `pub-0000000000000000`). Reachable at `https://<domain>/ads.txt`.
- [ ] **Privacy Policy is complete and linked in the footer**, and discloses: third-party/Google cookies, the DART cookie, personalized-ads opt-out (https://www.google.com/settings/ads, https://www.aboutads.info), and that annual/Plus users are ad-free. See `/privacy-policy`.
- [ ] **Cookie Policy** lists advertising cookies and how to disable them. See `/cookie-policy`.
- [ ] **Consent / CMP** — if serving EEA/UK/CH users, a Google-certified consent management platform is wired up for GDPR/ePrivacy consent before personalized ads load. (TODO when traffic includes those regions.)
- [ ] **The AdSense verification snippet** (or `ads.txt` + auto-ads) is in place per the dashboard's site-approval flow.

## D2. Performance — keep LCP under 2.4s (hard requirement)

> Slow LCP hurts search ranking AND ad viewability. Every public page must keep **Largest Contentful Paint under 2.4s**.

- [ ] **LCP element is not a slow download.** Above-the-fold hero visuals should be text/CSS where practical (the home hero is CSS/markup only — no hero image). The big headline is the intended LCP element.
- [ ] **Any unavoidable hero/above-fold image** uses `next/image` with `priority`, explicit `width`/`height`, modern format, and is sized to its display box (no shipping a 2000px image into a 600px slot).
- [ ] **Ads load below the fold and after interactive.** Never place an `AdSlot` above the fold; never switch the AdSense script to `beforeInteractive`. It already loads `afterInteractive` and only for ad-supported viewers.
- [ ] **No CLS:** images/ads have reserved space and explicit dimensions; fonts use `display=swap` (already set for Material Symbols).
- [ ] **Page stays statically rendered** unless it genuinely needs request-time data.
- [ ] **Verified with Lighthouse / PageSpeed Insights** on the affected route after any non-trivial UI change — LCP < 2.4s, CLS < 0.1.

## E. Pre-merge verification (run locally)

- [ ] `npm run build` succeeds (catches metadata/type/route errors).
- [ ] `npm run lint` is clean (note: `react/no-unescaped-entities` — use `&apos;`, `&quot;`, `&ldquo;`, `&rdquo;` in JSX text, never raw `'`/`"`).
- [ ] `/sitemap.xml` and `/robots.txt` render and include the new page (or correctly exclude it).
- [ ] New public page appears once in the sitemap with the right priority/changefreq.
- [ ] Validate JSON-LD (Rich Results Test) and metadata (social card preview) for the new page.

---

### Quick reference — files to touch when adding a public content page
1. Create `src/app/(marketing)/<route>/page.tsx` with `pageMetadata({...})` + real content.
2. Add the route to `marketingRoutes` in `src/lib/site.ts`.
3. (If it should carry ads) drop `<AdSlot slot="content" />` in a content gap.
4. Add appropriate `JsonLd` structured data.
5. Run section **E** before opening the PR.
