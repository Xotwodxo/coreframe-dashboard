import type { MetadataRoute } from "next";

/**
 * The inverse of the marketing site. This is Charlie's private admin system: it
 * is not linked from anywhere public and it must not be indexable. Belt and
 * braces alongside the `noindex, nofollow` in layout.tsx.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
