import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coreframe Admin",
  description: "Private admin system for Coreframe Digital.",
  // Private tool. Not linked publicly, and must never be indexed.
  robots: { index: false, follow: false, nocache: true },
  // Home screen install on iOS: standalone, named, navy status bar.
  appleWebApp: {
    capable: true,
    title: "Coreframe Admin",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a2332",
  // No maximum-scale: pinch-zoom must keep working.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
