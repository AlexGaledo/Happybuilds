import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  // No `keywords`: Google stopped reading the meta keywords tag in 2009 and
  // nothing else consumes it. Canonicals are set per route rather than here —
  // a canonical on the root layout is inherited by every page that does not
  // override it, which would point the whole site at "/".
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/brand/apple-icon.png",
  },
};

/**
 * Root layout owns only the document shell: fonts, base colours, metadata.
 *
 * Chrome lives in the route groups — `(marketing)` adds the public navbar,
 * footer and Lenis smooth scrolling; `(dashboard)` adds the app sidebar and
 * deliberately skips smooth scroll, which fights with a sticky table header.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
