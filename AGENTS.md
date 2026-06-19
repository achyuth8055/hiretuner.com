<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SEO & AdSense
a
This site runs Google AdSense and depends on organic search. **Before adding or editing any page, route, or content block, follow [`SEO_ADSENSE_CHECKLIST.md`](SEO_ADSENSE_CHECKLIST.md) and ensure every applicable item passes.** Key conventions:

- Every page exports metadata via `pageMetadata({ title, description, path })` from `@/lib/seo` — never a bare metadata object.
- Public indexable pages must be added to `marketingRoutes` in `src/lib/site.ts` (drives `sitemap.ts`).
- Render ads only with `<AdSlot slot="..." />`; never paste raw AdSense tags. Ad gating (yearly/plus = ad-free; free/monthly = ads) lives in `src/lib/ads.ts`.
- Pages carrying ads need substantial original content; never put ads on legal, auth, error, or thin pages.
- In JSX text use HTML entities (`&apos;`, `&quot;`, `&ldquo;`, `&rdquo;`) — ESLint enforces `react/no-unescaped-entities`.

# Performance budget — keep LCP under 2.4s

Largest Contentful Paint on every public page MUST stay **under 2.4s** (lab + field). This is a hard requirement, not a nice-to-have — slow LCP hurts both SEO ranking and ad viewability. Before merging any change to a public page, confirm:

- **Don't make a downloaded image the LCP element.** Prefer text/CSS for above-the-fold hero visuals (the home hero is intentionally CSS/markup only). If a hero image is unavoidable, it must use `next/image` with `priority`, explicit `width`/`height`, a modern format, and be appropriately sized.
- **Above-the-fold content renders without waiting on JS, ad scripts, or fetches.** Ads (`AdSlot`) and any client data fetching must live below the fold; the AdSense script loads `afterInteractive` and only for ad-supported viewers — never move it to `beforeInteractive`.
- **No layout shift (CLS):** reserve space for images/ads, give media explicit dimensions.
- **Keep marketing pages statically rendered** where possible (don't add request-time APIs to a static page just for convenience).
- **Verify after non-trivial UI changes:** run Lighthouse / PageSpeed Insights on the affected route and confirm LCP < 2.4s before merging. See the Performance section of `SEO_ADSENSE_CHECKLIST.md`.
