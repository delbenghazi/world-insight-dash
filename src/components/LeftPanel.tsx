import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, BookOpen, GitCompare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FOCUS_COUNTRIES, useProjectStore, countryColorVar } from "@/lib/project-data";

export function LeftPanel() {
  const [open, setOpen] = useState(true);
  const { selectedCountry, setSelectedCountry } = useProjectStore();
  const country = selectedCountry ? FOCUS_COUNTRIES[selectedCountry] : null;

  return (
    <motion.aside
      animate={{ width: open ? 320 : 56 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="relative z-20 flex h-full shrink-0 flex-col border-r bg-surface"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute -right-3 top-6 z-30 flex h-6 w-6 items-center justify-center rounded-full border bg-surface shadow-sm hover:bg-secondary"
        aria-label="Toggle panel"
      >
        {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {open ? (
        <div className="flex h-full flex-col p-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            DPI Sequencing Atlas
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

          <div className="mt-6 space-y-2 border-t pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Focus countries
            </div>
            {(Object.keys(FOCUS_COUNTRIES) as Array<keyof typeof FOCUS_COUNTRIES>).map(
              (code) => (
                <button
                  key={code}
                  onClick={() => setSelectedCountry(code)}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:bg-secondary ${
                    selectedCountry === code ? "border-foreground/30 bg-secondary" : "border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: countryColorVar(code) }}
                    />
                    {FOCUS_COUNTRIES[code].name}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{code}</span>
                </button>
              )
            )}
          </div>

          <div className="mt-auto space-y-2 border-t pt-5">
            <Link
              to="/add-project"
              className="group flex items-center justify-between rounded-md border border-dashed px-3 py-3 text-sm transition hover:border-primary hover:bg-primary-soft"
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
