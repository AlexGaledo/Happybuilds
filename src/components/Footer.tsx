import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/icons/Social";
import { Container } from "@/components/ui/Container";
import { navLinks, services, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto bg-navy-900 text-navy-100">
      <Container className="py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo theme="dark" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-200">
              {site.tagline} We build automations, internal tools, and friendly
              websites for growing businesses.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-navy-300">
              Pages
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-navy-100 transition-colors hover:text-coral-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-navy-300">
              Services
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/services#${s.slug}`}
                    className="text-navy-100 transition-colors hover:text-coral-400"
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-navy-300">
              Get in touch
            </h3>
            <a
              href={`mailto:${site.email}`}
              className="mt-4 inline-flex items-center gap-2 text-sm text-navy-100 transition-colors hover:text-coral-400"
            >
              <Mail size={16} /> {site.email}
            </a>
            <div className="mt-5 flex gap-3">
              <SocialLink href={site.social.github} label="GitHub">
                <GithubIcon className="h-[18px] w-[18px]" />
              </SocialLink>
              <SocialLink href={site.social.linkedin} label="LinkedIn">
                <LinkedinIcon className="h-[18px] w-[18px]" />
              </SocialLink>
              <SocialLink href={site.social.x} label="X">
                <XIcon className="h-[18px] w-[18px]" />
              </SocialLink>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-navy-800 pt-6 text-sm text-navy-300 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.name}. Built happily.
          </p>
          <p>{site.domain}</p>
        </div>
      </Container>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-navy-100 transition-colors hover:bg-coral-500 hover:text-white"
    >
      {children}
    </a>
  );
}
