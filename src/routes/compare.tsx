import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  countriesInUse,
  countryColorVar,
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
  const codes = countriesInUse(projects);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Back to atlas
          </Link>
          <div className="ml-auto text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Comparison · {codes.length} {codes.length === 1 ? "country" : "countries"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Comparison view</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Compare average composite scores, project volume, dominant interaction types,
          institutional bottlenecks, and sequencing implications across every country in
          the imported portfolio.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {codes.map((code) => {
            const c = FOCUS_COUNTRIES[code] ?? { name: code, region: "Other", tone: code };
            const stats = countryStats(projects, code);
            const list = projectsByCountry(projects, code);
            const interactions = countByKey(list, "interactionType");
            const bottlenecks = list.filter(
              (p) => p.interactionType === "Institutionally Competing" || p.interactionType === "Governance-Conflicting"
            );
            return (
              <div key={code} className="rounded-xl border bg-surface p-5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: countryColorVar(code) }} />
                  <div className="text-lg font-semibold">{c.name}</div>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{code}</span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <Box label="GTMI" value={stats.gtmiTier} />
                  <Box label="Avg" value={`${stats.avgScore.toFixed(1)}/15`} />
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
      </main>
    </div>
  );
}

function Box({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border bg-background p-2">
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
