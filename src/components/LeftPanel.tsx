import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, BookOpen, GitCompare } from "lucide-react";
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
      animate={{ width: open ? 320 : 56 }}
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
          <div className="uppercase tracking-[0.18em] text-muted-foreground font-mono whitespace-pre-line text-xs font-light text-slate-900">
            {"DT Global - EU Global Gateway \nGovTech interaction tool"}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCountry ?? "none"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="mt-6"
            >
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Region
              </div>
              <div className="mt-1 text-lg font-semibold">
                {country?.region ?? "—"}
              </div>
              <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
                Country
              </div>
              <div className="mt-1 flex items-center gap-2">
                {selectedCountry && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: countryColorVar(selectedCountry) }}
                  />
                )}
                <span className="text-2xl font-semibold tracking-tight">
                  {country?.name ?? "Select on map"}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 space-y-4 overflow-y-auto border-t pt-5">
            {groups.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No countries imported yet.
              </div>
            )}
            {groups.map(({ region, codes }) => (
              <div key={region} className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
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
                      <span className="font-mono text-xs text-muted-foreground">
                        {code}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-2 border-t pt-5">
            <Link
              to="/add-project"
              className="group flex items-center justify-between rounded-md border border-dashed px-3 py-3 text-sm transition hover:border-primary hover:bg-primary-soft bg-[#faf7d6]"
            >
              <span className="font-medium">Add Project</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition group-hover:scale-105">
                <Plus size={14} />
              </span>
            </Link>
            <Link
              to="/compare"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <GitCompare size={14} /> Compare countries
            </Link>
            <Link
              to="/methodology"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <BookOpen size={14} /> Methodology
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
