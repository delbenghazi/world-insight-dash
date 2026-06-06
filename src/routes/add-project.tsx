import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Download } from "lucide-react";
import { WorkflowNav } from "@/components/WorkflowNav";
import {
  CountryCode,
  FOCUS_COUNTRIES,
  InteractionType,
  Project,
  RiskLevel,
  useProjectStore,
} from "@/lib/project-data";
import { normalizeCountry } from "@/lib/countries";
import templateAsset from "@/assets/Template_Capstone.xlsx.asset.json";

export const Route = createFileRoute("/add-project")({
  head: () => ({
    meta: [
      { title: "Add Project — DPI Sequencing Atlas" },
      { name: "description", content: "Import projects from Excel and validate the interaction matrix." },
    ],
  }),
  component: AddProject,
});

const RISK_LOOKUP: Record<string, RiskLevel> = {
  L: "Low", LOW: "Low", M: "Medium", MEDIUM: "Medium", H: "High", HIGH: "High",
};

interface ValidationIssue {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

function pick(r: Record<string, any>, ...keys: string[]) {
  for (const k of keys) {
    for (const actual of Object.keys(r)) {
      if (actual.replace(/\s+/g, " ").trim().toLowerCase().startsWith(k.toLowerCase())) {
        return r[actual];
      }
    }
  }
  return "";
}

function AddProject() {
  const { projects, setProjects } = useProjectStore();
  const [rows, setRows] = useState<Project[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  async function handleFile(f: File) {
    setFileName(f.name);
    setImported(false);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf);
    // Prefer "Interaction Matrix" sheet if present; otherwise first sheet
    const sheetName = wb.SheetNames.find((s) => /interaction/i.test(s)) ?? wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    // Template uses two header rows; row 1 is section group, row 2 is the field name.
    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", range: 1 });
    const { parsed, issues } = validate(raw);
    setRows(parsed);
    setIssues(issues);
  }

  function commit() {
    const merged = [...projects.filter((p) => !rows.find((r) => r.projectId === p.projectId)), ...rows];
    setProjects(merged);
    setImported(true);
  }

  const errCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="min-h-screen bg-background">
      <WorkflowNav active="add" />

      <main className="mx-auto max-w-6xl px-6 py-10">

        <h1 className="text-3xl font-semibold tracking-tight">Import projects</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Use the official Capstone template. We validate country names, duplicate IDs, 1–3 score
          ranges, linked-project references, and composite-score consistency before committing
          rows to the atlas.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <label className="group relative flex h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-surface-elevated transition hover:border-primary hover:bg-primary-soft/40">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Upload size={28} className="text-muted-foreground transition group-hover:text-primary" />
            <div className="mt-3 text-sm font-medium">
              {fileName ?? "Drop or select an Excel file"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              .xlsx · .xls · .csv — Interaction Matrix sheet is parsed
            </div>
          </label>

          <a
            href={templateAsset.url}
            download="Template_Capstone.xlsx"
            className="group flex h-64 flex-col items-center justify-center rounded-xl border bg-surface p-6 text-center transition hover:border-primary hover:bg-primary-soft/30"
          >
            <FileSpreadsheet size={28} className="text-muted-foreground transition group-hover:text-primary" />
            <div className="mt-3 text-base font-semibold">Blank Template</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Official Parallel Investment Interaction Matrix — pre-formatted with the codebook,
              dropdowns, and 1–3 scoring rules.
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
              <Download size={12} /> Download .xlsx
            </span>
          </a>
        </div>

        {rows.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Validation</h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                {rows.length} rows
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  background: errCount
                    ? "color-mix(in oklab, var(--color-destructive) 15%, transparent)"
                    : "color-mix(in oklab, var(--color-risk-low) 18%, transparent)",
                  color: errCount ? "var(--color-destructive)" : "var(--color-risk-low)",
                }}
              >
                {errCount} errors
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                {warnCount} warnings
              </span>
              <button
                onClick={commit}
                disabled={errCount > 0 || imported}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
              >
                {imported ? (
                  <>
                    <CheckCircle2 size={14} /> Imported
                  </>
                ) : (
                  "Commit to atlas"
                )}
              </button>
            </div>

            {issues.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Field</th>
                      <th className="px-3 py-2 text-left">Issue</th>
                      <th className="px-3 py-2 text-left">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((i, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2 font-mono">{i.row}</td>
                        <td className="px-3 py-2">{i.field}</td>
                        <td className="px-3 py-2">{i.message}</td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5"
                            style={{
                              color:
                                i.severity === "error"
                                  ? "var(--color-destructive)"
                                  : "var(--color-risk-medium)",
                            }}
                          >
                            <AlertTriangle size={10} /> {i.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    {["Country", "ID", "Name", "Type", "GTMI", "Composite", "Risk", "Interaction"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((p) => (
                    <tr key={p.projectId} className="border-t">
                      <td className="px-3 py-2">{FOCUS_COUNTRIES[p.country]?.name ?? p.country}</td>
                      <td className="px-3 py-2 font-mono">{p.projectId}</td>
                      <td className="px-3 py-2">{p.projectName}</td>
                      <td className="px-3 py-2">{p.projectType}</td>
                      <td className="px-3 py-2">{p.gtmiTier}</td>
                      <td className="px-3 py-2 font-mono">{p.compositeScore}/15</td>
                      <td className="px-3 py-2">{p.overallRisk}</td>
                      <td className="px-3 py-2">{p.interactionType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function validate(raw: Record<string, any>[]) {
  const issues: ValidationIssue[] = [];
  const parsed: Project[] = [];
  const seenIds = new Set<string>();

  raw.forEach((r, i) => {
    const row = i + 3; // two-row header offset
    const countryRaw = String(pick(r, "Country") ?? "").trim();
    if (!countryRaw) return; // skip blank rows
    const code = normalizeCountry(countryRaw);
    if (!code) {
      issues.push({
        row, field: "Country", severity: "error",
        message: `"${countryRaw}" is not a recognized country (ISO 3166).`,
      });
    }
    const projectId = String(pick(r, "Project ID") ?? "").trim();
    if (!projectId) {
      issues.push({ row, field: "Project ID", severity: "error", message: "Missing." });
      return;
    }
    if (seenIds.has(projectId)) {
      issues.push({ row, field: "Project ID", severity: "error", message: `Duplicate "${projectId}".` });
    }
    seenIds.add(projectId);

    const dims: Array<[string, keyof Project]> = [
      ["Inst. Load", "dim1_institutional"],
      ["Reg. Deps", "dim2_regulatory"],
      ["Tech. Deps", "dim3_technical"],
      ["Pol. Sensitivity", "dim4_political"],
      ["Invest. Needs", "dim5_investment"],
    ];
    const scores: Record<string, number> = {};
    for (const [label, key] of dims) {
      const v = Number(pick(r, `${label} Score`, label));
      if (!Number.isFinite(v) || v < 1 || v > 3) {
        issues.push({ row, field: label, severity: "error", message: `Must be 1–3, got "${pick(r, `${label} Score`, label)}".` });
      }
      scores[key as string] = v;
    }

    const composite = Number(pick(r, "Composite"));
    const sum = scores.dim1_institutional + scores.dim2_regulatory + scores.dim3_technical + scores.dim4_political + scores.dim5_investment;
    if (Number.isFinite(composite) && Math.abs(composite - sum) > 1) {
      issues.push({
        row, field: "Composite", severity: "warning",
        message: `Stored ${composite} differs from dimension sum ${sum}.`,
      });
    }

    const linked = String(pick(r, "Linked Project") ?? "")
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const riskRaw = String(pick(r, "Overall Risk") ?? "Medium").trim().toUpperCase();
    const overallRisk: RiskLevel = RISK_LOOKUP[riskRaw] ?? "Medium";

    parsed.push({
      country: code ?? countryRaw.toUpperCase(),
      projectId,
      projectName: String(pick(r, "Project Name") ?? "").trim(),
      projectType: String(pick(r, "Project Type") ?? "").trim(),
      leadDonor: String(pick(r, "Lead Donor", "Donor") ?? "").trim(),
      implementingAgency: String(pick(r, "Implementing Agency", "Agency") ?? "").trim(),
      gtmiTier: String(pick(r, "GTMI Tier") ?? "B").trim(),
      startDate: String(pick(r, "Start Date") ?? "").trim(),
      endDate: String(pick(r, "End Date") ?? "").trim(),
      dim1_institutional: scores.dim1_institutional,
      dim1_note: String(pick(r, "Inst. Load Note") ?? "").trim(),
      dim2_regulatory: scores.dim2_regulatory,
      dim2_note: String(pick(r, "Reg. Deps Note") ?? "").trim(),
      dim3_technical: scores.dim3_technical,
      dim3_note: String(pick(r, "Tech. Deps Note") ?? "").trim(),
      dim4_political: scores.dim4_political,
      dim4_note: String(pick(r, "Pol. Sensitivity Note") ?? "").trim(),
      dim5_investment: scores.dim5_investment,
      dim5_note: String(pick(r, "Invest. Needs Note") ?? "").trim(),
      compositeScore: Number.isFinite(composite) ? composite : sum,
      interactionType: (String(pick(r, "Interaction Type") ?? "Complementary").trim() as InteractionType),
      linkedProjectIds: linked,
      interactionNote: String(pick(r, "Interaction Note") ?? "").trim(),
      overallRisk,
    });
  });

  // Cross-row: missing linked project IDs
  parsed.forEach((p, i) => {
    for (const linked of p.linkedProjectIds) {
      if (!seenIds.has(linked)) {
        issues.push({
          row: i + 3,
          field: "Linked Project IDs",
          severity: "warning",
          message: `Linked "${linked}" not present in this import or existing atlas.`,
        });
      }
    }
  });

  return { parsed, issues };
}
