import { useEffect, useMemo, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import { motion } from "framer-motion";

const TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface Props {
  onDone: () => void;
  durationMs?: number;
}

export function LoadingGlobe({ onDone, durationMs = 1400 }: Props) {
  const [rotation, setRotation] = useState(0);
  const [geo, setGeo] = useState<any>(null);

  useEffect(() => {
    fetch(TOPO_URL)
      .then((r) => r.json())
      .then((topo) => setGeo(feature(topo, topo.objects.countries)))
      .catch(() => setGeo(null));
  }, []);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      setRotation(((t - start) / 30) % 360);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const id = setTimeout(onDone, durationMs);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(id);
    };
  }, [onDone, durationMs]);

  const SIZE = 240;
  const R = 110;
  const C = SIZE / 2;

  const { path, graticule } = useMemo(() => {
    const projection = geoOrthographic()
      .scale(R)
      .translate([C, C])
      .rotate([rotation, -12]);
    const p = geoPath(projection as any);
    return { path: p, graticule: p(geoGraticule10()) || "" };
  }, [rotation]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background:
          "radial-gradient(120% 80% at 50% 40%, oklch(0.22 0.05 260) 0%, oklch(0.13 0.04 265) 55%, oklch(0.09 0.03 270) 100%)",
      }}
    >
      {/* Aurora clouds drifting behind the globe */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-1/4 top-1/4 h-[60vh] w-[60vh] rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.75 0.18 180 / 0.55), transparent 70%)",
            filter: "blur(60px)",
          }}
          animate={{ x: [0, 80, -40, 0], y: [0, -40, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 top-0 h-[55vh] w-[55vh] rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.2 320 / 0.5), transparent 70%)",
            filter: "blur(70px)",
          }}
          animate={{ x: [0, -60, 40, 0], y: [0, 50, -30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 h-[50vh] w-[50vh] rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.72 0.18 220 / 0.45), transparent 70%)",
            filter: "blur(65px)",
          }}
          animate={{ x: [0, 50, -40, 0], y: [0, -30, 40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 2.6, filter: "blur(10px)" }}
        transition={{
          opacity: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
          scale: { duration: 1.2, ease: [0.65, 0, 0.35, 1] },
          filter: { duration: 1.1, ease: "easeOut" },
        }}
        className="relative"
        style={{ width: SIZE, height: SIZE }}
      >
        {/* Glass shell */}
        <div
          className="absolute inset-0 rounded-full border border-white/25"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 55%, rgba(255,255,255,0) 75%)",
            backdropFilter: "blur(14px) saturate(140%)",
            boxShadow:
              "inset 0 0 60px rgba(255,255,255,0.08), 0 20px 60px -20px rgba(80,140,255,0.45), 0 0 80px rgba(140,90,220,0.25)",
          }}
        />

        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="relative"
        >
          <defs>
            <clipPath id="globe-clip">
              <circle cx={C} cy={C} r={R} />
            </clipPath>
            <radialGradient id="globe-aurora" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.85 0.15 180)" stopOpacity="0" />
              <stop offset="60%" stopColor="oklch(0.7 0.18 200)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="oklch(0.4 0.1 260)" stopOpacity="0.5" />
            </radialGradient>
            <radialGradient id="globe-highlight" cx="32%" cy="28%" r="55%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          {/* Aurora clouds inside the globe */}
          <g clipPath="url(#globe-clip)">
            <circle cx={C} cy={C} r={R} fill="url(#globe-aurora)" />
            <motion.ellipse
              cx={C}
              cy={C}
              rx={R * 0.9}
              ry={R * 0.55}
              fill="oklch(0.78 0.2 175 / 0.35)"
              style={{ filter: "blur(14px)", transformOrigin: `${C}px ${C}px` }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            />
            <motion.ellipse
              cx={C}
              cy={C}
              rx={R * 0.75}
              ry={R * 0.4}
              fill="oklch(0.72 0.22 320 / 0.3)"
              style={{ filter: "blur(16px)", transformOrigin: `${C}px ${C}px` }}
              animate={{ rotate: [360, 0] }}
              transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
            />

            {/* Graticule (wireframe meridians + parallels) */}
            <path
              d={graticule}
              fill="none"
              stroke="rgba(180,220,255,0.35)"
              strokeWidth={0.5}
            />

            {/* Country outlines — wireframe only */}
            {geo &&
              geo.features.map((f: any, i: number) => (
                <path
                  key={i}
                  d={path(f) || ""}
                  fill="none"
                  stroke="rgba(200,230,255,0.85)"
                  strokeWidth={0.7}
                />
              ))}

            {/* Glass highlight */}
            <circle cx={C} cy={C} r={R} fill="url(#globe-highlight)" />
          </g>

          {/* Outer rim */}
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={1}
          />
          <circle
            cx={C}
            cy={C}
            r={R + 4}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
