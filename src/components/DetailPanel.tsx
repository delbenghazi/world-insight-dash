import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, ChevronUp, Save, Sparkles, Trash2, Plus } from "lucide-react";
import { RiskHero } from "./RiskHero";
import { EmptyState } from "./EmptyState";
import {
  CountryCode,
  FOCUS_COUNTRIES,
  InteractionType,
  RiskLevel,
  countryColorVar,
  countryStats,
  projectsByCountry,
  riskColorVar,
  useProjectStore,
} from "@/lib/project-data";

const INTERACTIONS: InteractionType[] = [
  "Complementary",
  "Sequentially Dependent",
  "Institutionally Competing",
  "Governance-Conflicting",
];
const RISKS: RiskLevel[] = ["Low", "Medium", "High"];

export function DetailPanel({ code }: { code: CountryCode }) {
  const { projects, summaries, updateSummary, removeProject, setSelectedCountry } =
    useProjectStore();
  const country = FOCUS_COUNTRIES[code];
  const stats = countryStats(projects, code);
  const list = projectsByCountry(projects, code);

  useEffect(() => {
    setSelectedCountry(code);
  }, [code, setSelectedCountry]);

  const [draft, setDraft] = useState(summaries[code]?.summary ?? "");
  const [saved, setSaved] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setDraft(summaries[code]?.summary ?? "");
    setSaved(true);
  }, [code, summaries]);

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [intFilter, setIntFilter] = useState<string>("all");

  const projectTypes = useMemo(
    () => Array.from(new Set(list.map((p) => p.projectType))),
    [list]
  );

  const filtered = list.filter((p) => {
    if (typeFilter !== "all" && p.projectType !== typeFilter) return false;
    if (riskFilter !== "all" && p.overallRisk !== riskFilter) return false;
    if (intFilter !== "all" && p.interactionType !== intFilter) return false;
    return true;
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [code]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-3 border-b bg-surface px-6 py-4">
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: countryColorVar(code) }}
        />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {country?.region}
          </div>
          <div className="text-lg font-semibold tracking-tight">
            {country?.name ?? code} portfolio
          </div>
        </div>
        <div className="ml-auto text-[11px] text-muted-foreground">
          {stats.count} project{stats.count === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero: classification + composite */}
        <section className="px-6 pt-6">
          {list.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No projects in this country yet"
              description="Add a project to run an interaction assessment and see how it sequences with existing investments."
              action={{ label: "Add a project", to: "/add-project" }}
            />
          ) : (
            <RiskHero
              interaction={stats.dominantInteraction}
              composite={stats.avgScore}
              risk={stats.overallRisk}
              context={`Dominant interaction across ${stats.count} parallel investment${stats.count === 1 ? "" : "s"}. GTMI tier ${stats.gtmiTier}.`}
            />
          )}
        </section>

        {/* Advisor CTA */}
        {list.length > 0 && (
          <section className="mt-5 px-6">
            <div className="flex items-center gap-4 rounded-xl border bg-surface p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                <Sparkles size={16} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">
                  Consult the Portfolio Advisor on {country?.name ?? code}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  Ask sequencing, coordination, and mandate-overlap questions about this portfolio.
                </div>
              </div>
              <button
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-advisor"))
                }
                className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Open advisor →
              </button>
            </div>
          </section>
        )}

        {/* Country summary */}
        {list.length > 0 && (
          <section className="mt-6 px-6">
            <div className="rounded-xl border bg-surface p-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Sequencing implications</h3>
                <button
                  onClick={() => {
                    updateSummary(code, draft);
                    setSaved(true);
                  }}
                  disabled={saved}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition disabled:cursor-default disabled:bg-secondary disabled:text-muted-foreground"
                >
                  {saved ? (
                    <>
                      <Check size={12} /> Saved
                    </>
                  ) : (
                    <>
                      <Save size={12} /> Save
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSaved(false);
                }}
                rows={4}
                placeholder="Capture what to sequence, coordinate, or flag for this country."
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-ring/40 focus:ring-2"
              />
            </div>
          </section>
        )}

        {/* Projects — collapsed by default */}
        {list.length > 0 && (
          <section className="mt-6 px-6 pb-10">
            <button
              onClick={() => setShowDetails((s) => !s)}
              className="flex w-full items-center justify-between rounded-md border bg-surface px-4 py-3 text-sm font-medium hover:bg-secondary"
            >
              <span>
                Project details ({list.length})
              </span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDetails && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Select
                    label="Type"
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={["all", ...projectTypes]}
                  />
                  <Select
                    label="Risk"
                    value={riskFilter}
                    onChange={setRiskFilter}
                    options={["all", ...RISKS]}
                  />
                  <Select
                    label="Interaction"
                    value={intFilter}
                    onChange={setIntFilter}
                    options={["all", ...INTERACTIONS]}
                  />
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary text-muted-foreground">
                      <tr>
                        {["ID", "Name", "Interaction", "Composite", "Risk", ""].map((h) => (
                          <th
                            key={h || "action"}
                            className="px-3 py-2 text-left font-medium uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.projectId} className="border-t align-top hover:bg-secondary/50">
                          <td className="px-3 py-2 font-mono">{p.projectId}</td>
                          <td className="px-3 py-2 font-medium">
                            <div>{p.projectName}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {p.interactionNote}
                            </div>
                          </td>
                          <td className="px-3 py-2">{p.interactionType}</td>
                          <td className="px-3 py-2 font-mono">{p.compositeScore}/15</td>
                          <td className="px-3 py-2">
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                background: `color-mix(in oklab, ${riskColorVar(p.overallRisk)} 18%, transparent)`,
                                color: riskColorVar(p.overallRisk),
                              }}
                            >
                              {p.overallRisk}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => {
                                if (confirm(`Remove project "${p.projectName}"?`)) {
                                  removeProject(p.projectId);
                                }
                              }}
                              className="rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                              title="Remove project"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                            No projects match the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Next step */}
            <div className="mt-6 flex items-center justify-between rounded-md border border-dashed bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
              <span>Next: compare this country with others</span>
              <Link
                to="/compare"
                className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background hover:opacity-90"
              >
                Open compare →
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xs outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? "All" : o}
          </option>
        ))}
      </select>
    </label>
  );
}
