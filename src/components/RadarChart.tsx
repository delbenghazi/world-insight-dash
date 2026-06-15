import { useId, useState } from "react";

export interface RadarDimension {
  abbr: string;
  label: string;
  score: number;
  note?: string;
}

export interface RadarSeries {
  id: string;
  values: number[];
}

export interface RadarColor {
  id: string;
  stroke: string;
  fill: string;
  /** SVG stroke-dasharray, e.g. "0" solid, "6 4" dashed, "2 3" dotted. */
  dash: string;
}

export interface RadarChartProps {
  dimensions: RadarDimension[];
  series: RadarSeries[];
  colors: RadarColor[];
  size?: number;
  max?: number;
  showLegend?: boolean;
}

/**
 * Pure-SVG radar chart. No external deps.
 * - White background, light-gray concentric polygons at 1/2/3.
 * - Polygon fill at ~35% opacity (passed via colors[].fill).
 * - Plotted points with score label next to each point.
 * - Tooltip on hover showing dimension name + score + rationale (single-series only).
 * - Multi-series overlay supported with distinct dash styles + optional legend.
 */
export function RadarChart({
  dimensions,
  series,
  colors,
  size = 240,
  max = 3,
  showLegend = false,
}: RadarChartProps) {
  const titleId = useId();
  const [hover, setHover] = useState<{
    dimIdx: number;
    seriesId: string;
    x: number;
    y: number;
  } | null>(null);

  const n = dimensions.length;
  const padding = 48;
  const radius = (size - padding * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Angle for axis i — start at top (-90°), go clockwise.
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, value: number) => {
    const r = (Math.max(0, Math.min(value, max)) / max) * radius;
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const;
  };

  const axisEnds = dimensions.map((_, i) => point(i, max));
  const gridRings = Array.from({ length: max }, (_, k) => k + 1).map((level) =>
    dimensions.map((_, i) => point(i, level).join(",")).join(" "),
  );

  const colorFor = (id: string) =>
    colors.find((c) => c.id === id) ?? {
      id,
      stroke: "var(--foreground)",
      fill: "color-mix(in oklab, var(--foreground) 25%, transparent)",
      dash: "0",
    };

  const singleSeries = series.length === 1;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-labelledby={titleId}
        className="overflow-visible"
      >
        <title id={titleId}>
          Radar of five dimension scores (0–{max})
        </title>

        {/* Grid rings */}
        {gridRings.map((pts, idx) => (
          <polygon
            key={idx}
            points={pts}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
            opacity={0.7}
          />
        ))}

        {/* Axis lines */}
        {axisEnds.map(([x, y], i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeWidth={1}
            opacity={0.7}
          />
        ))}

        {/* Axis labels (abbr) */}
        {dimensions.map((d, i) => {
          const [x, y] = point(i, max);
          const dx = x - cx;
          const dy = y - cy;
          const lx = cx + dx * 1.16;
          const ly = cy + dy * 1.16;
          return (
            <text
              key={d.abbr}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground font-mono"
              style={{ fontSize: 10, letterSpacing: "0.06em" }}
            >
              <title>{d.label}</title>
              {d.abbr}
            </text>
          );
        })}

        {/* Series polygons */}
        {series.map((s) => {
          const c = colorFor(s.id);
          const pts = s.values
            .map((v, i) => point(i, v).join(","))
            .join(" ");
          return (
            <polygon
              key={s.id}
              points={pts}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={1.5}
              strokeDasharray={c.dash}
              strokeLinejoin="round"
            />
          );
        })}

        {/* Plotted points + score labels */}
        {series.map((s) => {
          const c = colorFor(s.id);
          return s.values.map((v, i) => {
            const [x, y] = point(i, v);
            // Offset label outward along the axis.
            const dx = x - cx;
            const dy = y - cy;
            const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const ox = x + (dx / len) * 10;
            const oy = y + (dy / len) * 10;
            return (
              <g key={`${s.id}-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill={c.stroke}
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() =>
                    setHover({ dimIdx: i, seriesId: s.id, x, y })
                  }
                  onMouseLeave={() => setHover(null)}
                />
                {singleSeries && (
                  <text
                    x={ox}
                    y={oy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground font-mono"
                    style={{ fontSize: 10, fontWeight: 600, pointerEvents: "none" }}
                  >
                    {v}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* Tooltip */}
        {hover &&
          (() => {
            const dim = dimensions[hover.dimIdx];
            if (!dim) return null;
            const s = series.find((x) => x.id === hover.seriesId);
            if (!s) return null;
            const v = s.values[hover.dimIdx];
            const lines = [
              `${dim.label} — ${v}/${max}`,
              ...(dim.note ? wrapText(dim.note, 36) : []),
            ];
            const w = Math.min(
              220,
              Math.max(120, Math.max(...lines.map((l) => l.length)) * 5.4),
            );
            const h = 16 + lines.length * 12;
            const tx = Math.min(size - w - 4, Math.max(4, hover.x + 8));
            const ty = Math.max(4, hover.y - h - 8);
            return (
              <g pointerEvents="none">
                <rect
                  x={tx}
                  y={ty}
                  width={w}
                  height={h}
                  rx={6}
                  fill="var(--surface)"
                  stroke="var(--border)"
                />
                {lines.map((line, idx) => (
                  <text
                    key={idx}
                    x={tx + 8}
                    y={ty + 14 + idx * 12}
                    className={
                      idx === 0
                        ? "fill-foreground"
                        : "fill-muted-foreground"
                    }
                    style={{ fontSize: idx === 0 ? 11 : 10, fontWeight: idx === 0 ? 600 : 400 }}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })()}
      </svg>

      {showLegend && series.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {series.map((s) => {
            const c = colorFor(s.id);
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <svg width={24} height={6}>
                  <line
                    x1={0}
                    y1={3}
                    x2={24}
                    y2={3}
                    stroke={c.stroke}
                    strokeWidth={2}
                    strokeDasharray={c.dash}
                  />
                </svg>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.id}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function wrapText(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

/** Convenience: dash-style presets for multi-series overlays. */
export const RADAR_DASH_STYLES = ["0", "6 4", "2 3"] as const;
