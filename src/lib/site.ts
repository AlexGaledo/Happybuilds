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

export const caseStudies: CaseStudy[] = [
  {
    slug: "logiflow-shipment-automation",
    client: "LogiFlow Logistics",
    title: "Automating the daily shipment report",
    summary:
      "Turned a 2-hour manual spreadsheet ritual into a one-click, scheduled report.",
    category: "Automation",
    year: "2026",
    accent: "coral",
    metrics: [
      { label: "Time saved / week", value: "10 hrs" },
      { label: "Manual errors", value: "−98%" },
      { label: "Setup time", value: "3 wks" },
    ],
    challenge:
      "Ops staff stitched together five spreadsheets every morning to produce a shipment summary — slow, error-prone, and dreaded.",
    solution:
      "We built a pipeline that pulls from their carrier APIs and warehouse DB, validates the data, and emails a formatted report on a schedule.",
    result:
      "The report now runs itself before the team logs in, freeing roughly ten hours a week and eliminating copy-paste mistakes.",
    stack: ["Python", "FastAPI", "Supabase", "Cron"],
  },
  {
    slug: "northwind-intake-dashboard",
    client: "Northwind Clinic",
    title: "A calmer patient-intake dashboard",
    summary:
      "Replaced paper forms and a clunky tool with a friendly staff dashboard.",
    category: "Internal tool",
    year: "2026",
    accent: "mint",
    metrics: [
      { label: "Intake time", value: "−40%" },
      { label: "Staff onboarding", value: "1 day" },
      { label: "Satisfaction", value: "4.8/5" },
    ],
    challenge:
      "Front-desk staff juggled paper forms and a confusing legacy system, creating long wait times and data gaps.",
    solution:
      "A clean, role-based intake dashboard with validation, search, and printable summaries — designed around the staff's real workflow.",
    result:
      "Intake is now 40% faster and new staff are productive on day one.",
    stack: ["Next.js", "TypeScript", "Supabase", "Tailwind"],
  },
  {
    slug: "brightcafe-landing-page",
    client: "Bright Cafe",
    title: "A landing page that fills tables",
    summary:
      "A warm, fast landing page with online reservations baked in.",
    category: "Website",
    year: "2026",
    accent: "amber",
    metrics: [
      { label: "Reservations", value: "+62%" },
      { label: "Lighthouse", value: "99" },
      { label: "Launch", value: "2 wks" },
    ],
    challenge:
      "A beloved local cafe had no web presence and lost bookings to competitors with online reservations.",
    solution:
      "A cheerful, mobile-first landing page with menu highlights and an embedded reservation flow — easy for the owner to update.",
    result:
      "Online reservations climbed 62% in the first two months after launch.",
    stack: ["Next.js", "Tailwind", "Motion"],
  },
  {
    slug: "acme-ops-platform",
    client: "Acme Tools",
    title: "An ops platform for a growing team",
    summary:
      "A custom web app replacing a tangle of spreadsheets and apps.",
    category: "Custom software",
    year: "2025",
    accent: "navy",
    metrics: [
      { label: "Tools replaced", value: "6" },
      { label: "Adoption", value: "100%" },
      { label: "Phase 1", value: "8 wks" },
    ],
    challenge:
      "Rapid growth left Acme's operations spread across six disconnected tools, with no single source of truth.",
    solution:
      "A unified operations platform with inventory, orders, and reporting — built to grow with them and integrate their existing stack.",
    result:
      "The whole team moved onto one tool, with clean data and room to scale.",
    stack: ["Next.js", "FastAPI", "PostgreSQL", "Supabase"],
  },
];

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "Fickles took something we dreaded every morning and just… made it disappear. The team is sharp and genuinely pleasant to work with.",
    name: "Devon Lee",
    role: "Operations Lead, LogiFlow",
  },
  {
    quote:
      "Our new dashboard feels like it was made for us — because it was. Onboarding new staff went from a week to an afternoon.",
    name: "Aisha Khan",
    role: "Clinic Manager, Northwind",
  },
  {
    quote:
      "Fast, friendly, and the site looks fantastic. Reservations are up and I can update it myself.",
    name: "Maria Santos",
    role: "Owner, Bright Cafe",
  },
];

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
