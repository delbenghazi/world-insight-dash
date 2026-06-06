import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, BookOpen, GitCompare, Globe2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  countriesByRegion,
  countryColorVar,
  FOCUS_COUNTRIES,
  useProjectStore,
} from "@/lib/project-data";

export function LeftPanel() {
  const [open, setOpen] = useState(true);
  const { projects, selectedCountry, setSelectedCountry } = useProjectStore();
  const country = selectedCountry ? FOCUS_COUNTRIES[selectedCountry] : null;
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

          <div className="mt-5 space-y-2">
            <div className="rounded-md border bg-surface px-3 py-2.5">
              <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-[10px]">
                  1
                </span>
                Select a country to explore its portfolio
              </div>
              <div className="mt-1 pl-7 text-[11px] text-muted-foreground">
                Pick from the map or the list below.
              </div>
            </div>
            <Link
              to="/add-project"
              className="group flex items-center justify-between rounded-md border border-dashed border-primary/40 bg-primary-soft px-3 py-2.5 text-sm transition hover:border-primary"
            >
              <span className="flex items-center gap-2 text-[12px] font-medium">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                  2
                </span>
                Add a project to run an assessment
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition group-hover:scale-105">
                <Plus size={14} />
              </span>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCountry ?? "none"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="mt-5 rounded-md border bg-background p-3"
            >
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <Globe2 size={11} /> Active country
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {selectedCountry && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: countryColorVar(selectedCountry) }}
                  />
                )}
                <span className="text-base font-semibold tracking-tight">
                  {country?.name ?? "None — hover the map"}
                </span>
              </div>
              {country && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">{country.region}</div>
              )}
              {selectedCountry && (
                <Link
                  to="/country/$code"
                  params={{ code: selectedCountry }}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
                >
                  Open portfolio →
                </Link>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex-1 space-y-3 overflow-y-auto border-t pt-4">
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
                      onMouseEnter={() => setSelectedCountry(code)}
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

          <div className="mt-auto flex items-center gap-1 border-t pt-3 text-xs text-muted-foreground">
            <Link
              to="/methodology"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-secondary hover:text-foreground"
            >
              <BookOpen size={12} /> Methodology
            </Link>
            <Link
              to="/compare"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-secondary hover:text-foreground"
            >
              <GitCompare size={12} /> Compare
            </Link>
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
