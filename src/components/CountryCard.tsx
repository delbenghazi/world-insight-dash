import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CountryCode,
  FOCUS_COUNTRIES,
  countryColorVar,
  countryStats,
  riskColorVar,
  useProjectStore,
} from "@/lib/project-data";

const OFFSET = 14;
const EDGE_PAD = 8;

export function CountryCard() {
  const { hoveredCountry, projects } = useProjectStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useLayoutEffect(() => {
    if (!hoveredCountry || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { x, y } = mousePos;
    const w = rect.width;
    const h = rect.height;

    let left: number;
    let top: number;

    // Priority: above -> right -> left
    if (y - OFFSET - h >= EDGE_PAD) {
      top = y - OFFSET - h;
      left = Math.min(Math.max(x - w / 2, EDGE_PAD), vw - w - EDGE_PAD);
    } else if (x + OFFSET + w <= vw - EDGE_PAD) {
      left = x + OFFSET;
      top = Math.min(Math.max(y - h / 2, EDGE_PAD), vh - h - EDGE_PAD);
    } else {
      left = Math.max(x - OFFSET - w, EDGE_PAD);
      top = Math.min(Math.max(y - h / 2, EDGE_PAD), vh - h - EDGE_PAD);
    }

    setPos({ left, top });
  }, [mousePos, hoveredCountry]);

  return (
    <AnimatePresence>
      {hoveredCountry && (
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed z-30"
          style={{
            left: pos?.left ?? mousePos.x + OFFSET,
            top: pos?.top ?? mousePos.y + OFFSET,
            visibility: pos ? "visible" : "hidden",
          }}
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
