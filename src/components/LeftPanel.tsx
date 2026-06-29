import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, BookOpen, GitCompare, Map, FileText, Info, Workflow } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  countriesByRegion,
  countryColorVar,
  FOCUS_COUNTRIES,
  useProjectStore,
} from "@/lib/project-data";

export function LeftPanel() {
  const [open, setOpen] = useState(true);
  const { projects, selectedCountry } = useProjectStore();
  const groups = countriesByRegion(projects);

  return (
    <motion.aside
      animate={{ width: open ? 360 : 56 }}
      transition={{ type: "spring", stiffness: 220, damping: 30, mass: 0.9 }}
      className="relative z-20 flex h-full shrink-0 flex-col glass-panel border-r border-y-0 border-l-0 rounded-none"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute -right-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full glass-panel-strong transition hover:scale-110"
        aria-label="Toggle panel"
      >
        {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {open ? (
        <div className="flex h-full flex-col p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            DT Global · EU Global Gateway
          </div>
          <h1 className="mt-2 text-lg font-semibold leading-tight tracking-tight text-foreground">
            GovTech Interaction Tool
          </h1>

          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            Helps advisors assess how parallel digital investments interact within a country —
            and decide what to <span className="text-foreground">sequence</span>,{" "}
            <span className="text-foreground">coordinate</span>, or{" "}
            <span className="text-foreground">flag as risk</span> before commitment.
          </p>

          <div data-tour="countries-list" className="mt-5 space-y-3 overflow-y-auto border-t pt-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Countries in portfolio
            </div>
            {groups.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No countries imported yet. Use “Add a project” above to start.
              </div>
            )}
            {groups.map(({ region, codes }) => (
              <div key={region} className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                  {region}
                </div>
                {codes.map((code) => {
                  const meta = FOCUS_COUNTRIES[code];
                  return (
                    <Link
                      key={code}
                      to="/country/$code"
                      params={{ code }}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:bg-secondary ${
                        selectedCountry === code
                          ? "border-foreground/30 bg-secondary"
                          : "border-transparent"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: countryColorVar(code) }}
                        />
                        {meta?.name ?? code}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-auto border-t pt-3">
            <nav className="flex flex-col gap-0.5">
            {[
                { to: "/methodology", label: "Atlas", icon: Map },
                {
                  to: "/country/$code",
                  label: "Country Portfolio",
                  icon: FileText,
                  params: { code: selectedCountry ?? "GTM" },
                },
                { to: "/portfolio-advisor", label: "Portfolio Advisor", icon: Workflow },
                { to: "/compare", label: "Compare", icon: GitCompare },
                { to: "/add-project", label: "Add Project", icon: Plus, tour: "add-project" },
                { to: "/about", label: "About", icon: Info },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    params={item.params as never}
                    data-tour={(item as any).tour}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    <Icon size={13} />
                    {item.label}
                  </Link>
                );
              })
            </nav>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 pt-16">
          <Link
            to="/add-project"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus size={14} />
          </Link>
          <Link to="/compare" className="text-muted-foreground hover:text-foreground">
            <GitCompare size={16} />
          </Link>
          <Link to="/methodology" className="text-muted-foreground hover:text-foreground">
            <BookOpen size={16} />
          </Link>
        </div>
      )}
    </motion.aside>
  );
}
