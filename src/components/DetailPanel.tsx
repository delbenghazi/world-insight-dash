import { useEffect, useMemo, useState } from "react";
import { Check, Save, Trash2 } from "lucide-react";
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
  const { projects, summaries, updateSummary, removeProject } = useProjectStore();
  const country = FOCUS_COUNTRIES[code];
  const stats = countryStats(projects, code);
  const list = projectsByCountry(projects, code);

  const [draft, setDraft] = useState(summaries[code]?.summary ?? "");
  const [saved, setSaved] = useState(true);

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

  return (
    <div className="flex h-full flex-col overflow-hidden border-l bg-surface">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: countryColorVar(code) }}
        />
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {country.region}
          </div>
          <div className="text-lg font-semibold">{country.name}</div>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <Pill label="GTMI" value={stats.gtmiTier} />
          <Pill label="Avg" value={`${stats.avgScore.toFixed(1)}/15`} />
          <Pill
            label="Risk"
            value={stats.overallRisk}
            color={riskColorVar(stats.overallRisk)}
          />
          <Pill label="Projects" value={String(stats.count)} />
        </div>
      </div>

      <div className="overflow-y-auto">
        {/* Editable summary */}
        <section className="border-b px-6 py-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Country summary</h3>
            <button
              onClick={() => {
                updateSummary(code, draft);
                setSaved(true);
              }}
              disabled={saved}
              className="inline-flex items-center gap-1.5 rounded-md border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition disabled:cursor-default disabled:bg-secondary disabled:text-muted-foreground"
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
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-ring/40 focus:ring-2"
          />
        </section>

        {/* Filters */}
        <section className="px-6 pt-5">
          <h3 className="text-sm font-semibold">Projects</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
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
        </section>

        {/* Table */}
        <section className="px-6 pb-8 pt-3">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-secondary text-muted-foreground">
                <tr>
                  {["ID", "Name", "Type", "GTMI", "Composite", "Interaction", "Risk", "Linked"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-medium uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.projectId} className="border-t align-top hover:bg-secondary/50">
                    <td className="px-3 py-2 font-mono">{p.projectId}</td>
                    <td className="px-3 py-2 font-medium">
                      <div>{p.projectName}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{p.interactionNote}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{p.projectType}</td>
                    <td className="px-3 py-2 font-mono">{p.gtmiTier}</td>
                    <td className="px-3 py-2 font-mono">{p.compositeScore}/15</td>
                    <td className="px-3 py-2">{p.interactionType}</td>
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
                    <td className="px-3 py-2 font-mono text-muted-foreground">{p.linkedProjectIds.join(", ")}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      No projects match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Pill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-semibold" style={color ? { color } : undefined}>
        {value}
      </span>
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
