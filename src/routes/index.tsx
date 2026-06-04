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

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = shellRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 100;
    const my = ((e.clientY - r.top) / r.height) * 100;
    el.style.setProperty("--mx", String(mx));
    el.style.setProperty("--my", String(my));
  };

  return (
    <div
      ref={shellRef}
      onPointerMove={onPointerMove}
      className="atmosphere sheen relative h-screen w-full overflow-hidden"
    >
      <AnimatePresence>
        {!loaded && <LoadingGlobe onDone={() => setLoaded(true)} />}
      </AnimatePresence>

      {loaded && (
        <div className="flex h-full w-full">
          <LeftPanel />
          <main className="relative flex-1">
            <div className="absolute inset-0">
              <WorldMap />
            </div>
            <div className="pointer-events-none absolute left-6 top-6 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground/80">
              World Map
            </div>
          </main>
        </div>
      )}

      {loaded && <AIAdvisor />}
    </div>
  );
}
