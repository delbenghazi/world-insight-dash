import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CountryCode,
  FOCUS_COUNTRIES,
  countryColorVar,
  countryProxyInfo,
  countryStats,
  riskColorVar,
  useProjectStore,
} from "@/lib/project-data";

const OFFSET = 16;

export function CountryCard() {
  const { hoveredCountry, projects } = useProjectStore();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const place = (e: MouseEvent | PointerEvent) => {
      const el = cardRef.current;
      if (!el) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const x = e.clientX;
      const y = e.clientY;

      // Horizontal: right half → place left of cursor, left half → right of cursor
      const left =
        x > vw / 2 ? Math.max(8, x - OFFSET - w) : Math.min(vw - w - 8, x + OFFSET);

      // Vertical: bottom third → above cursor, otherwise below
      const top =
        y > (vh * 2) / 3
          ? Math.max(8, y - OFFSET - h)
          : Math.min(vh - h - 8, y + OFFSET);

      el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    };

    window.addEventListener("pointermove", place);
    window.addEventListener("mousemove", place);
    return () => {
      window.removeEventListener("pointermove", place);
      window.removeEventListener("mousemove", place);
    };
  }, [hoveredCountry]);

  return (
    <AnimatePresence>
      {hoveredCountry && (
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed left-0 top-0 z-30 will-change-transform"
        >
          <Card code={hoveredCountry} />
        </motion.div>
      )}
    </AnimatePresence>
  );

  function Card({ code }: { code: CountryCode }) {
    const c = FOCUS_COUNTRIES[code];
    const s = countryStats(projects, code);
    const rc = s.riskCounts;
    const distParts: string[] = [];
    if (rc.High) distParts.push(`${rc.High} High`);
    if (rc.Medium) distParts.push(`${rc.Medium} Medium`);
    if (rc.Low) distParts.push(`${rc.Low} Low`);
    const distribution = distParts.join(" · ") || "—";

    return (
      <div className="w-[300px] rounded-xl p-3.5 panel-strong">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: countryColorVar(code) }}
          />
          <div className="text-sm font-semibold tracking-tight">{c.name}</div>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {code}
          </span>
        </div>

        {/* Compact table */}
        <table className="mt-3 w-full border-collapse text-[12px]">
          <tbody>
            <Row label="GTMI tier" value={s.gtmiTier} />
            <Row
              label="Overall risk"
              value={s.overallRisk}
              valueColor={riskColorVar(s.overallRisk)}
            />
            <Row
              label="Composite score"
              value={`${s.avgScore.toFixed(1)} / 15`}
            />
            <Row label="Projects" value={String(s.count)} />
            <Row label="Risk distribution" value={distribution} mono />
            <Row
              label="Dominant interaction"
              value={s.dominantInteraction}
              last
            />
          </tbody>
        </table>
      </div>
    );
  }
}

function Row({
  label,
  value,
  valueColor,
  mono,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <tr className={last ? "" : "border-b border-border/60"}>
      <td className="py-1.5 pr-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </td>
      <td
        className={`py-1.5 text-right font-semibold ${mono ? "font-mono text-[11px]" : ""}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </td>
    </tr>
  );
}
