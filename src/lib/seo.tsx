import type { Metadata } from "next"
import { siteConfig } from "@/lib/site"

type PageMetaInput = {
  title: string
  description: string
  /** Absolute path beginning with "/", e.g. "/about". Used for the canonical URL. */
  path: string
  keywords?: string[]
  /** Set false for auth/utility pages that should not be indexed. */
  index?: boolean
  ogImage?: string
}

/**
 * Builds a consistent Metadata object for a page: canonical URL, Open Graph,
 * Twitter card, and robots directives. Use this on every marketing page so the
 * SEO checklist stays satisfied automatically.
 */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  index = true,
  ogImage = siteConfig.ogImage,
}: PageMetaInput): Metadata {
  const url = `${siteConfig.url}${path === "/" ? "" : path}`
  const fullTitle = path === "/" ? title : `${title} | ${siteConfig.name}`

  return {
    title: fullTitle,
    description,
    keywords: keywords ?? [...siteConfig.keywords],
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      url,
      siteName: siteConfig.name,
      title: fullTitle,
      description,
      locale: siteConfig.locale,
      images: [{ url: ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  }
}

/** Renders a JSON-LD <script> tag. Use inside server components for structured data. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/** Absolute URL for a site-relative path ("/" maps to the bare origin). */
const absoluteUrl = (path: string) => `${siteConfig.url}${path === "/" ? "" : path}`

const organizationRef = {
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
} as const

/**
 * BreadcrumbList structured data. Pass the trail *after* Home (which is always
 * prepended), e.g. breadcrumbLd([{ name: "ATS Resume Score Checker", path: "/ats-resume-score-checker" }]).
 */
export function breadcrumbLd(crumbs: { name: string; path: string }[]): Record<string, unknown> {
  const items = [{ name: "Home", path: "/" }, ...crumbs]
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/**
 * WebApplication structured data for the free browser tools - no install, free
 * to use. Mirrors the SoftwareApplication markup on the home page.
 */
export function webApplicationLd({
  name,
  description,
  path,
  category = "BusinessApplication",
}: {
  name: string
  description: string
  path: string
  category?: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: absoluteUrl(path),
    applicationCategory: category,
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isAccessibleForFree: true,
    publisher: organizationRef,
  }
}

/** Article structured data for guide / long-form content pages. */
export function articleLd({
  headline,
  description,
  path,
  datePublished,
  dateModified,
}: {
  headline: string
  description: string
  path: string
  datePublished: string
  dateModified?: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: absoluteUrl(path),
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: organizationRef,
    publisher: {
      ...organizationRef,
      logo: { "@type": "ImageObject", url: `${siteConfig.url}${siteConfig.ogImage}` },
    },
  }
}

/**
 * FAQPage structured data. Only use when the same questions and answers are
 * visible on the page - Google requires the markup to match rendered content.
 */
export function faqLd(items: { q: string; a: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }
}

/** Generic WebPage structured data for informational pages (legal, contact, etc.). */
export function webPageLd({
  name,
  description,
  path,
  type = "WebPage",
}: {
  name: string
  description: string
  path: string
  type?: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
  }
}
