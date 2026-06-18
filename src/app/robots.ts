import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // App + auth surfaces have no SEO value and shouldn't be indexed.
      disallow: ["/api/", "/dashboard", "/editor", "/login", "/signup", "/reset-password"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
