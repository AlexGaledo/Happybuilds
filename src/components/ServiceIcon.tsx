import { Code2, Globe, LayoutDashboard, Workflow } from "lucide-react";
import type { Service } from "@/lib/site";

const map = {
  Workflow,
  LayoutDashboard,
  Globe,
  Code2,
} as const;

/** Renders the lucide icon for a given service. */
export function ServiceIcon({
  name,
  className,
}: {
  name: Service["icon"];
  className?: string;
}) {
  const Icon = map[name];
  return <Icon className={className} />;
}
