import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, ChevronUp, Save, Trash2, Plus } from "lucide-react";
import { RiskHero } from "./RiskHero";
import { EmptyState } from "./EmptyState";
import {
  CountryCode,
  DIMENSION_LABELS,
  FOCUS_COUNTRIES,
  InteractionType,
  RiskLevel,
  countryColorVar,
  countryProxyInfo,
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
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
            <>
              <RiskHero
                interaction={stats.dominantInteraction}
                composite={stats.avgScore}
                risk={stats.overallRisk}
                context={`Dominant interaction across ${stats.count} parallel investment${stats.count === 1 ? "" : "s"}. GTMI tier ${stats.gtmiTier}.`}
              />
              <ProxyFlag info={countryProxyInfo(projects, code)} />
            </>
          )}
        </section>


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
                            <Link
                              to="/project/$projectId"
                              params={{ projectId: p.projectId }}
                              className="hover:underline"
                            >
                              {p.projectName}
                            </Link>
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
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to="/project/$projectId"
                                params={{ projectId: p.projectId }}
                                className="rounded px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                              >
                                View details →
                              </Link>
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
                            </div>
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

function ProxyFlag({ info }: { info: ReturnType<typeof countryProxyInfo> }) {
  const [open, setOpen] = useState(false);
  if (!info.hasProxy) return null;
  const AMBER = "var(--color-risk-medium)";
  return (
    <div className="relative mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] italic transition"
        style={{
          borderColor: `color-mix(in oklab, ${AMBER} 45%, transparent)`,
          background: `color-mix(in oklab, ${AMBER} 10%, transparent)`,
          color: AMBER,
        }}
        aria-expanded={open}
      >
        <span aria-hidden>⚑</span>
        Score includes proxy estimates — see project details.
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-20 mt-1 w-[320px] rounded-md border bg-surface p-3 shadow-md"
          style={{ borderColor: `color-mix(in oklab, ${AMBER} 35%, transparent)` }}
        >
          <div className="mb-1.5 text-[10px] font-mono uppercase tracking-wider" style={{ color: AMBER }}>
            Proxy-scored dimensions
          </div>
          <ul className="space-y-1.5 text-[11px]">
            {info.entries.map((e) => (
              <li key={e.projectId} className="leading-snug">
                <span className="font-mono text-muted-foreground">{e.projectId}</span>{" "}
                <span className="font-medium">{e.projectName}</span>
                <div className="text-muted-foreground">
                  {e.dimensions.map((d) => DIMENSION_LABELS[d] ?? d).join(" · ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
