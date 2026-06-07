import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Download, Trash2, Plus } from "lucide-react";
import { WorkflowNav } from "@/components/WorkflowNav";
import {
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

const GTMI_TIERS = ["A", "B", "C"] as const;
const RISK_LEVELS: RiskLevel[] = ["Low", "Medium", "High"];
const INTERACTION_TYPES: InteractionType[] = [
  "Complementary",
  "Sequentially Dependent",
  "Institutionally Competing",
  "Governance-Conflicting",
];

interface ValidationIssue {
  rowKey: string;
  field: EditableField;
  message: string;
  severity: "error" | "warning";
}

type EditableField =
  | "country"
  | "projectId"
  | "projectName"
  | "projectType"
  | "gtmiTier"
  | "compositeScore"
  | "overallRisk"
  | "interactionType";

interface EditableRow extends Project {
  _key: string;
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

function newKey() {
  return `r_${Math.random().toString(36).slice(2, 10)}`;
}

function blankRow(): EditableRow {
  return {
    _key: newKey(),
    country: "",
    projectId: "",
    projectName: "",
    projectType: "",
    leadDonor: "",
    implementingAgency: "",
    gtmiTier: "" as any,
    startDate: "",
    endDate: "",
    dim1_institutional: 1,
    dim1_note: "",
    dim2_regulatory: 1,
    dim2_note: "",
    dim3_technical: 1,
    dim3_note: "",
    dim4_political: 1,
    dim4_note: "",
    dim5_investment: 1,
    dim5_note: "",
    compositeScore: "" as any,
    interactionType: "" as any,
    linkedProjectIds: [],
    interactionNote: "",
    overallRisk: "" as any,
  };
}

function validateRows(rows: EditableRow[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const idCounts = new Map<string, number>();
  for (const r of rows) {
    const id = r.projectId.trim();
    if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }

  for (const r of rows) {
    const k = r._key;
    if (!r.country.trim()) {
      issues.push({ rowKey: k, field: "country", severity: "error", message: "Country is required (ISO 3166 alpha-3)." });
    } else if (!normalizeCountry(r.country)) {
      issues.push({ rowKey: k, field: "country", severity: "error", message: `"${r.country}" is not a recognized country.` });
    }
    if (!r.projectId.trim()) {
      issues.push({ rowKey: k, field: "projectId", severity: "error", message: "Project ID is required." });
    } else if ((idCounts.get(r.projectId.trim()) ?? 0) > 1) {
      issues.push({ rowKey: k, field: "projectId", severity: "error", message: `Duplicate ID "${r.projectId.trim()}".` });
    }
    if (!r.projectName.trim()) {
      issues.push({ rowKey: k, field: "projectName", severity: "error", message: "Project name is required." });
    }
    if (!r.projectType.trim()) {
      issues.push({ rowKey: k, field: "projectType", severity: "warning", message: "Project type is empty." });
    }
    if (!GTMI_TIERS.includes(r.gtmiTier as any)) {
      issues.push({ rowKey: k, field: "gtmiTier", severity: "error", message: "GTMI tier must be A, B, or C." });
    }
    const c = Number(r.compositeScore);
    if (!Number.isFinite(c) || c < 5 || c > 15) {
      issues.push({ rowKey: k, field: "compositeScore", severity: "error", message: "Composite must be between 5 and 15." });
    }
    if (!RISK_LEVELS.includes(r.overallRisk)) {
      issues.push({ rowKey: k, field: "overallRisk", severity: "error", message: "Risk must be Low, Medium, or High." });
    }
    if (!INTERACTION_TYPES.includes(r.interactionType)) {
      issues.push({
        rowKey: k,
        field: "interactionType",
        severity: "error",
        message: `Interaction must be one of: ${INTERACTION_TYPES.join(", ")}.`,
      });
    }
  }
  return issues;
}

function AddProject() {
  const { projects, setProjects } = useProjectStore();
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const issues = useMemo(() => validateRows(rows), [rows]);
  const issuesByCell = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const i of issues) {
      const key = `${i.rowKey}:${i.field}`;
      const arr = map.get(key) ?? [];
      arr.push(i);
      map.set(key, arr);
    }
    return map;
  }, [issues]);
  const rowsWithErrors = useMemo(() => {
    const s = new Set<string>();
    for (const i of issues) if (i.severity === "error") s.add(i.rowKey);
    return s;
  }, [issues]);
  const errCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  async function handleFile(f: File) {
    setFileName(f.name);
    setImported(false);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheetName = wb.SheetNames.find((s) => /interaction/i.test(s)) ?? wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "", range: 1 });
    setRows(parseRaw(raw));
  }

  function commit() {
    const stripped: Project[] = rows.map(({ _key, ...rest }) => rest);
    const merged = [
      ...projects.filter((p) => !stripped.find((r) => r.projectId === p.projectId)),
      ...stripped,
    ];
    setProjects(merged);
    setImported(true);
  }

  function updateCell(key: string, field: EditableField, value: string) {
    setImported(false);
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        if (field === "compositeScore") {
          if (value === "") return { ...r, compositeScore: "" as any };
          const n = Number(value);
          return { ...r, compositeScore: Number.isFinite(n) ? n : (value as any) };
        }
        if (field === "country") {
          const normalized = normalizeCountry(value);
          return { ...r, country: normalized ?? value.toUpperCase().trim() };
        }
        return { ...r, [field]: value } as EditableRow;
      })
    );
  }

  function deleteRow(key: string) {
    setImported(false);
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  function addRow() {
    setImported(false);
    setRows((prev) => [...prev, blankRow()]);
  }

  return (
    <div className="min-h-screen bg-background">
      <WorkflowNav />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Import projects</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Use the official Capstone template, or add rows manually. Edit any cell inline — we
          re-validate country names, duplicate IDs, composite-score ranges (5–15), risk levels,
          and interaction types in real time.
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

        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Validation</h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{rows.length} rows</span>
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
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{warnCount} warnings</span>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={addRow}
                className="inline-flex items-center gap-1.5 rounded-md border bg-surface px-3 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
              >
                <Plus size={14} /> Add row
              </button>
              <button
                onClick={commit}
                disabled={errCount > 0 || imported || rows.length === 0}
                title={
                  rows.length === 0
                    ? "Add at least one row to commit"
                    : errCount > 0
                    ? `${rowsWithErrors.size} row${rowsWithErrors.size === 1 ? "" : "s"} still ${
                        rowsWithErrors.size === 1 ? "has" : "have"
                      } errors. Fix all errors to commit.`
                    : undefined
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
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
          </div>

          {rows.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed bg-surface p-10 text-center text-sm text-muted-foreground">
              Upload a template or click <span className="font-medium text-foreground">+ Add row</span> to start.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    {["Country", "ID", "Name", "Type", "GTMI", "Composite", "Risk", "Interaction", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._key} className="border-t align-top">
                      <EditCell row={row} field="country" value={row.country} issues={issuesByCell} onChange={updateCell}
                        display={(v) => FOCUS_COUNTRIES[v]?.name ?? v ?? "—"} />
                      <EditCell row={row} field="projectId" value={row.projectId} issues={issuesByCell} onChange={updateCell} mono />
                      <EditCell row={row} field="projectName" value={row.projectName} issues={issuesByCell} onChange={updateCell} />
                      <EditCell row={row} field="projectType" value={row.projectType} issues={issuesByCell} onChange={updateCell} />
                      <SelectCell row={row} field="gtmiTier" value={String(row.gtmiTier)} issues={issuesByCell} onChange={updateCell}
                        options={GTMI_TIERS as readonly string[]} />
                      <EditCell row={row} field="compositeScore" value={String(row.compositeScore)} issues={issuesByCell} onChange={updateCell}
                        mono display={(v) => v ? `${v}/15` : "—"} type="number" />
                      <SelectCell row={row} field="overallRisk" value={row.overallRisk} issues={issuesByCell} onChange={updateCell}
                        options={RISK_LEVELS} />
                      <SelectCell row={row} field="interactionType" value={row.interactionType} issues={issuesByCell} onChange={updateCell}
                        options={INTERACTION_TYPES} />
                      <td className="px-2 py-2">
                        <button
                          onClick={() => deleteRow(row._key)}
                          className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete row"
                          title="Delete row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function cellIssues(map: Map<string, ValidationIssue[]>, key: string, field: EditableField) {
  return map.get(`${key}:${field}`) ?? [];
}

interface CellProps {
  row: EditableRow;
  field: EditableField;
  value: string;
  issues: Map<string, ValidationIssue[]>;
  onChange: (key: string, field: EditableField, value: string) => void;
}

function EditCell({
  row, field, value, issues, onChange,
  display, mono, type = "text",
}: CellProps & { display?: (v: string) => string; mono?: boolean; type?: "text" | "number" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cellErr = cellIssues(issues, row._key, field);
  const hasErr = cellErr.some((i) => i.severity === "error");
  const shown = display ? display(value) : value || "—";

  return (
    <td className={`px-3 py-2 ${hasErr ? "bg-destructive/5" : ""}`}>
      {editing ? (
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { setEditing(false); if (draft !== value) onChange(row._key, field, draft); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") { setDraft(value); setEditing(false); }
          }}
          className={`w-full min-w-[6rem] rounded border bg-background px-2 py-1 text-xs outline-none focus:border-primary ${mono ? "font-mono" : ""}`}
        />
      ) : (
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className={`block w-full min-w-[6rem] text-left ${mono ? "font-mono" : ""} ${!value ? "text-muted-foreground italic" : ""}`}
        >
          {shown}
        </button>
      )}
      {cellErr.length > 0 && (
        <div
          className="mt-1 text-[10px] leading-tight"
          style={{ color: hasErr ? "var(--color-destructive)" : "var(--color-risk-medium)" }}
        >
          {cellErr.map((i, idx) => <div key={idx}>{i.message}</div>)}
        </div>
      )}
    </td>
  );
}

function SelectCell({
  row, field, value, issues, onChange, options,
}: CellProps & { options: readonly string[] }) {
  const cellErr = cellIssues(issues, row._key, field);
  const hasErr = cellErr.some((i) => i.severity === "error");
  return (
    <td className={`px-3 py-2 ${hasErr ? "bg-destructive/5" : ""}`}>
      <select
        value={value}
        onChange={(e) => onChange(row._key, field, e.target.value)}
        className="w-full rounded border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
      >
        {!options.includes(value) && <option value={value}>{value || "—"}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {cellErr.length > 0 && (
        <div
          className="mt-1 text-[10px] leading-tight"
          style={{ color: hasErr ? "var(--color-destructive)" : "var(--color-risk-medium)" }}
        >
          {cellErr.map((i, idx) => <div key={idx}>{i.message}</div>)}
        </div>
      )}
    </td>
  );
}

function parseRaw(raw: Record<string, any>[]): EditableRow[] {
  const out: EditableRow[] = [];
  for (const r of raw) {
    const countryRaw = String(pick(r, "Country") ?? "").trim();
    if (!countryRaw) continue;
    const code = normalizeCountry(countryRaw);
    const projectId = String(pick(r, "Project ID") ?? "").trim();
    if (!projectId) continue;

    const dims = {
      dim1_institutional: Number(pick(r, "Inst. Load Score", "Inst. Load")) || 1,
      dim2_regulatory: Number(pick(r, "Reg. Deps Score", "Reg. Deps")) || 1,
      dim3_technical: Number(pick(r, "Tech. Deps Score", "Tech. Deps")) || 1,
      dim4_political: Number(pick(r, "Pol. Sensitivity Score", "Pol. Sensitivity")) || 1,
      dim5_investment: Number(pick(r, "Invest. Needs Score", "Invest. Needs")) || 1,
    };
    const composite = Number(pick(r, "Composite"));
    const sum = dims.dim1_institutional + dims.dim2_regulatory + dims.dim3_technical + dims.dim4_political + dims.dim5_investment;
    const riskRaw = String(pick(r, "Overall Risk") ?? "Medium").trim().toUpperCase();
    const overallRisk: RiskLevel = RISK_LOOKUP[riskRaw] ?? "Medium";
    const linked = String(pick(r, "Linked Project") ?? "")
      .split(/[,;]/).map((s) => s.trim()).filter(Boolean);

    out.push({
      _key: newKey(),
      country: code ?? countryRaw.toUpperCase(),
      projectId,
      projectName: String(pick(r, "Project Name") ?? "").trim(),
      projectType: String(pick(r, "Project Type") ?? "").trim(),
      leadDonor: String(pick(r, "Lead Donor", "Donor") ?? "").trim(),
      implementingAgency: String(pick(r, "Implementing Agency", "Agency") ?? "").trim(),
      gtmiTier: String(pick(r, "GTMI Tier") ?? "B").trim(),
      startDate: String(pick(r, "Start Date") ?? "").trim(),
      endDate: String(pick(r, "End Date") ?? "").trim(),
      ...dims,
      dim1_note: String(pick(r, "Inst. Load Note") ?? "").trim(),
      dim2_note: String(pick(r, "Reg. Deps Note") ?? "").trim(),
      dim3_note: String(pick(r, "Tech. Deps Note") ?? "").trim(),
      dim4_note: String(pick(r, "Pol. Sensitivity Note") ?? "").trim(),
      dim5_note: String(pick(r, "Invest. Needs Note") ?? "").trim(),
      compositeScore: Number.isFinite(composite) ? composite : sum,
      interactionType: (String(pick(r, "Interaction Type") ?? "Complementary").trim() as InteractionType),
      linkedProjectIds: linked,
      interactionNote: String(pick(r, "Interaction Note") ?? "").trim(),
      overallRisk,
    });
  }
  return out;
}
