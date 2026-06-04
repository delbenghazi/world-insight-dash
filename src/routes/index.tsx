import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingGlobe } from "@/components/LoadingGlobe";
import { WorldMap } from "@/components/WorldMap";
import { LeftPanel } from "@/components/LeftPanel";
import { AIAdvisor } from "@/components/AIAdvisor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DPI Sequencing Atlas — Central America" },
      {
        name: "description",
        content:
          "Policy and strategy dashboard for digital public infrastructure sequencing across Guatemala, Honduras, and El Salvador.",
      },
      { property: "og:title", content: "DPI Sequencing Atlas — Central America" },
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

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
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
            <div className="pointer-events-none absolute left-6 top-6 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              World map · Equal Earth · Focus: CA-3
            </div>
          </main>
        </div>
      )}

      {loaded && <AIAdvisor />}
    </div>
  );
}
