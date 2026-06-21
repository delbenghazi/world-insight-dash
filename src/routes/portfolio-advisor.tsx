import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { WorkflowNav } from "@/components/WorkflowNav";
import { EmptyState } from "@/components/EmptyState";
import { PortfolioAdvisor } from "@/components/PortfolioAdvisor";
import {
  countriesInUse,
  countryColorVar,
  projectsByCountry,
  FOCUS_COUNTRIES,
  useProjectStore,
  type Project,
} from "@/lib/project-data";

export const Route = createFileRoute("/portfolio-advisor")({
  head: () => ({
    meta: [
      { title: "Portfolio Advisor — DT Global GovTech Atlas" },
      {
        name: "description",
        content:
          "Portfolio sequencing advisor: implementation waves, the critical path, bottlenecks, and conflicts across a country's portfolio.",
      },
    ],
  }),
  component: PortfolioAdvisorPage,
});

function PortfolioAdvisorPage() {
  const { projects } = useProjectStore();
  return (
    <div className="min-h-screen bg-background">
      <WorkflowNav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Portfolio Advisor</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          The advisor reads every pair in the portfolio but only surfaces
          decision-relevant insights — implementation waves, the critical path,
          bottlenecks, and conflicts.
        </p>
        <CompareProjects projects={projects} />
      </main>
    </div>
  );
}

function CompareProjects({ projects }: { projects: Project[] }) {
  const available = countriesInUse(projects);
  const [country, setCountry] = useState<string | null>(null);
  const list = country ? projectsByCountry(projects, country) : [];

  if (available.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          title="No projects to advise on yet"
          description="Add at least two projects to a single country, then return here to see the portfolio sequencing advisor."
          action={{ label: "Add a project", to: "/add-project" }}
        />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-xl border bg-surface p-5">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Choose country portfolio
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {available.map((code) => {
            const c = FOCUS_COUNTRIES[code] ?? { name: code };
            const on = country === code;
            return (
              <button
                key={code}
                onClick={() => setCountry(on ? null : code)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-primary bg-primary/10 text-foreground" : "bg-background hover:bg-secondary"}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: countryColorVar(code) }} />
                {c.name}
                {on && <Check size={12} />}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          The advisor reads every pair in the portfolio but only surfaces
          decision-relevant insights — implementation waves, the critical path,
          bottlenecks, and conflicts. Raw pairwise relationships live in the
          Evidence tab.
        </p>
      </div>

      {country ? (
        <PortfolioAdvisor projects={list} />
      ) : (
        <EmptyState
          title="Pick a portfolio"
          description="Select a country above to see its recommended implementation roadmap, dependency graph, and conflict center."
        />
      )}
    </div>
  );
}
