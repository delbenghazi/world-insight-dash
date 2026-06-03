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

export function LoadingGlobe({ onDone, durationMs = 2600 }: Props) {
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
    let start = performance.now();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.4 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative"
        style={{ width: 200, height: 200 }}
      >
        <span className="whirl-ring" />
        <span className="whirl-ring-2" />
        <svg width={200} height={200} viewBox="0 0 200 200">
          <circle
            cx={100}
            cy={100}
            r={95}
            fill="var(--color-map-base)"
            stroke="var(--color-map-border)"
            strokeWidth={1}
          />
          {geo &&
            geo.features.map((f: any, i: number) => (
              <path
                key={i}
                d={path(f) || ""}
                fill="var(--color-foreground)"
                fillOpacity={0.85}
                stroke="var(--color-background)"
                strokeWidth={0.3}
              />
            ))}
          {/* Graticule-ish meridian */}
          <ellipse
            cx={100}
            cy={100}
            rx={95}
            ry={95}
            fill="none"
            stroke="var(--color-map-border)"
            strokeWidth={0.5}
          />
        </svg>
      </motion.div>
    </div>
  );
}
