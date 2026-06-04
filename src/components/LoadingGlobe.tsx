import { useEffect, useMemo, useState } from "react";
import { geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { motion } from "framer-motion";

const TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface Props {
  onDone: () => void;
  durationMs?: number;
}

export function LoadingGlobe({ onDone, durationMs = 1200 }: Props) {
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

  const path = useMemo(() => {
    const projection = geoOrthographic()
      .scale(95)
      .translate([100, 100])
      .rotate([rotation, -10]);
    return geoPath(projection as any);
  }, [rotation]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
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
        style={{ width: 200, height: 200 }}
      >
        <svg width={200} height={200} viewBox="0 0 200 200">
          <circle
            cx={100}
            cy={100}
            r={95}
            fill="var(--color-map-ocean)"
            stroke="var(--color-map-border)"
            strokeWidth={0.6}
          />
          {geo &&
            geo.features.map((f: any, i: number) => (
              <path
                key={i}
                d={path(f) || ""}
                fill="var(--color-map-neutral)"
                fillOpacity={1}
                stroke="var(--color-map-neutral-stroke)"
                strokeWidth={0.3}
              />
            ))}
          <ellipse
            cx={100}
            cy={100}
            rx={95}
            ry={95}
            fill="none"
            stroke="var(--color-map-border)"
            strokeWidth={0.5}
            opacity={0.4}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}
