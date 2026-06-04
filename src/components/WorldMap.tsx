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

const MIN_ZOOM = 0.52;
const MAX_ZOOM = 4;
const ZOOM_FACTOR = 1.4;

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
      initial={{ scale: entrance ? 2.4 : 1, opacity: entrance ? 0 : 1 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 155 }}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="landRelief" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.55" result="blur" />
            <feSpecularLighting
              in="blur"
              surfaceScale="1.4"
              specularConstant="0.35"
              specularExponent="22"
              lightingColor="#ffffff"
              result="spec"
            >
              <feDistantLight azimuth="135" elevation="58" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="specOut" />
            </feMerge>
          </filter>
        </defs>

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
                const opacity = isFocus
                  ? isSelected || isHovered
                    ? 1
                    : 0.9
                  : 1;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    filter="url(#landRelief)"
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
                        fillOpacity: opacity,
                        stroke: "var(--color-map-border)",
                        strokeWidth: isSelected ? 1.1 : 0.45,
                        outline: "none",
                        transition:
                          "fill-opacity 380ms cubic-bezier(.22,1,.36,1), stroke-width 380ms cubic-bezier(.22,1,.36,1), stroke 380ms ease",
                        cursor: isFocus ? "pointer" : "default",
                      },
                      hover: {
                        fill,
                        fillOpacity: 1,
                        stroke: isFocus
                          ? "var(--color-foreground)"
                          : "var(--color-map-border)",
                        strokeWidth: isFocus ? 1.1 : 0.5,
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

      <div className="pointer-events-auto absolute right-5 top-5 flex flex-col gap-1 rounded-2xl p-1.5 glass-panel">
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM - 0.01}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground/70 transition-all duration-300 hover:bg-white/60 hover:text-foreground hover:scale-[1.06] active:scale-95 disabled:opacity-30"
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <div className="mx-2 h-px bg-white/60" />
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM + 0.01}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground/70 transition-all duration-300 hover:bg-white/60 hover:text-foreground hover:scale-[1.06] active:scale-95 disabled:opacity-30"
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
      </div>
    </motion.div>
  );
}
