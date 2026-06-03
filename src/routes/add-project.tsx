import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import {
  CountryCode,
  FOCUS_COUNTRIES,
  InteractionType,
  Project,
  RiskLevel,
  useProjectStore,
} from "@/lib/project-data";

export const Route = createFileRoute("/add-project")({
  head: () => ({
    meta: [
      { title: "Add Project — DPI Sequencing Atlas" },
      { name: "description", content: "Import projects from Excel and validate the interaction matrix." },
    ],
  }),
  component: AddProject,
});

const REQUIRED = [
  "Country",
  "Project ID",
  "Project Name",
  "Project Type",
  "GTMI Tier",
  "Dim1 Absorption",
  "Dim2 Regulatory",
  "Dim3 Technical",
  "Dim4 Political",
  "Dim5 Investment",
  "Interaction Type",
  "Linked Project IDs",
  "Notes",
  "Composite Score",
  "Overall Risk",
];

const COUNTRY_LOOKUP: Record<string, CountryCode> = {
  GUATEMALA: "GTM",
  GTM: "GTM",
  HONDURAS: "HND",
  HND: "HND",
  "EL SALVADOR": "SLV",
  SLV: "SLV",
};

interface ValidationIssue {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
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
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
    const { parsed, issues } = validate(raw);
    setRows(parsed);
    setIssues(issues);
  }

  function commit() {
    const merged = [...projects.filter((p) => !rows.find((r) => r.projectId === p.projectId)), ...rows];
    setProjects(merged);
    setImported(true);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      REQUIRED,
      [
        "Guatemala", "GT-010", "Sample Project", "Foundational DPI", "Tier 2",
        3, 3, 3, 3, 3, "Complementary", "", "Sample note", 3.0, "Medium",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, "dpi-projects-template.xlsx");
  }

  const errCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Back to atlas
          </Link>
          <div className="ml-auto text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Add Project · Excel import
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Import projects</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Upload an Excel file shaped like the interaction matrix. We validate country names,
          duplicate IDs, score ranges, linked-project references, and composite-score consistency
          before committing rows to the atlas.
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
              .xlsx · .xls · .csv — first sheet is parsed
            </div>
          </label>

          <div className="rounded-xl border bg-surface p-5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} />
              <h3 className="text-sm font-semibold">Expected columns</h3>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              {REQUIRED.map((c) => (
                <li key={c} className="font-mono">· {c}</li>
              ))}
            </ul>
            <button
              onClick={downloadTemplate}
              className="mt-4 w-full rounded-md border bg-secondary px-3 py-2 text-xs font-medium hover:bg-secondary/70"
            >
              Download blank template
            </button>
          </div>
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
                      <td className="px-3 py-2 font-mono">{p.compositeScore.toFixed(2)}</td>
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
    const row = i + 2; // header offset
    const countryRaw = String(r["Country"] ?? "").trim().toUpperCase();
    const code = COUNTRY_LOOKUP[countryRaw];
    if (!code) {
      issues.push({
        row, field: "Country", severity: "error",
        message: `"${r["Country"]}" is not in scope (Guatemala/Honduras/El Salvador).`,
      });
    }
    const projectId = String(r["Project ID"] ?? "").trim();
    if (!projectId) {
      issues.push({ row, field: "Project ID", severity: "error", message: "Missing." });
    } else if (seenIds.has(projectId)) {
      issues.push({ row, field: "Project ID", severity: "error", message: `Duplicate "${projectId}".` });
    }
    seenIds.add(projectId);

    const dims = [
      ["Dim1 Absorption", "dim1_absorption"],
      ["Dim2 Regulatory", "dim2_regulatory"],
      ["Dim3 Technical", "dim3_technical"],
      ["Dim4 Political", "dim4_political"],
      ["Dim5 Investment", "dim5_investment"],
    ] as const;
    const scores: Record<string, number> = {};
    for (const [col, key] of dims) {
      const v = Number(r[col]);
      if (!Number.isFinite(v) || v < 1 || v > 5) {
        issues.push({ row, field: col, severity: "error", message: `Must be 1–5, got "${r[col]}".` });
      }
      scores[key] = v;
    }

    const composite = Number(r["Composite Score"]);
    const avg = (scores.dim1_absorption + scores.dim2_regulatory + scores.dim3_technical + scores.dim4_political + scores.dim5_investment) / 5;
    if (Number.isFinite(composite) && Math.abs(composite - avg) > 0.5) {
      issues.push({
        row, field: "Composite Score", severity: "warning",
        message: `Stored ${composite} differs from dimension average ${avg.toFixed(2)}.`,
      });
    }

    const linked = String(r["Linked Project IDs"] ?? "")
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    parsed.push({
      country: code ?? "GTM",
      projectId,
      projectName: String(r["Project Name"] ?? "").trim(),
      projectType: String(r["Project Type"] ?? "").trim(),
      gtmiTier: (String(r["GTMI Tier"] ?? "Tier 2").trim() as Project["gtmiTier"]),
      ...scores,
      dim1_absorption: scores.dim1_absorption,
      dim2_regulatory: scores.dim2_regulatory,
      dim3_technical: scores.dim3_technical,
      dim4_political: scores.dim4_political,
      dim5_investment: scores.dim5_investment,
      interactionType: (String(r["Interaction Type"] ?? "Complementary").trim() as InteractionType),
      linkedProjectIds: linked,
      notes: String(r["Notes"] ?? "").trim(),
      compositeScore: Number.isFinite(composite) ? composite : Number(avg.toFixed(2)),
      overallRisk: (String(r["Overall Risk"] ?? "Medium").trim() as RiskLevel),
    });
  });

  // Cross-row: missing linked project IDs
  parsed.forEach((p, i) => {
    for (const linked of p.linkedProjectIds) {
      if (!seenIds.has(linked)) {
        issues.push({
          row: i + 2,
          field: "Linked Project IDs",
          severity: "warning",
          message: `Linked "${linked}" not present in this import or existing atlas.`,
        });
      }
    }
  });

  return { parsed, issues };
}
