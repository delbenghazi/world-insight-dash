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
  const { hoveredCountry, projects, summaries } = useProjectStore();
  return (
    <AnimatePresence>
      {hoveredCountry && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
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
    const summary = summaries[code]?.summary ?? "";
    return (
      <div className="w-[340px] rounded-lg border bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: countryColorVar(code) }}
          />
          <div className="text-base font-semibold">{c.name}</div>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {code}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3 text-center">
          <Stat label="GTMI" value={s.gtmiTier} />
          <Stat label="Avg score" value={s.avgScore.toFixed(2)} />
          <Stat
            label="Risk"
            value={s.overallRisk}
            color={riskColorVar(s.overallRisk)}
          />
          <Stat label="Projects" value={String(s.count)} />
        </div>
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {summary}
        </p>
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
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-semibold" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
