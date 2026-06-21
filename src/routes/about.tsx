import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { WorkflowNav } from "@/components/WorkflowNav";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — DPI Sequencing Atlas" },
      {
        name: "description",
        content: "Purpose, methodology rationale, and intended users of the DPI Sequencing Atlas.",
      },
    ],
  }),
  component: About,
});

const SECTIONS = [
  {
    title: "The Challenge",
    body: "EU Global Gateway is deploying significant digital investment across emerging markets, but project teams and advisory organisations lack a structured tool to assess how parallel digital investments interact — creating risks of duplication, sequencing failure, and uncoordinated institutional demands on low-capacity governments.",
  },
  {
    title: "The Objective",
    body: "To provide a replicable investment interaction matrix that maps, scores, and classifies how parallel EU-aligned digital projects interact within a country — identifying sequencing dependencies, institutional bottlenecks, and investment readiness gaps.",
  },
  {
    title: "The Impact",
    body: "Enables development advisors to reduce project design inefficiencies by surfacing interaction risks before commitment. Target: reduce unidentified cross-project conflicts by providing a structured pre-screening diagnostic applicable to any 3–5 parallel digital investments in a Tier B/C country context.",
  },
  {
    title: "Who It's For",
    body: "Final beneficiaries: development finance advisors, EU delegations, and MDB project teams designing parallel digital investment portfolios in emerging markets. Primary users: investment readiness consultants and country-level programme officers using the tool at project design or mid-term review stage.",
  },
  {
    title: "When To Use It",
    body: "At project design stage (pre-commitment) or at mid-term review when portfolio coherence needs to be reassessed — because interaction risks are cheapest to fix before contracts are signed and institutional mandates are locked in.",
  },
  {
    title: "How It Works",
    body: "Projects are scored across five dimensions (institutional load, regulatory dependencies, technical dependencies, political sensitivity, investment needs), then classified by cross-project interaction type (complementary, sequentially dependent, institutionally competing, governance-conflicting). The matrix is designed as a generalisable template replicable beyond any specific country set.",
  },
];

function About() {
  return (
    <div className="min-h-screen bg-background">
      <WorkflowNav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          About
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          What this tool does
        </h1>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold tracking-tight">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between rounded-md border border-dashed bg-surface/40 px-4 py-3 text-sm text-muted-foreground">
          <span>Next: learn the methodology or select a country</span>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
          >
            Open atlas <ArrowRight size={12} />
          </Link>
        </div>
      </main>
    </div>
  );
}
