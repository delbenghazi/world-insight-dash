import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingGlobe } from "@/components/LoadingGlobe";
import { WorldMap } from "@/components/WorldMap";
import { LeftPanel } from "@/components/LeftPanel";
import { AIAdvisor } from "@/components/AIAdvisor";
import { IntroOverlay } from "@/components/IntroOverlay";
import { useProjectStore } from "@/lib/project-data";

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
  const hoveredCountry = useProjectStore((s) => s.hoveredCountry);

  const [introOpen, setIntroOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("introSeen");
    if (seen !== "true") {
      setIntroOpen(true);
    }
  }, []);

  const markIntroSeen = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("introSeen", "true");
    }
    setIntroOpen(false);
  };

  return (
    <div
      ref={shellRef}
      className="page-canvas relative flex h-screen w-full flex-col overflow-hidden"
    >
      <AnimatePresence>
        {!loaded && <LoadingGlobe onDone={() => setLoaded(true)} durationMs={700} />}
      </AnimatePresence>

      {loaded && (
        <div className="flex min-h-0 flex-1 w-full">
          <LeftPanel />
          <main className="relative flex-1">
            <section className="relative h-full w-full overflow-hidden">
              <WorldMap onCountryClick={markIntroSeen} />
              <IntroOverlay
                open={introOpen}
                onClose={markIntroSeen}
                onReopen={() => setIntroOpen(true)}
              />
              {!hoveredCountry && (
                <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border bg-surface/85 px-3 py-1.5 text-[11px] font-medium text-foreground backdrop-blur">
                  Hover a highlighted country, then click to open its portfolio
                </div>
              )}
            </section>
          </main>
        </div>
      )}

      {loaded && <AIAdvisor portfolioMode />}
    </div>
  );
}
