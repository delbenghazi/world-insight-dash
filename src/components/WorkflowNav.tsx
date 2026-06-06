import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Map, FileText, GitCompare, Plus, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useProjectStore } from "@/lib/project-data";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  params?: Record<string, string>;
}

export function WorkflowNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const selectedCountry = useProjectStore((s) => s.selectedCountry);
  const countryCode = selectedCountry ?? "GTM";

  const items: NavItem[] = [
    { label: "Home", to: "/", icon: Home, match: (p) => p === "/" },
    { label: "Atlas", to: "/methodology", icon: Map, match: (p) => p.startsWith("/methodology") },
    {
      label: "Country Portfolio",
      to: "/country/$code",
      icon: FileText,
      params: { code: countryCode },
      match: (p) => p.startsWith("/country"),
    },
    { label: "Compare", to: "/compare", icon: GitCompare, match: (p) => p.startsWith("/compare") },
    { label: "Add Project", to: "/add-project", icon: Plus, match: (p) => p.startsWith("/add-project") },
    { label: "About", to: "/about", icon: Info, match: (p) => p.startsWith("/about") },
  ];

  return (
    <header className="border-b bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-6 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          DT Global · EU Global Gateway
        </div>
        <nav className="ml-2 flex flex-1 items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.match(pathname);
            return (
              <Link
                key={item.label}
                to={item.to}
                params={item.params as never}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={12} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
