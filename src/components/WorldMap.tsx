import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  CountryCode,
  countriesInUse,
  countryStats,
  projectsByCountry,
  RiskLevel,
  useProjectStore,
} from "@/lib/project-data";
import { CountryCard } from "@/components/CountryCard";
import { getCountryMeta, isoNumericToIso3 } from "@/lib/countries";

const RISK_COLOR: Record<RiskLevel, string> = {
  High: "#C0392B",
  Medium: "#E07060",
  Low: "#F2C4BC",
};

// Diameter in CSS px: 1 project => 40, 5+ => 80, linear in between.
function bubbleDiameter(count: number): number {
  const clamped = Math.max(1, Math.min(5, count));
  return 40 + ((clamped - 1) / 4) * 40;
}

const TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;
const ZOOM_FACTOR = 1.4;

function computeFit(codes: CountryCode[]): { center: [number, number]; zoom: number } {
  const pts = codes
    .map((c) => getCountryMeta(c)?.latlng)
    .filter((p): p is [number, number] => !!p);
  if (pts.length === 0) return { center: [10, 10], zoom: 1 };
  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
  // Single-point or tight cluster gets a regional zoom; large spans zoom out.
  const latSpan = Math.max(maxLat - minLat, 6);
  const lngSpan = Math.max(maxLng - minLng, 6);
  const span = Math.max(latSpan, lngSpan) * 1.8; // padding around bbox
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, 180 / span));
  return { center, zoom };
}

export function WorldMap({ entrance = true, onCountryClick }: { entrance?: boolean; onCountryClick?: () => void }) {
  const { projects, selectedCountry, hoveredCountry, setHoveredCountry } =
    useProjectStore();
  const navigate = useNavigate();
  const activeCountries = useMemo(() => countriesInUse(projects), [projects]);
  const focusSet = useMemo(() => new Set(activeCountries), [activeCountries]);
  const fit = useMemo(() => computeFit(activeCountries), [activeCountries]);
  const [ready, setReady] = useState(!entrance);
  const [zoom, setZoom] = useState(fit.zoom);
  const [center, setCenter] = useState<[number, number]>(fit.center);
  const targetZoomRef = useRef(fit.zoom);
  const rafRef = useRef<number | null>(null);

  // Auto-fit whenever the set of active countries changes.
  useEffect(() => {
    setCenter(fit.center);
    setZoom(fit.zoom);
    targetZoomRef.current = fit.zoom;
  }, [fit.center, fit.zoom]);

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
        if (Math.abs(diff) < 0.0008) {
          rafRef.current = null;
          return targetZoomRef.current;
        }
        rafRef.current = requestAnimationFrame(tick);
        // gentler exponential smoothing for buttery, sustained motion
        return current + diff * 0.085;
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
      initial={{ scale: entrance ? 1.12 : 1, opacity: entrance ? 0 : 1, filter: entrance ? "blur(6px)" : "blur(0px)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <ComposableMap
        className="rsm-svg bg-slate-300"
        projection="geoEqualEarth"
        projectionConfig={{ scale: 195 }}
        style={{
          width: "100%",
          height: "100%",
          shapeRendering: "geometricPrecision",
          textRendering: "geometricPrecision",
        }}
      >
        <defs>
          {/* no shadow filters — flat cartographic style */}
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
                const baseFill = isFocus
                  ? countryColorVar(code!)
                  : "var(--color-map-neutral)";
                const hoverFill = isFocus
                  ? `color-mix(in oklab, ${countryColorVar(code!)}, white 13%)`
                  : baseFill;
                const fill = isFocus && isHovered ? hoverFill : baseFill;
                const stroke = isFocus
                  ? "#1a1a1a"
                  : "var(--color-map-neutral-stroke)";
                const strokeWidth = isFocus ? 1.5 : 1;
                const fillOpacity = isFocus
                  ? isSelected || isHovered
                    ? 1
                    : 0.92
                  : 1;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    vectorEffect="non-scaling-stroke"
                    onMouseEnter={() => isFocus && setHoveredCountry(code!)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    onClick={() => {
                      if (!isFocus) return;
                      onCountryClick?.();
                      navigate({
                        to: "/country/$code",
                        params: { code: code! },
                      });
                    }}
                    style={{
                      default: {
                        fill,
                        fillOpacity,
                        stroke,
                        strokeWidth,
                        strokeLinejoin: "round",
                        strokeLinecap: "round",
                        vectorEffect: "non-scaling-stroke",
                        shapeRendering: "geometricPrecision",
                        outline: "none",
                        transition:
                          "fill 280ms cubic-bezier(.22,1,.36,1), fill-opacity 280ms cubic-bezier(.22,1,.36,1), stroke-width 280ms cubic-bezier(.22,1,.36,1), stroke 280ms ease",
                        cursor: isFocus ? "pointer" : "default",
                      },
                      hover: {
                        fill: hoverFill,
                        fillOpacity: 1,
                        stroke,
                        strokeWidth: isFocus ? 1.5 : 0.5,
                        vectorEffect: "non-scaling-stroke",
                        shapeRendering: "geometricPrecision",
                        outline: "none",
                      },
                      pressed: { fill: hoverFill, outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Subtle inner vignette to frame the active region */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(15, 23, 42, 0.18) 100%)",
        }}
      />

      <CountryCard />

      <div className="pointer-events-auto absolute left-20 top-4 flex items-center overflow-hidden rounded-full border border-border/60 bg-background/85 shadow-sm backdrop-blur-md">
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM - 0.01}
          className="flex h-9 w-9 items-center justify-center text-foreground/70 transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground active:scale-95 disabled:opacity-30"
          aria-label="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <div className="h-5 w-px bg-border/70" />
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM + 0.01}
          className="flex h-9 w-9 items-center justify-center text-foreground/70 transition-colors duration-200 hover:bg-foreground/[0.06] hover:text-foreground active:scale-95 disabled:opacity-30"
          aria-label="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
      </div>
    </motion.div>
  );
}
