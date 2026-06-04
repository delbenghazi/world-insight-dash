import { useEffect, useState, useCallback } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  CountryCode,
  countryColorVar,
  useProjectStore,
} from "@/lib/project-data";

const TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Numeric country IDs from world-atlas (ISO 3166-1 numeric)
const ISO_NUM_TO_CODE: Record<string, CountryCode> = {
  "320": "GTM",
  "340": "HND",
  "222": "SLV",
};

const MIN_ZOOM = 80;
const MAX_ZOOM = 400;
const ZOOM_STEP = 40;

export function WorldMap({ entrance = true }: { entrance?: boolean }) {
  const { selectedCountry, hoveredCountry, setHoveredCountry } =
    useProjectStore();
  const navigate = useNavigate();
  const [ready, setReady] = useState(!entrance);
  const [zoom, setZoom] = useState(155);

  useEffect(() => {
    if (!entrance) return;
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, [entrance]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM)), []);

  return (
    <motion.div
      className="relative h-full w-full"
      initial={{ scale: entrance ? 2.4 : 1, opacity: entrance ? 0 : 1 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: zoom }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={TOPO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const code = ISO_NUM_TO_CODE[String(geo.id)];
              const isFocus = !!code;
              const isSelected = code && selectedCountry === code;
              const isHovered = code && hoveredCountry === code;
              const fill = isFocus
                ? countryColorVar(code!)
                : "var(--color-map-neutral)";
              const opacity = isFocus
                ? isSelected || isHovered
                  ? 1
                  : 0.85
                : 1;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => isFocus && setHoveredCountry(code!)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={() => isFocus && navigate({ to: "/country/$code", params: { code: code! } })}
                  style={{
                    default: {
                      fill,
                      fillOpacity: opacity,
                      stroke: "var(--color-map-border)",
                      strokeWidth: isSelected ? 1.1 : 0.4,
                      outline: "none",
                      transition: "all 250ms ease",
                      cursor: isFocus ? "pointer" : "default",
                    },
                    hover: {
                      fill,
                      fillOpacity: isFocus ? 1 : 1,
                      stroke: isFocus
                        ? "var(--color-foreground)"
                        : "var(--color-map-border)",
                      strokeWidth: isFocus ? 1 : 0.4,
                      outline: "none",
                    },
                    pressed: { fill, outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col gap-2 rounded-lg border bg-surface p-1 shadow-sm">
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-secondary disabled:opacity-30"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-secondary disabled:opacity-30"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
      </div>
    </motion.div>
  );
}
