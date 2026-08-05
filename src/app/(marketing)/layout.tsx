import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { Atmosphere } from "@/components/Atmosphere";
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
        {/* Ambient colour behind everything, then the page on top of it. The
            dotted texture rides the content wrapper rather than the fixed
            layer so it scrolls with the page and runs its full height —
            continuous, instead of restarting at every section boundary. */}
        <Atmosphere />
        <div className="relative z-10 flex min-h-screen flex-col bg-dotted">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </SmoothScroll>
    </MotionProvider>
  );
}
