import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingGlobe } from "@/components/LoadingGlobe";
import { WorldMap } from "@/components/WorldMap";
import { LeftPanel } from "@/components/LeftPanel";
import { AIAdvisor } from "@/components/AIAdvisor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DT Global EU Global Gateway · GovTech interaction tool" },
      {
        name: "description",
        content:
          "Policy and strategy dashboard for digital public infrastructure sequencing across Guatemala, Honduras, and El Salvador.",
      },
      { property: "og:title", content: "DT Global EU Global Gateway · GovTech interaction tool" },
      {
        property: "og:description",
        content:
          "A data-driven copilot for DPI sequencing, coordination risk, and stakeholder implications in Central America.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [loaded, setLoaded] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={shellRef}
      className="page-canvas relative h-screen w-full overflow-hidden"
    >
      <AnimatePresence>
        {!loaded && <LoadingGlobe onDone={() => setLoaded(true)} />}
      </AnimatePresence>

      {loaded && (
        <div className="flex h-full w-full">
          <LeftPanel />
          <main className="relative flex-1 p-3">
            <section className="map-stage relative h-full w-full overflow-hidden">
              {/* Architectural corner ticks */}
              <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-foreground/25" />
              <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-foreground/25" />
              <span className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l border-foreground/25" />
              <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-foreground/25" />

              <WorldMap />

              {/* Header strip */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-foreground/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
                  World Map
                  <span className="ml-2 h-3 w-px bg-foreground/15" />
                  <span className="text-foreground/40">Equal Earth · 1:∅</span>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-foreground/40">
                  Strategic Intelligence
                </div>
              </div>

              {/* Footer scale strip */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-5 py-3 text-[10px] font-mono uppercase tracking-[0.24em] text-foreground/40">
                <span>0°  ·  Equator</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-px w-10 bg-foreground/40" />
                  <span>2000 km</span>
                </div>
              </div>
            </section>
          </main>
        </div>
      )}

      {loaded && <AIAdvisor />}
    </div>
  );
}
