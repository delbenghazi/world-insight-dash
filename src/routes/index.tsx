import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingGlobe } from "@/components/LoadingGlobe";
import { WorldMap } from "@/components/WorldMap";
import { LeftPanel } from "@/components/LeftPanel";
import { CountryCard } from "@/components/CountryCard";
import { DetailPanel } from "@/components/DetailPanel";
import { AIAdvisor } from "@/components/AIAdvisor";
import { useProjectStore } from "@/lib/project-data";

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
  const { selectedCountry } = useProjectStore();

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
            <CountryCard />
            <div className="pointer-events-none absolute left-6 top-6 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              World map · Equal Earth · Focus: CA-3
            </div>
          </main>
          {selectedCountry && (
            <div className="w-[480px] shrink-0">
              <DetailPanel code={selectedCountry} />
            </div>
          )}
        </div>
      )}

      {loaded && <AIAdvisor />}
    </div>
  );
}
