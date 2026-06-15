import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Project } from "@/lib/project-data";
import { evaluateAllPairs, OUTCOME_META, type PairResult } from "@/lib/sequencing";

export function SequencingSection({ projects }: { projects: Project[] }) {
  const [howOpen, setHowOpen] = useState(false);
  if (projects.length < 2) return null;
  const pairs = evaluateAllPairs(projects);

  return (
    <section className="mt-8 px-6 pb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-base font-semibold tracking-tight">Sequencing</h3>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          {pairs.length} pair{pairs.length === 1 ? "" : "s"} · rules-based
        </span>
      </div>
      <p className="mb-4 max-w-3xl text-xs text-muted-foreground">
        For every pair of projects, the engine runs four gates in severity order and stops at the
        first match. The AI advisor only explains these outcomes; it never decides them.
      </p>

      <button
        onClick={() => setHowOpen((o) => !o)}
        className="mb-4 flex w-full items-center justify-between rounded-md border bg-surface px-4 py-2.5 text-xs font-medium hover:bg-secondary"
      >
        <span>How the engine works</span>
        {howOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {howOpen && <HowItWorks />}

      <div className="grid gap-3 md:grid-cols-2">
        {pairs.map((r) => (
          <PairCard key={`${r.a.projectId}-${r.b.projectId}`} result={r} />
        ))}
      </div>

      <Legend />
    </section>
  );
}

export function PairCard({ result }: { result: PairResult }) {
  const meta = OUTCOME_META[result.outcome];
  const tint = meta.tint;
  return (
    <article
      className="rounded-xl border p-4"
      style={{
        borderColor: `color-mix(in oklab, ${tint} 40%, transparent)`,
        background: `color-mix(in oklab, ${tint} 7%, transparent)`,
      }}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm font-semibold">
            {result.provisional && <span className="mr-1 text-foreground">~</span>}
            {result.a.projectId} × {result.b.projectId}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            caught at gate {result.gate} · {result.interactionType}
            {result.direction && (
              <>
                {" "}
                · sequence · {result.direction.first.projectId} first
              </>
            )}
            {result.directionUnknown && (
              <> · direction needs confirming</>
            )}
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: `color-mix(in oklab, ${tint} 22%, transparent)`,
            color: `color-mix(in oklab, ${tint} 78%, #000)`,
          }}
        >
          {meta.label}
        </span>
      </header>

      <p className="mt-3 text-xs leading-relaxed text-foreground/90">{result.reason}</p>

      <div
        className="my-3 h-px"
        style={{ background: `color-mix(in oklab, ${tint} 30%, transparent)` }}
      />

      {result.flags.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">
          <span className="font-mono">flag</span> · none · monitor at review
        </div>
      ) : (
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          {result.flags.map((f, i) => (
            <li key={i}>
              <span className="font-mono">flag</span> · {f}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Legend() {
  const items: Array<{ key: keyof typeof OUTCOME_META; label: string }> = [
    { key: "Parallel", label: "Parallel" },
    { key: "Coordinate", label: "Coordinate" },
    { key: "Sequence", label: "Sequence" },
    { key: "Redesign", label: "Redesign" },
  ];
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-[11px] text-muted-foreground">
      <span className="font-mono uppercase tracking-wider">Legend</span>
      {items.map((it) => (
        <span key={it.key} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: OUTCOME_META[it.key].dot }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function HowItWorks() {
  const gates: Array<{ n: number; outcome: keyof typeof OUTCOME_META; condition: string }> = [
    {
      n: 1,
      outcome: "Redesign",
      condition:
        "Pair is Governance-Conflicting (two systems for the same data, or one function split across two agencies).",
    },
    {
      n: 2,
      outcome: "Sequence",
      condition:
        "Sequentially Dependent, OR one project has an unmet regulatory (D2=3) or technical (D3=3) precondition the other resolves.",
    },
    {
      n: 3,
      outcome: "Coordinate",
      condition: "Same lead agency AND combined D1 (institutional load) ≥ 5.",
    },
    {
      n: 4,
      outcome: "Parallel",
      condition: "Default — nothing above fired.",
    },
  ];
  return (
    <div className="mb-4 space-y-2 rounded-lg border bg-surface p-3">
      {gates.map((g) => {
        const meta = OUTCOME_META[g.outcome];
        return (
          <div key={g.n} className="flex items-start gap-3 text-xs">
            <span
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{
                background: `color-mix(in oklab, ${meta.tint} 22%, transparent)`,
                color: `color-mix(in oklab, ${meta.tint} 78%, #000)`,
              }}
            >
              {g.n}
            </span>
            <div>
              <div className="font-medium">{meta.label}</div>
              <div className="text-muted-foreground">{g.condition}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
