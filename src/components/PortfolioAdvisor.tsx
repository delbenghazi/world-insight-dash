import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Info,
  Layers,
  ListChecks,
  Network,
  Sparkles,
  X,
} from "lucide-react";
import {
  analyzePortfolio,
  composite,
  simulateForceStart,
  type DepEdge,
  type PortfolioAnalysis,
} from "@/lib/portfolio-advisor";
import { OUTCOME_META, type PairResult } from "@/lib/sequencing";
import { PairCard } from "@/components/SequencingSection";
import { countryColorVar, riskColorVar, type Project } from "@/lib/project-data";

type View = "roadmap" | "graph" | "conflicts" | "whatif" | "evidence";

const VIEWS: Array<{ id: View; label: string; icon: typeof Layers }> = [
  { id: "roadmap", label: "Roadmap", icon: Layers },
  { id: "graph", label: "Dependency graph", icon: Network },
  { id: "conflicts", label: "Conflict center", icon: AlertTriangle },
  { id: "whatif", label: "What-if", icon: Sparkles },
  { id: "evidence", label: "Evidence", icon: ListChecks },
];

export function PortfolioAdvisor({ projects }: { projects: Project[] }) {
  const analysis = useMemo(() => analyzePortfolio(projects), [projects]);
  const [view, setView] = useState<View>("roadmap");
  const [selected, setSelected] = useState<
    | { kind: "project"; id: string }
    | { kind: "edge"; from: string; to: string }
    | null
  >(null);

  if (projects.length < 2) {
    return (
      <div className="mt-6 rounded-xl border bg-surface p-6 text-sm text-muted-foreground">
        Add at least two projects to this portfolio to see sequencing recommendations.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <SummaryBar analysis={analysis} />

      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-surface p-1">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          const on = view === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                on
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={13} />
              {v.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {view === "roadmap" && (
            <RoadmapView analysis={analysis} onSelect={(id) => setSelected({ kind: "project", id })} />
          )}
          {view === "graph" && (
            <GraphView
              analysis={analysis}
              onSelectProject={(id) => setSelected({ kind: "project", id })}
              onSelectEdge={(e) =>
                setSelected({ kind: "edge", from: e.from.projectId, to: e.to.projectId })
              }
            />
          )}
          {view === "conflicts" && <ConflictsView analysis={analysis} />}
          {view === "whatif" && <WhatIfView analysis={analysis} />}
          {view === "evidence" && <EvidenceView analysis={analysis} />}
        </div>

        <DetailPanel
          analysis={analysis}
          selected={selected}
          onClose={() => setSelected(null)}
        />
      </div>
    </div>
  );
}

/* ------------------------- Summary bar ------------------------- */

function SummaryBar({ analysis }: { analysis: PortfolioAnalysis }) {
  const { counts, portfolioRisk, projects } = analysis;
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6">
      <Metric label="Projects" value={String(projects.length)} />
      <Metric
        label="Conflicts"
        value={String(counts.conflicts)}
        accent={counts.conflicts > 0 ? "var(--color-risk-high)" : undefined}
      />
      <Metric
        label="Sequencing"
        value={String(counts.sequencing)}
        accent={counts.sequencing > 0 ? "var(--color-risk-medium)" : undefined}
      />
      <Metric
        label="Coord. clusters"
        value={String(counts.coordination)}
        accent={counts.coordination > 0 ? "#14b8a6" : undefined}
      />
      <Metric label="Parallel" value={String(counts.parallel)} />
      <Metric
        label="Portfolio risk"
        value={`${portfolioRisk.label} · ${portfolioRisk.score.toFixed(1)}`}
        accent={riskColorVar(portfolioRisk.label)}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-md border bg-background p-2.5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className="mt-0.5 text-sm font-semibold"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

/* ------------------------- Roadmap ------------------------- */

function RoadmapView({
  analysis,
  onSelect,
}: {
  analysis: PortfolioAnalysis;
  onSelect: (id: string) => void;
}) {
  const { waves, criticalPath, bottlenecks, hasCycle } = analysis;
  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">
            Recommended implementation roadmap
          </h3>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {waves.length} wave{waves.length === 1 ? "" : "s"}
          </span>
        </div>
        {hasCycle && (
          <div
            className="mb-3 rounded-md border px-3 py-2 text-[11px]"
            style={{
              borderColor: "color-mix(in oklab, var(--color-risk-medium) 40%, transparent)",
              background: "color-mix(in oklab, var(--color-risk-medium) 8%, transparent)",
              color: "var(--color-risk-medium)",
            }}
          >
            Cyclic dependency detected — the engine fell back to grouping the
            remaining projects in a single wave. Resolve the conflicting
            direction in the evidence layer.
          </div>
        )}
        <div className="space-y-2">
          {waves.map((w, i) => (
            <div key={w.index} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Wave {w.index + 1}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {w.projects.map((p) => (
                  <button
                    key={p.projectId}
                    onClick={() => onSelect(p.projectId)}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-secondary"
                    title={p.projectName}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: countryColorVar(p.country) }}
                    />
                    <span className="font-mono">{p.projectId}</span>
                    <span className="max-w-[160px] truncate text-muted-foreground">
                      {p.projectName}
                    </span>
                  </button>
                ))}
              </div>
              {i < waves.length - 1 && (
                <div className="ml-1 text-muted-foreground">↓</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <h3 className="mb-2 text-sm font-semibold tracking-tight">Critical path</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Longest dependency chain weighted by composite score — delays here
          ripple furthest through the portfolio.
        </p>
        {criticalPath.length < 2 ? (
          <div className="text-xs text-muted-foreground">
            No directional dependencies → no critical path. All projects can run independently.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {criticalPath.map((p, idx) => (
              <span key={p.projectId} className="inline-flex items-center gap-1.5">
                <button
                  onClick={() => onSelect(p.projectId)}
                  className="rounded-md border bg-background px-2 py-1 text-xs hover:bg-secondary"
                >
                  <span className="font-mono">{p.projectId}</span>
                </button>
                {idx < criticalPath.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-surface p-5">
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          Portfolio bottlenecks
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Projects with the highest dependency centrality — they block or are
          blocked by the most siblings.
        </p>
        {bottlenecks.filter((b) => b.centrality > 0).length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No bottlenecks — no directional dependencies in this portfolio.
          </div>
        ) : (
          <ul className="space-y-2">
            {bottlenecks
              .filter((b) => b.centrality > 0)
              .slice(0, 5)
              .map((b) => (
                <li key={b.project.projectId}>
                  <button
                    onClick={() => onSelect(b.project.projectId)}
                    className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left hover:bg-secondary"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: countryColorVar(b.project.country) }}
                      />
                      <span className="font-mono text-xs">{b.project.projectId}</span>
                      <span className="text-xs text-muted-foreground">
                        {b.project.projectName}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      blocks {b.outDegree} · blocked by {b.inDegree}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------- Dependency graph ------------------------- */

function GraphView({
  analysis,
  onSelectProject,
  onSelectEdge,
}: {
  analysis: PortfolioAnalysis;
  onSelectProject: (id: string) => void;
  onSelectEdge: (e: DepEdge) => void;
}) {
  const { waves, edges } = analysis;
  const colW = 200;
  const rowH = 48;
  const padX = 24;
  const padY = 24;
  const cols = Math.max(waves.length, 1);
  const rows = Math.max(...waves.map((w) => w.projects.length), 1);
  const width = padX * 2 + cols * colW;
  const height = padY * 2 + rows * rowH;

  // position lookup
  const pos = new Map<string, { x: number; y: number }>();
  waves.forEach((w, ci) => {
    w.projects.forEach((p, ri) => {
      pos.set(p.projectId, {
        x: padX + ci * colW + colW / 2,
        y: padY + ri * rowH + rowH / 2,
      });
    });
  });

  return (
    <section className="rounded-xl border bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Dependency graph</h3>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          {edges.length} edge{edges.length === 1 ? "" : "s"}
        </span>
      </div>
      {edges.length === 0 ? (
        <div className="rounded-md border bg-background p-6 text-center text-xs text-muted-foreground">
          No directional dependencies in this portfolio.
        </div>
      ) : (
        <div className="overflow-auto rounded-md border bg-background">
          <svg width={width} height={height} className="block">
            <defs>
              <marker
                id="arrow"
                viewBox="0 -5 10 10"
                refX="10"
                refY="0"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,-5L10,0L0,5" fill="currentColor" className="text-muted-foreground" />
              </marker>
            </defs>
            {/* wave column labels */}
            {waves.map((w, ci) => (
              <text
                key={w.index}
                x={padX + ci * colW + colW / 2}
                y={14}
                textAnchor="middle"
                className="fill-muted-foreground font-mono"
                fontSize={10}
              >
                WAVE {w.index + 1}
              </text>
            ))}
            {/* edges */}
            {edges.map((e, i) => {
              const a = pos.get(e.from.projectId);
              const b = pos.get(e.to.projectId);
              if (!a || !b) return null;
              const stroke = e.directionConfirmed
                ? "var(--color-risk-medium)"
                : "color-mix(in oklab, var(--color-risk-medium) 50%, transparent)";
              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onClick={() => onSelectEdge(e)}
                >
                  <line
                    x1={a.x + 60}
                    y1={a.y}
                    x2={b.x - 60}
                    y2={b.y}
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeDasharray={e.directionConfirmed ? "0" : "4 3"}
                    markerEnd="url(#arrow)"
                  />
                </g>
              );
            })}
            {/* nodes */}
            {analysis.projects.map((p) => {
              const pt = pos.get(p.projectId);
              if (!pt) return null;
              const color = countryColorVar(p.country);
              return (
                <g
                  key={p.projectId}
                  className="cursor-pointer"
                  onClick={() => onSelectProject(p.projectId)}
                >
                  <rect
                    x={pt.x - 60}
                    y={pt.y - 16}
                    width={120}
                    height={32}
                    rx={6}
                    fill="var(--color-surface, white)"
                    stroke={color}
                    strokeWidth={1.5}
                  />
                  <text
                    x={pt.x}
                    y={pt.y + 4}
                    textAnchor="middle"
                    fontSize={12}
                    className="fill-foreground font-mono"
                  >
                    {p.projectId}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="font-mono uppercase tracking-wider">Legend</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-px w-6" style={{ background: "var(--color-risk-medium)" }} />
          confirmed direction
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-px w-6"
            style={{
              background:
                "repeating-linear-gradient(90deg, var(--color-risk-medium) 0 4px, transparent 4px 7px)",
            }}
          />
          direction needs confirming
        </span>
      </div>
    </section>
  );
}

/* ------------------------- Conflict center ------------------------- */

function ConflictsView({ analysis }: { analysis: PortfolioAnalysis }) {
  const conflicts = analysis.conflicts;
  return (
    <section className="rounded-xl border bg-surface p-5">
      <h3 className="mb-1 text-sm font-semibold tracking-tight">Conflict center</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Only relationships flagged as governance-conflicting are shown here.
        Resolve these before sequencing the rest of the portfolio.
      </p>
      {conflicts.length === 0 ? (
        <div className="rounded-md border bg-background p-6 text-center text-xs text-muted-foreground">
          No conflicts detected. ✓
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {conflicts.map((r) => (
            <PairCard key={`${r.a.projectId}-${r.b.projectId}`} result={r} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------- What-if ------------------------- */

function WhatIfView({ analysis }: { analysis: PortfolioAnalysis }) {
  const [forced, setForced] = useState<string>(analysis.projects[0]?.projectId ?? "");
  const [blocker, setBlocker] = useState<string>(analysis.projects[1]?.projectId ?? "");
  const result = forced && blocker && forced !== blocker
    ? simulateForceStart(analysis, forced, blocker)
    : null;
  return (
    <section className="rounded-xl border bg-surface p-5">
      <h3 className="mb-1 text-sm font-semibold tracking-tight">What-if simulation</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Force a project to start before another and see whether a prerequisite
        dependency is violated. Impact is expressed as a risk-level change only —
        the system does not hold implementation timeline data.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-mono uppercase tracking-wider text-muted-foreground">
            Force start
          </span>
          <select
            value={forced}
            onChange={(e) => setForced(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-xs"
          >
            {analysis.projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.projectId} — {p.projectName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-mono uppercase tracking-wider text-muted-foreground">
            Before
          </span>
          <select
            value={blocker}
            onChange={(e) => setBlocker(e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-xs"
          >
            {analysis.projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.projectId} — {p.projectName}
              </option>
            ))}
          </select>
        </label>
      </div>
      {result && (
        <div
          className="mt-4 rounded-md border p-4"
          style={{
            borderColor: result.ok
              ? "color-mix(in oklab, var(--color-risk-low) 40%, transparent)"
              : "color-mix(in oklab, var(--color-risk-high) 40%, transparent)",
            background: result.ok
              ? "color-mix(in oklab, var(--color-risk-low) 6%, transparent)"
              : "color-mix(in oklab, var(--color-risk-high) 6%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {result.ok ? "Safe to proceed" : "⚠ Prerequisite dependency violated"}
          </div>
          <p className="mt-2 text-xs">{result.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <span>
              <span className="font-mono uppercase tracking-wider text-muted-foreground">
                Risk
              </span>{" "}
              <span style={{ color: riskColorVar(result.riskBefore) }}>{result.riskBefore}</span>
              {" → "}
              <span style={{ color: riskColorVar(result.riskAfter) }}>{result.riskAfter}</span>
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{result.recommendation}</p>
        </div>
      )}
    </section>
  );
}

/* ------------------------- Evidence ------------------------- */

function EvidenceView({ analysis }: { analysis: PortfolioAnalysis }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const grouped: Record<keyof typeof OUTCOME_META, PairResult[]> = {
    Redesign: [],
    Sequence: [],
    Coordinate: [],
    Parallel: [],
  };
  for (const p of analysis.pairs) grouped[p.outcome].push(p);

  return (
    <section className="rounded-xl border bg-surface p-5">
      <h3 className="mb-1 text-sm font-semibold tracking-tight">Pairwise evidence</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Every project pair the engine evaluated, grouped by gate outcome.
        These are the raw inputs behind the roadmap above — not the primary view.
      </p>
      <div className="space-y-2">
        {(Object.keys(grouped) as Array<keyof typeof grouped>).map((k) => {
          const list = grouped[k];
          const meta = OUTCOME_META[k];
          const isOpen = open[k] ?? false;
          return (
            <div key={k} className="rounded-md border bg-background">
              <button
                onClick={() => setOpen((o) => ({ ...o, [k]: !isOpen }))}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: meta.dot }}
                  />
                  <span className="font-medium">{meta.label}</span>
                  <span className="font-mono text-muted-foreground">{list.length}</span>
                </span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {isOpen && list.length > 0 && (
                <div className="grid gap-3 border-t p-3 md:grid-cols-2">
                  {list.map((r) => (
                    <PairCard key={`${r.a.projectId}-${r.b.projectId}`} result={r} />
                  ))}
                </div>
              )}
              {isOpen && list.length === 0 && (
                <div className="border-t p-3 text-xs text-muted-foreground">
                  No pairs in this category.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------- Detail / Explainability panel ------------------------- */

function DetailPanel({
  analysis,
  selected,
  onClose,
}: {
  analysis: PortfolioAnalysis;
  selected:
    | { kind: "project"; id: string }
    | { kind: "edge"; from: string; to: string }
    | null;
  onClose: () => void;
}) {
  if (!selected) {
    return (
      <aside className="sticky top-4 hidden h-fit rounded-xl border bg-surface p-4 lg:block">
        <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-foreground">
          <Info size={12} /> Explainability
        </div>
        <p className="text-xs text-muted-foreground">
          Click any project, edge, or roadmap item to inspect why the engine
          placed it where it did, with confidence and original evidence.
        </p>
      </aside>
    );
  }

  if (selected.kind === "project") {
    const p = analysis.projects.find((x) => x.projectId === selected.id);
    if (!p) return null;
    const wave = analysis.waves.findIndex((w) =>
      w.projects.some((x) => x.projectId === p.projectId),
    );
    const incoming = analysis.edges.filter((e) => e.to.projectId === p.projectId);
    const outgoing = analysis.edges.filter((e) => e.from.projectId === p.projectId);
    return (
      <aside className="sticky top-4 h-fit rounded-xl border bg-surface p-4">
        <PanelHeader title={`${p.projectId} · ${p.projectName}`} onClose={onClose} />
        <div className="mt-3 space-y-3 text-xs">
          <Row label="Country" value={p.country} />
          <Row label="Wave" value={wave >= 0 ? `Wave ${wave + 1}` : "—"} />
          <Row label="Composite" value={`${composite(p)} / 15`} />
          <Row label="Lead agency" value={p.implementingAgency} />
          <Row label="Interaction" value={p.interactionType} />
          <div>
            <div className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
              Blocks ({outgoing.length})
            </div>
            {outgoing.length === 0 ? (
              <div className="mt-1 text-muted-foreground">—</div>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {outgoing.map((e) => (
                  <li key={`${e.to.projectId}`} className="font-mono">
                    → {e.to.projectId}{" "}
                    {!e.directionConfirmed && (
                      <span className="text-[10px] text-muted-foreground">(direction tentative)</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
              Blocked by ({incoming.length})
            </div>
            {incoming.length === 0 ? (
              <div className="mt-1 text-muted-foreground">—</div>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {incoming.map((e) => (
                  <li key={`${e.from.projectId}`} className="font-mono">
                    ← {e.from.projectId}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // edge
  const edge = analysis.edges.find(
    (e) => e.from.projectId === selected.from && e.to.projectId === selected.to,
  );
  if (!edge) return null;
  const conf = edge.directionConfirmed ? "Medium" : "Low";
  return (
    <aside className="sticky top-4 h-fit rounded-xl border bg-surface p-4">
      <PanelHeader
        title={`${edge.from.projectId} → ${edge.to.projectId}`}
        onClose={onClose}
      />
      <div className="mt-3 space-y-3 text-xs">
        <Row label="Type" value="Sequence" />
        <Row label="Direction" value={edge.directionConfirmed ? "Confirmed" : "Tentative"} />
        <Row label="Confidence" value={conf} />
        <div>
          <div className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
            Why this dependency exists
          </div>
          <p className="mt-1 leading-relaxed">{edge.pair.reason}</p>
        </div>
        {edge.pair.flags.length > 0 && (
          <div>
            <div className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
              Flags
            </div>
            <ul className="mt-1 space-y-0.5">
              {edge.pair.flags.map((f, i) => (
                <li key={i}>· {f}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-md border bg-background p-2 text-[11px] text-muted-foreground">
          <GitBranch size={11} className="mr-1 inline" />
          Evidence drawn from the projects' interaction notes and dimension
          scores. See the Evidence tab for the raw pair card.
        </div>
      </div>
    </aside>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="text-sm font-semibold leading-snug">{title}</div>
      <button
        onClick={onClose}
        className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
        {label}
      </span>
      <span className="text-right">{value}</span>
    </div>
  );
}
