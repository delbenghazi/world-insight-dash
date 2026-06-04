import { useEffect, useState, useCallback, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  CountryCode,
  countryColorVar,
  countriesInUse,
  useProjectStore,
} from "@/lib/project-data";
import { isoNumericToIso3 } from "@/lib/countries";

const TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 4;
const ZOOM_FACTOR = 1.4;
const INITIAL_ZOOM = 1.18;

export function WorldMap({ entrance = true }: { entrance?: boolean }) {
  const { projects, selectedCountry, hoveredCountry, setHoveredCountry } =
    useProjectStore();
  const navigate = useNavigate();
  const focusSet = new Set(countriesInUse(projects));
  const [ready, setReady] = useState(!entrance);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const targetZoomRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!entrance) return;
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, [entrance]);

  const animateZoom = useCallback((target: number) => {
    targetZoomRef.current = target;
    if (rafRef.current != null) return;
    const tick = () => {
      setZoom((current) => {
        const diff = targetZoomRef.current - current;
        if (Math.abs(diff) < 0.003) {
          rafRef.current = null;
          return targetZoomRef.current;
        }
        rafRef.current = requestAnimationFrame(tick);
        // exponential smoothing for buttery motion
        return current + diff * 0.18;
      });
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  const zoomIn = useCallback(
    () => animateZoom(Math.min(targetZoomRef.current * ZOOM_FACTOR, MAX_ZOOM)),
    [animateZoom]
  );
  const zoomOut = useCallback(
    () => animateZoom(Math.max(targetZoomRef.current / ZOOM_FACTOR, MIN_ZOOM)),
    [animateZoom]
  );

  return (
    <motion.div
      className="relative h-full w-full"
      initial={{ scale: entrance ? 1.06 : 1, opacity: entrance ? 0 : 1 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 165 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          center={center}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={({ coordinates, zoom }) => {
            setCenter(coordinates as [number, number]);
            targetZoomRef.current = zoom;
            setZoom(zoom);
          }}
        >
          <Geographies geography={TOPO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso3 = isoNumericToIso3(String(geo.id));
                const code = iso3 && focusSet.has(iso3) ? iso3 : null;
                const isFocus = !!code;
                const isSelected = code && selectedCountry === code;
                const isHovered = code && hoveredCountry === code;
                const fill = isFocus
                  ? countryColorVar(code!)
                  : "var(--color-map-neutral)";
                const stroke = isFocus
                  ? "var(--color-map-border)"
                  : "var(--color-map-neutral-stroke)";
                const strokeWidth = isFocus
                  ? isSelected
                    ? 0.9
                    : 0.6
                  : 0.3;
                const fillOpacity = isFocus
                  ? isSelected || isHovered
                    ? 1
                    : 0.92
                  : 1;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => isFocus && setHoveredCountry(code!)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    onClick={() =>
                      isFocus &&
                      navigate({
                        to: "/country/$code",
                        params: { code: code! },
                      })
                    }
                    style={{
                      default: {
                        fill,
                        fillOpacity,
                        stroke,
                        strokeWidth,
                        strokeLinejoin: "round",
                        outline: "none",
                        transition:
                          "fill-opacity 320ms cubic-bezier(.22,1,.36,1), stroke-width 320ms cubic-bezier(.22,1,.36,1), stroke 320ms ease",
                        cursor: isFocus ? "pointer" : "default",
                      },
                      hover: {
                        fill,
                        fillOpacity: 1,
                        stroke: isFocus
                          ? "var(--color-foreground)"
                          : "var(--color-map-neutral-stroke)",
                        strokeWidth: isFocus ? 0.95 : 0.35,
                        outline: "none",
                      },
                      pressed: { fill, outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col gap-0.5 rounded-xl p-1 panel">
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM - 0.01}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground active:scale-95 disabled:opacity-30"
          aria-label="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <div className="mx-1.5 h-px bg-border" />
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM + 0.01}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/70 transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground active:scale-95 disabled:opacity-30"
          aria-label="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
      </div>
    </motion.div>
  );
}
