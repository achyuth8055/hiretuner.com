import type { MetadataRoute } from "next"
import { marketingRoutes, siteConfig } from "@/lib/site"
import { blogPosts } from "@/lib/blog"
import { salaryGuides } from "@/lib/salary-guides"

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const staticRoutes: MetadataRoute.Sitemap = marketingRoutes.map((route) => ({
    url: `${siteConfig.url}${route.path === "/" ? "" : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  // Dynamic routes: each blog post and each salary guide gets its own URL.
  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  const salaryRoutes: MetadataRoute.Sitemap = salaryGuides.map((guide) => ({
    url: `${siteConfig.url}/salary-guide/${guide.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }))

  return [...staticRoutes, ...blogRoutes, ...salaryRoutes]
}
