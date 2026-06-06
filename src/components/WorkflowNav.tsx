import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Globe2, LayoutGrid, Sparkles, Plus, ArrowLeft, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type StepKey = "methodology" | "country" | "portfolio" | "advisor" | "add";

interface Step {
  key: StepKey;
  label: string;
  to: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  { key: "methodology", label: "1 · Methodology", to: "/methodology", icon: BookOpen },
  { key: "country", label: "2 · Country", to: "/", icon: Globe2 },
  { key: "portfolio", label: "3 · Compare", to: "/compare", icon: LayoutGrid },
  { key: "advisor", label: "4 · Advisor", to: "/", icon: Sparkles },
  { key: "add", label: "5 · Add project", to: "/add-project", icon: Plus },
];

export function WorkflowNav({ active }: { active?: StepKey }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inferred: StepKey | undefined =
    active ??
    (pathname.startsWith("/methodology")
      ? "methodology"
      : pathname.startsWith("/country")
        ? "portfolio"
        : pathname.startsWith("/compare")
          ? "portfolio"
          : pathname.startsWith("/add-project")
            ? "add"
            : "country");

  return (
    <header className="border-b bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-6 py-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> Atlas
        </Link>
        <nav className="ml-2 flex flex-1 items-center gap-1 overflow-x-auto">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = inferred === s.key;
            return (
              <Link
                key={s.key}
                to={s.to}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={12} />
                {s.label}
              </Link>
            );
          })}
        </nav>
        <Link
          to="/about"
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
            pathname === "/about"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Info size={12} />
          About
        </Link>
      </div>
    </header>
  );
}
