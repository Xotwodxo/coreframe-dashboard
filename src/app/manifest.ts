import type { MetadataRoute } from "next";

/**
 * Lets the admin be added to a phone's home screen as a standalone app: its
 * own icon, no browser chrome, navy behind the status bar. The icon files
 * beside this one (icon.png, apple-icon.png) are picked up by Next by name.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Coreframe Admin",
    short_name: "Coreframe",
    description: "Private admin system for Coreframe Digital.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a2332",
    theme_color: "#1a2332",
    icons: [
      { src: "/apple-icon.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
