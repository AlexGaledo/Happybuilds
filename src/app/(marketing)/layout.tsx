import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema } from "@/lib/structuredData";

/**
 * Public marketing chrome: navbar, footer, smooth scroll, motion config.
 *
 * The Organization JSON-LD lives here rather than in the root layout so it
 * covers every public page and no dashboard page — the console is behind basic
 * auth and has nothing to say to a crawler.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <MotionProvider>
      <SmoothScroll>
        <JsonLd data={organizationSchema()} />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </SmoothScroll>
    </MotionProvider>
  );
}
