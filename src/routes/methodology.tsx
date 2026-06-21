import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Scale,
  Cpu,
  Vote,
  Wallet,
  Handshake,
  ListOrdered,
  Swords,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WorkflowNav } from "@/components/WorkflowNav";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — DPI Sequencing Atlas" },
      {
        name: "description",
        content:
          "How the DPI sequencing dashboard scores absorption, regulatory, technical, political, and investment dimensions, and classifies project interactions.",
      },
    ],
  }),
  component: Methodology,
});

type Dim = {
  title: string;
  body: string;
  icon: LucideIcon;
  accent: string; // CSS color
};

const DIMENSIONS: Dim[] = [
  {
    title: "Institutional absorption load",
    body: "How much organizational, procurement, and change-management capacity the project consumes inside government counterparts. High absorption load means few simultaneous initiatives can be carried.",
    icon: Building2,
    accent: "oklch(0.55 0.09 250)", // slate blue
  },
  {
    title: "Regulatory dependencies",
    body: "The breadth of legal, policy, and standard-setting prerequisites — data protection, eID, procurement reform, interop standards — that must move before the project can land at scale.",
    icon: Scale,
    accent: "oklch(0.30 0.07 260)", // dark navy
  },
  {
    title: "Technical dependencies",
    body: "Upstream infrastructure (identity, payments, registries, interop layer) the project relies on. Sequencing matters most when the project assumes capabilities that are not yet operational.",
    icon: Cpu,
    accent: "oklch(0.45 0.10 150)", // forest green
  },
  {
    title: "Political sensitivity",
    body: "Exposure to electoral cycles, mandate disputes, and visible accountability. High political sensitivity raises both ambition and reversal risk.",
    icon: Vote,
    accent: "oklch(0.55 0.03 60)", // warm gray
  },
  {
    title: "Investment needs / funding",
    body: "Scale and certainty of capex and opex, including donor coordination and counterpart financing. Misaligned funding cadence is a common failure mode.",
    icon: Wallet,
    accent: "oklch(0.42 0.07 200)", // dark teal
  },
];

type Interaction = {
  title: string;
  body: string;
  icon: LucideIcon;
  accent: string;
  tone: string; // label
};

const INTERACTIONS: Interaction[] = [
  {
    title: "Complementary",
    body: "Projects reinforce each other when delivered in parallel. Coordination cost is real but not blocking; benefits compound.",
    icon: Handshake,
    accent: "oklch(0.62 0.15 145)", // green
    tone: "Low urgency",
  },
  {
    title: "Sequentially dependent",
    body: "One project requires another to land first. Out-of-order delivery erodes value or forces re-work.",
    icon: ListOrdered,
    accent: "oklch(0.75 0.15 80)", // amber
    tone: "Medium urgency",
  },
  {
    title: "Institutionally competing",
    body: "Different agencies pursue overlapping mandates. Without explicit lead-agency designation, the projects stall or duplicate.",
    icon: Swords,
    accent: "oklch(0.68 0.18 50)", // orange
    tone: "High urgency",
  },
  {
    title: "Governance-conflicting",
    body: "Projects encode incompatible models of authority, data ownership, or accountability. Resolving the governance question is a prerequisite to any technical work.",
    icon: ShieldAlert,
    accent: "oklch(0.58 0.22 25)", // red
    tone: "Critical",
  },
];

const RISK_ZONES = [
  {
    label: "Low risk",
    range: "5 – 7",
    icon: CheckCircle2,
    color: "oklch(0.62 0.15 145)",
  },
  {
    label: "Medium risk",
    range: "8 – 10",
    icon: AlertTriangle,
    color: "oklch(0.75 0.15 80)",
  },
  {
    label: "High risk",
    range: "11 – 15",
    icon: AlertCircle,
    color: "oklch(0.58 0.22 25)",
  },
];

function StageLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
      {children}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden lg:flex items-center justify-center self-stretch px-1">
      <div className="relative flex h-full w-full items-center">
        <div className="h-px w-full bg-border" />
        <ChevronRight
          size={18}
          className="absolute right-0 -translate-y-0 text-muted-foreground"
        />
      </div>
    </div>
  );
}

function Methodology() {
  return (
    <div className="min-h-screen bg-background">
      <WorkflowNav />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          Methodology
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          How the atlas thinks
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          The atlas is a decision-support tool for DPI sequencing, not a
          forecasting model. Each project is scored on five dimensions and
          classified by how it interacts with other projects in the same country
          portfolio. Scores feed into the composite shown on the dashboard;
          interactions drive the sequencing recommendations.
        </p>

        {/* Three-column framework */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {/* INPUTS */}
          <section data-tour="dimensions">
            <StageLabel>Inputs</StageLabel>
            <h2 className="mt-1 text-lg font-semibold">
              Five assessed dimensions
            </h2>
            <div className="mt-4 space-y-3">
              {DIMENSIONS.map((d, i) => {
                const Icon = d.icon;
                return (
                  <div
                    key={d.title}
                    className="rounded-lg border bg-surface p-4 pl-5"
                    style={{ borderLeft: `4px solid ${d.accent}` }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                        style={{
                          background: `color-mix(in oklab, ${d.accent} 14%, transparent)`,
                          color: d.accent,
                        }}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold leading-tight">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            D{i + 1}
                          </span>{" "}
                          · {d.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          {d.body}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <FlowArrow />

          {/* PROCESS */}
          <section data-tour="interactions">
            <StageLabel>Process</StageLabel>
            <h2 className="mt-1 text-lg font-semibold">Interaction types</h2>
            <div className="mt-4 space-y-3">
              {INTERACTIONS.map((it) => {
                const Icon = it.icon;
                return (
                  <div
                    key={it.title}
                    className="rounded-lg border bg-surface p-4"
                    style={{ borderTop: `3px solid ${it.accent}` }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                        style={{
                          background: `color-mix(in oklab, ${it.accent} 16%, transparent)`,
                          color: it.accent,
                        }}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold leading-tight">
                            {it.title}
                          </h3>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider"
                            style={{
                              background: `color-mix(in oklab, ${it.accent} 14%, transparent)`,
                              color: it.accent,
                            }}
                          >
                            {it.tone}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                          {it.body}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <FlowArrow />

          {/* OUTPUT */}
          <section data-tour="risk-classification">
            <StageLabel>Output</StageLabel>
            <h2 className="mt-1 text-lg font-semibold">
              Composite score and risk
            </h2>

            <div className="mt-4 rounded-lg border bg-surface p-5">
              <div className="flex gap-5">
                {/* Thermometer */}
                <div className="relative flex w-10 shrink-0 flex-col">
                  <div
                    className="relative flex-1 rounded-full border"
                    style={{
                      background:
                        "linear-gradient(to bottom, oklch(0.62 0.15 145) 0%, oklch(0.62 0.15 145) 33%, oklch(0.75 0.15 80) 33%, oklch(0.75 0.15 80) 66%, oklch(0.58 0.22 25) 66%, oklch(0.58 0.22 25) 100%)",
                      minHeight: 280,
                    }}
                  />
                </div>

                {/* Zone labels */}
                <div className="flex flex-1 flex-col justify-between py-1">
                  {RISK_ZONES.map((z) => {
                    const Icon = z.icon;
                    return (
                      <div key={z.label} className="flex items-start gap-2">
                        <span
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                          style={{
                            background: `color-mix(in oklab, ${z.color} 16%, transparent)`,
                            color: z.color,
                          }}
                        >
                          <Icon size={14} />
                        </span>
                        <div>
                          <div
                            className="text-sm font-semibold leading-tight"
                            style={{ color: z.color }}
                          >
                            {z.label}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {z.range}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                Composite score is the sum of the five dimension scores (D1–D5),
                each scored 1 (low) to 3 (high). The composite therefore ranges
                from 5 (lowest risk) to 15 (highest risk). Overall risk is then
                bucketed: Low (5–7), Medium (8–10), High (11–15). Country
                aggregates average the project composites for the country.
              </p>
            </div>

            <div
              className="mt-4 rounded-lg border p-4"
              style={{
                borderColor: "color-mix(in oklab, var(--color-risk-medium) 45%, transparent)",
                background: "color-mix(in oklab, var(--color-risk-medium) 14%, transparent)",
              }}
            >
              <div
                className="text-[10px] font-mono uppercase tracking-[0.18em]"
                style={{ color: "var(--color-risk-medium)" }}
              >
                Proxy Scores
              </div>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "#1a1a1a" }}>
                When uploaded documents contain insufficient evidence to score a
                dimension, the tool offers a guided proxy scoring process — asking
                the user two targeted questions to derive a defensible estimate.
                Proxy scores are flagged with a{" "}
                <span className="font-mono font-semibold">~</span> indicator
                throughout the platform. They are included in composite
                calculations but should be treated as estimates pending additional
                documentation. Proxy scores do not invalidate an assessment — they
                make its evidence base transparent.
              </p>
            </div>
          </section>
        </div>

        <section className="mt-12 rounded-lg border bg-surface p-5">
          <h2 className="text-base font-semibold">Credits</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This atlas was created by Dana Elbenghazi, Yuan Liang, and Mohamed
            Louajri.
          </p>
        </section>

        <div className="mt-10 flex items-center justify-between rounded-md border border-dashed bg-surface/40 px-4 py-3 text-sm text-muted-foreground">
          <span>Next: pick a country to explore its portfolio</span>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
          >
            Open home <ArrowRight size={12} />
          </Link>
        </div>
      </main>
    </div>
  );
}
