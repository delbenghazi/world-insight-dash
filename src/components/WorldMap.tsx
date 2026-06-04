import { useEffect, useState, useCallback } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
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

export function WorldMap({ entrance = true }: { entrance?: boolean }) {
  const { selectedCountry, hoveredCountry, setHoveredCountry } =
    useProjectStore();
  const navigate = useNavigate();
  const [ready, setReady] = useState(!entrance);

  useEffect(() => {
    if (!entrance) return;
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, [entrance]);

  const initialScale = entrance ? 380 : 155;

  return (
    <motion.div
      className="h-full w-full"
      initial={{ scale: entrance ? 2.4 : 1, opacity: entrance ? 0 : 1 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 155 }}
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
    </motion.div>
  );
}
