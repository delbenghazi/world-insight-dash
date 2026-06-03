import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — DPI Sequencing Atlas" },
      {
        name: "description",
        content: "How the DPI sequencing dashboard scores absorption, regulatory, technical, political, and investment dimensions, and classifies project interactions.",
      },
    ],
  }),
  component: Methodology,
});

const DIMENSIONS = [
  {
    title: "Institutional absorption load",
    body: "How much organizational, procurement, and change-management capacity the project consumes inside government counterparts. High absorption load means few simultaneous initiatives can be carried.",
  },
  {
    title: "Regulatory dependencies",
    body: "The breadth of legal, policy, and standard-setting prerequisites — data protection, eID, procurement reform, interop standards — that must move before the project can land at scale.",
  },
  {
    title: "Technical dependencies",
    body: "Upstream infrastructure (identity, payments, registries, interop layer) the project relies on. Sequencing matters most when the project assumes capabilities that are not yet operational.",
  },
  {
    title: "Political sensitivity",
    body: "Exposure to electoral cycles, mandate disputes, and visible accountability. High political sensitivity raises both ambition and reversal risk.",
  },
  {
    title: "Investment needs / funding",
    body: "Scale and certainty of capex and opex, including donor coordination and counterpart financing. Misaligned funding cadence is a common failure mode.",
  },
];

const INTERACTIONS = [
  {
    title: "Complementary",
    body: "Projects reinforce each other when delivered in parallel. Coordination cost is real but not blocking; benefits compound.",
  },
  {
    title: "Sequentially dependent",
    body: "One project requires another to land first. Out-of-order delivery erodes value or forces re-work.",
  },
  {
    title: "Institutionally competing",
    body: "Different agencies pursue overlapping mandates. Without explicit lead-agency designation, the projects stall or duplicate.",
  },
  {
    title: "Governance-conflicting",
    body: "Projects encode incompatible models of authority, data ownership, or accountability. Resolving the governance question is a prerequisite to any technical work.",
  },
];

function Methodology() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Back to atlas
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Methodology
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">How the atlas thinks</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The atlas is a decision-support tool for DPI sequencing, not a forecasting model. Each
          project is scored on five dimensions and classified by how it interacts with other
          projects in the same country portfolio. Scores feed into the composite shown on the
          dashboard; interactions drive the sequencing recommendations.
        </p>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">Five assessed dimensions</h2>
          <div className="mt-4 space-y-4">
            {DIMENSIONS.map((d, i) => (
              <div key={d.title} className="rounded-lg border bg-surface p-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-muted-foreground">D{i + 1}</span>
                  <h3 className="text-base font-semibold">{d.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">Interaction types</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {INTERACTIONS.map((d) => (
              <div key={d.title} className="rounded-lg border bg-surface p-5">
                <h3 className="text-base font-semibold">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-lg border bg-primary-soft/50 p-5">
          <h2 className="text-base font-semibold">Composite score and risk</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Composite score is the unweighted mean of the five dimensions (1 = low, 5 = high). Overall
            risk is then bucketed: Low (&lt; 2.5), Medium (2.5–3.49), High (≥ 3.5). Country aggregates
            average the project composites for the country.
          </p>
        </section>
      </main>
    </div>
  );
}
