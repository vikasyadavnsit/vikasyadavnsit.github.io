import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/blogs/admin", "/blogs/admin/editor"],
    },
    sitemap: "https://vikasyadavnsit.github.io/sitemap.xml",
  };
}
