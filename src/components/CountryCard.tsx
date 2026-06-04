import { motion, AnimatePresence } from "framer-motion";
import {
  CountryCode,
  FOCUS_COUNTRIES,
  countryColorVar,
  countryStats,
  riskColorVar,
  useProjectStore,
} from "@/lib/project-data";

export function CountryCard() {
  const { hoveredCountry, projects } = useProjectStore();
  return (
    <AnimatePresence>
      {hoveredCountry && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute left-1/2 top-6 z-30 -translate-x-1/2"
        >
          <Card code={hoveredCountry} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  function Card({ code }: { code: CountryCode }) {
    const c = FOCUS_COUNTRIES[code];
    const s = countryStats(projects, code);
    return (
      <div className="w-[260px] rounded-2xl p-3.5 glass-panel-strong">

        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: countryColorVar(code) }}
          />
          <div className="text-sm font-semibold">{c.name}</div>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {code}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <Stat label="GTMI" value={s.gtmiTier} />
          <Stat
            label="Risk"
            value={s.overallRisk}
            color={riskColorVar(s.overallRisk)}
          />
          <Stat label="Projects" value={String(s.count)} />
          <Stat
            label="Composite"
            value={`${s.avgScore.toFixed(1)}/15`}
          />
        </div>
      </div>
    );
  }
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-md border bg-background/60 p-1.5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className="mt-0.5 text-sm font-semibold"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
