import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { WorkflowNav } from "@/components/WorkflowNav";
import { EmptyState } from "@/components/EmptyState";
import {
  countriesInUse,
  countryColorVar,
  countryProxyInfo,
  countryStats,
  FOCUS_COUNTRIES,
  projectsByCountry,
  riskColorVar,
  useProjectStore,
} from "@/lib/project-data";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare countries — DT Global GovTech Atlas" },
      {
        name: "description",
        content:
          "Side-by-side comparison of imported countries on DPI sequencing.",
      },
    ],
  }),
  component: Compare,
});

function Compare() {
  const { projects, summaries } = useProjectStore();
  const available = countriesInUse(projects);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const codes = confirmed ? selected : [];

  const toggle = (code: string) =>
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
  return (
    <div className="min-h-screen bg-background">
      <WorkflowNav />

      <main className="mx-auto max-w-7xl px-6 py-10">

        <h1 className="text-3xl font-semibold tracking-tight">Comparison view</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Select the countries you want to compare side-by-side on composite scores,
          project volume, dominant interaction types, institutional bottlenecks, and
          sequencing implications.
        </p>

        <div className="mt-8 rounded-xl border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Choose countries · {selected.length} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(selected.length === available.length ? [] : [...available])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {selected.length === available.length ? "Clear" : "Select all"}
              </button>
              <button
                onClick={() => setConfirmed(true)}
                disabled={selected.length < 1}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                Compare
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {available.map((code) => {
              const c = FOCUS_COUNTRIES[code] ?? { name: code };
              const on = selected.includes(code);
              return (
                <button
                  key={code}
                  onClick={() => { toggle(code); setConfirmed(false); }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-primary bg-primary/10 text-foreground" : "bg-background hover:bg-secondary"}`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: countryColorVar(code) }} />
                  {c.name}
                  {on && <Check size={12} />}
                </button>
              );
            })}
            {available.length === 0 && (
              <div className="text-xs text-muted-foreground">No countries in the portfolio yet.</div>
            )}
          </div>
        </div>

        {available.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No portfolios to compare yet"
              description="Add at least one project to the atlas, then return here to compare countries side-by-side."
              action={{ label: "Add a project", to: "/add-project" }}
            />
          </div>
        ) : !confirmed ? (
          <div className="mt-8">
            <EmptyState
              title="Pick countries to compare"
              description="Select one or more countries above and press Compare to see composite scores, dominant interactions, and bottlenecks side-by-side."
            />
          </div>
        ) : null}


        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {codes.map((code) => {
            const c = FOCUS_COUNTRIES[code] ?? { name: code, region: "Other", tone: code };
            const stats = countryStats(projects, code);
            const list = projectsByCountry(projects, code);
            const proxy = countryProxyInfo(projects, code);
            const interactions = countByKey(list, "interactionType");
            const bottlenecks = list.filter(
              (p) => p.interactionType === "Institutionally Competing" || p.interactionType === "Governance-Conflicting"
            );
            const avgLabel = `${proxy.hasProxy ? "~" : ""}${stats.avgScore.toFixed(1)}/15`;
            return (
              <div key={code} className="rounded-xl border bg-surface p-5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: countryColorVar(code) }} />
                  <div className="text-lg font-semibold">{c.name}</div>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{code}</span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <Box label="GTMI" value={stats.gtmiTier} />
                  <Box
                    label="Avg"
                    value={avgLabel}
                    title={proxy.hasProxy ? "Includes one or more proxy-scored dimensions" : undefined}
                  />
                  <Box label="Projects" value={String(stats.count)} />
                  <Box label="Risk" value={stats.overallRisk} color={riskColorVar(stats.overallRisk)} />
                </div>

                <div className="mt-5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Interaction mix
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {Object.entries(interactions).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span>{k}</span>
                            <span className="font-mono text-muted-foreground">{v}</span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded bg-secondary">
                            <div
                              className="h-full"
                              style={{
                                width: `${(v / Math.max(list.length, 1)) * 100}%`,
                                background: countryColorVar(code),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Institutional bottlenecks
                  </div>
                  {bottlenecks.length === 0 ? (
                    <div className="mt-2 text-xs text-muted-foreground">None flagged.</div>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs">
                      {bottlenecks.map((b) => (
                        <li key={b.projectId} className="flex gap-2">
                          <span className="font-mono text-muted-foreground">{b.projectId}</span>
                          <span>{b.projectName}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 border-t pt-4">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Sequencing implications
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {summaries[code]?.summary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {codes.some((code) => countryProxyInfo(projects, code).hasProxy) && (
          <div
            className="mt-6 rounded-md border px-3 py-2 text-[11px] italic"
            style={{
              borderColor: "color-mix(in oklab, var(--color-risk-medium) 40%, transparent)",
              background: "color-mix(in oklab, var(--color-risk-medium) 8%, transparent)",
              color: "var(--color-risk-medium)",
            }}
          >
            <span className="font-mono not-italic">~</span> indicates one or more proxy-scored dimensions in the country's composite.
          </div>
        )}
      </main>
    </div>
  );
}

function Box({ label, value, color, title }: { label: string; value: string; color?: string; title?: string }) {
  return (
    <div className="rounded-md border bg-background p-2" title={title}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function countByKey<T extends Record<string, any>>(rows: T[], key: keyof T): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const k = String(r[key]);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}
