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
          <main className="relative flex-1 p-5">
            <section className="map-stage relative h-full w-full overflow-hidden">
              <WorldMap />
              <div className="pointer-events-none absolute left-5 top-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                World Map
              </div>
            </section>
          </main>
        </div>
      )}

      {loaded && <AIAdvisor />}
    </div>
  );
}
