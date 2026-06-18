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
