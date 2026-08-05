/** Central site config + marketing content (placeholder copy, edit freely). */

export const site = {
  name: "Fickles",
  domain: "fickles.tech",
  url: "https://fickles.tech",
  tagline: "Software that makes work feel lighter.",
  description:
    "Fickles designs and ships digital and technical solutions — automations, internal tools, and friendly websites — for businesses that want to move faster without the headache.",
  email: "hello@fickles.tech",
  social: {
    github: "https://github.com/fickles",
    linkedin: "https://www.linkedin.com/company/fickles",
    x: "https://x.com/fickles",
  },
} as const;

export const navLinks = [
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
] as const;

export interface Service {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  icon: "Workflow" | "LayoutDashboard" | "Globe" | "Code2";
  features: string[];
}

export const services: Service[] = [
  {
    slug: "automation",
    title: "Task Automation",
    tagline: "Stop doing the boring parts by hand.",
    description:
      "We connect your tools and scripts so repetitive work runs itself — reports, data entry, sync between apps, and notifications.",
    icon: "Workflow",
    features: [
      "Workflow & integration automation",
      "Scheduled reports & data pipelines",
      "App-to-app sync (CRM, sheets, email)",
      "AI-assisted document processing",
    ],
  },
  {
    slug: "internal-tools",
    title: "Internal Tools",
    tagline: "Dashboards your team actually likes using.",
    description:
      "Custom internal apps and dashboards tailored to how your team really works — no more wrestling with spreadsheets.",
    icon: "LayoutDashboard",
    features: [
      "Admin panels & dashboards",
      "Inventory, intake & ops tools",
      "Role-based access & auth",
      "Reporting & analytics views",
    ],
  },
  {
    slug: "websites",
    title: "Websites & Landing Pages",
    tagline: "A friendly first impression that converts.",
    description:
      "Fast, beautiful marketing sites and landing pages that look great on every device and turn visitors into customers.",
    icon: "Globe",
    features: [
      "Marketing sites & landing pages",
      "SEO & performance baked in",
      "CMS so you can edit yourself",
      "Lead capture & analytics",
    ],
  },
  {
    slug: "custom-software",
    title: "Custom Software",
    tagline: "When off-the-shelf just won't cut it.",
    description:
      "End-to-end product development — web apps, APIs, and integrations built to fit your business exactly.",
    icon: "Code2",
    features: [
      "Full-stack web applications",
      "APIs & system integrations",
      "Cloud deployment & maintenance",
      "MVPs for new ideas",
    ],
  },
];

export interface CaseStudy {
  slug: string;
  client: string;
  title: string;
  summary: string;
  category: string;
  year: string;
  accent: "coral" | "amber" | "mint" | "navy";
  metrics: { label: string; value: string }[];
  challenge: string;
  solution: string;
  result: string;
  stack: string[];
}

/**
 * Empty until the first client build ships.
 *
 * Both the home page and /portfolio read this array and switch to an honest
 * "first slot is open" state while it is empty, so landing the first real
 * entry here is all it takes to turn those surfaces back on.
 */
export const caseStudies: CaseStudy[] = [];

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

/**
 * Empty until a real client says something on the record.
 *
 * <Testimonials /> renders nothing at all while this is empty rather than
 * showing filler: invented quotes attributed to invented people are the one
 * thing on a marketing page that is worth nothing and costs everything.
 */
export const testimonials: Testimonial[] = [];

export interface Step {
  title: string;
  description: string;
}

export const process: Step[] = [
  {
    title: "Discover",
    description:
      "We listen first — understanding your goals, your team, and where the friction really is.",
  },
  {
    title: "Design",
    description:
      "We map a simple plan and shape the solution, sharing prototypes early and often.",
  },
  {
    title: "Build",
    description:
      "We ship in small, visible steps so you always know where things stand.",
  },
  {
    title: "Support",
    description:
      "We stick around — improving, maintaining, and growing what we built together.",
  },
];

export const values = [
  {
    title: "Friendly by default",
    description:
      "Clear communication, no jargon, and software that's genuinely nice to use.",
  },
  {
    title: "Built to last",
    description:
      "Modern, well-tested code on stacks we trust — so it keeps working after launch.",
  },
  {
    title: "Right-sized",
    description:
      "We solve the problem in front of you, not an imaginary one. No over-engineering.",
  },
  {
    title: "Honest & transparent",
    description:
      "Straight timelines, fair pricing, and visible progress every step of the way.",
  },
];
