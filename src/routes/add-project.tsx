import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import {
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Trash2,
  Plus,
  Sparkles,
  Link as LinkIcon,
  X,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { WorkflowNav } from "@/components/WorkflowNav";
import {
  FOCUS_COUNTRIES,
  InteractionType,
  Project,
  ProjectSource,
  RiskLevel,
  useProjectStore,
} from "@/lib/project-data";
import { normalizeCountry } from "@/lib/countries";
import { analyzeIntake } from "@/lib/ai-intake.functions";
import templateAsset from "@/assets/Blank_Template.xlsx.asset.json";

export const Route = createFileRoute("/add-project")({
  head: () => ({
    meta: [
      { title: "Add Project — DPI Sequencing Atlas" },
      { name: "description", content: "Import projects from documents, URLs, or Excel and validate the interaction matrix." },
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

const ACCEPTED_DOC_TYPES =
  ".pdf,.docx,.xlsx,.xls,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/plain";

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
  | "interactionType"
  | "dim1_institutional"
  | "dim2_regulatory"
  | "dim3_technical"
  | "dim4_political"
  | "dim5_investment";

type DimField =
  | "dim1_institutional"
  | "dim2_regulatory"
  | "dim3_technical"
  | "dim4_political"
  | "dim5_investment";

const DIM_FIELDS: DimField[] = [
  "dim1_institutional",
  "dim2_regulatory",
  "dim3_technical",
  "dim4_political",
  "dim5_investment",
];

type DimNoteField = "dim1_note" | "dim2_note" | "dim3_note" | "dim4_note" | "dim5_note";

const DIM_NOTE_FIELD: Record<DimField, DimNoteField> = {
  dim1_institutional: "dim1_note",
  dim2_regulatory: "dim2_note",
  dim3_technical: "dim3_note",
  dim4_political: "dim4_note",
  dim5_investment: "dim5_note",
};

interface AIDimensionDetail {
  score: number | null;
  rationale: string;
  confidence: "High" | "Medium" | "Low";
}

interface AIDetail {
  d1: AIDimensionDetail;
  d2: AIDimensionDetail;
  d3: AIDimensionDetail;
  d4: AIDimensionDetail;
  d5: AIDimensionDetail;
  keyRiskFlag?: string;
  plainLanguageSummary?: string;
}

interface EditableRow extends Omit<Project, "dim1_institutional" | "dim2_regulatory" | "dim3_technical" | "dim4_political" | "dim5_investment"> {
  _key: string;
  _aiSuggested?: boolean;
  _aiDetail?: AIDetail;
  dim1_institutional: number | null;
  dim2_regulatory: number | null;
  dim3_technical: number | null;
  dim4_political: number | null;
  dim5_investment: number | null;
}

interface IntakeFile {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  base64: string;
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

function dimScore(r: EditableRow, field: DimField): number | null {
  const v = (r as any)[field];
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 3 ? n : null;
}

function sumDims(r: EditableRow): { sum: number; count: number; missing: DimField[] } {
  let sum = 0;
  let count = 0;
  const missing: DimField[] = [];
  for (const f of DIM_FIELDS) {
    const s = dimScore(r, f);
    if (s == null) missing.push(f);
    else {
      sum += s;
      count += 1;
    }
  }
  return { sum, count, missing };
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
    const { sum, count, missing } = sumDims(r);
    for (const m of missing) {
      issues.push({
        rowKey: k,
        field: m,
        severity: "error",
        message: "Score required (1, 2, or 3).",
      });
    }
    if (missing.length > 0) {
      issues.push({
        rowKey: k,
        field: "compositeScore",
        severity: "error",
        message: `${missing.length} dimension${missing.length > 1 ? "s" : ""} unscored — add a score to commit.`,
      });
    } else if (count === 5 && (sum < 5 || sum > 15)) {
      issues.push({
        rowKey: k,
        field: "compositeScore",
        severity: "error",
        message: "Composite (sum of D1–D5) must be between 5 and 15.",
      });
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

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function mapAiToRow(p: any): EditableRow {
  const riskMap: Record<string, RiskLevel> = { L: "Low", M: "Medium", H: "High" };
  const code = normalizeCountry(p.country ?? "");
  const dim = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 3 ? n : null;
  };
  const composite = p.composite_score ?? null;
  const detail: AIDetail = {
    d1: { score: p.d1_score ?? null, rationale: p.d1_rationale ?? "", confidence: p.d1_confidence ?? "Low" },
    d2: { score: p.d2_score ?? null, rationale: p.d2_rationale ?? "", confidence: p.d2_confidence ?? "Low" },
    d3: { score: p.d3_score ?? null, rationale: p.d3_rationale ?? "", confidence: p.d3_confidence ?? "Low" },
    d4: { score: p.d4_score ?? null, rationale: p.d4_rationale ?? "", confidence: p.d4_confidence ?? "Low" },
    d5: { score: p.d5_score ?? null, rationale: p.d5_rationale ?? "", confidence: p.d5_confidence ?? "Low" },
    keyRiskFlag: p.key_risk_flag,
    plainLanguageSummary: p.plain_language_summary,
  };
  return {
    _key: newKey(),
    _aiSuggested: true,
    _aiDetail: detail,
    country: code ?? String(p.country ?? "").toUpperCase(),
    projectId: String(p.id ?? "").trim(),
    projectName: String(p.name ?? "").trim(),
    projectType: String(p.type ?? "").trim(),
    leadDonor: String(p.lead_donor ?? "").trim(),
    implementingAgency: String(p.implementing_agency ?? "").trim(),
    gtmiTier: String(p.gtmi_tier ?? "").trim(),
    startDate: String(p.start_date ?? "").trim(),
    endDate: String(p.end_date ?? "").trim(),
    dim1_institutional: dim(p.d1_score),
    dim1_note: detail.d1.rationale,
    dim2_regulatory: dim(p.d2_score),
    dim2_note: detail.d2.rationale,
    dim3_technical: dim(p.d3_score),
    dim3_note: detail.d3.rationale,
    dim4_political: dim(p.d4_score),
    dim4_note: detail.d4.rationale,
    dim5_investment: dim(p.d5_score),
    dim5_note: detail.d5.rationale,
    compositeScore: (composite == null ? "" : Number(composite)) as any,
    interactionType: (p.interaction_type ?? "") as any,
    linkedProjectIds: Array.isArray(p.linked_project_ids) ? p.linked_project_ids : [],
    interactionNote: String(p.interaction_note ?? "").trim(),
    overallRisk: (riskMap[String(p.overall_risk ?? "").toUpperCase()] ?? ("" as any)) as RiskLevel,
  };
}

function AddProject() {
  const { projects, setProjects, addSources } = useProjectStore();
  const analyze = useServerFn(analyzeIntake);

  const [rows, setRows] = useState<EditableRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // AI intake state
  const [intakeFiles, setIntakeFiles] = useState<IntakeFile[]>([]);
  const [intakeUrls, setIntakeUrls] = useState<string[]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pendingSources, setPendingSources] = useState<ProjectSource[]>([]);
  const [proxyState, setProxyState] = useState<Record<string, ProxyEntry>>({});
  const [editedDims, setEditedDims] = useState<Record<string, Set<DimField>>>({});

  function markEdited(rowKey: string, field: DimField) {
    setEditedDims((prev) => {
      const next = { ...prev };
      const set = new Set(next[rowKey] ?? []);
      set.add(field);
      next[rowKey] = set;
      return next;
    });
  }

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
    setRows((prev) => [...prev, ...parseRaw(raw)]);
    const sourcesSheetName = wb.SheetNames.find((s) => /sources?/i.test(s));
    const sourcesSheet = sourcesSheetName ? wb.Sheets[sourcesSheetName] : null;
    if (sourcesSheet) {
      const sourceRows = XLSX.utils.sheet_to_json<Record<string, any>>(sourcesSheet, { defval: "", range: 2 });
      const sources = parseSourceRows(sourceRows);
      if (sources.length) setPendingSources((prev) => [...prev, ...sources]);
    }
  }

  function commit() {
    const stripped: Project[] = rows.map(({ _key, _aiSuggested, _aiDetail, ...rest }) => {
      const proxyDims: string[] = DIM_FIELDS.filter(
        (f) => proxyState[`${_key}:${f}`]?.note
      );
      return {
        ...rest,
        dim1_institutional: rest.dim1_institutional ?? 1,
        dim2_regulatory: rest.dim2_regulatory ?? 1,
        dim3_technical: rest.dim3_technical ?? 1,
        dim4_political: rest.dim4_political ?? 1,
        dim5_investment: rest.dim5_investment ?? 1,
        compositeScore: sumDims({ ...rest, _key: "" } as EditableRow).sum,
        proxyDimensions: proxyDims.length ? proxyDims : undefined,
      };
    });
    const merged = [
      ...projects.filter((p) => !stripped.find((r) => r.projectId === p.projectId)),
      ...stripped,
    ];
    setProjects(merged);
    // Persist any AI-derived sources tied to project IDs that we just committed.
    const committedIds = new Set(stripped.map((p) => p.projectId));
    const sourcesToSave = pendingSources.filter((s) => committedIds.has(s.projectId));
    if (sourcesToSave.length) addSources(sourcesToSave);
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

  function updateDim(key: string, field: DimField, value: string) {
    setImported(false);
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        if (value === "") return { ...r, [field]: null } as EditableRow;
        const n = Number(value);
        const clean = Number.isFinite(n) && n >= 1 && n <= 3 ? n : null;
        return { ...r, [field]: clean } as EditableRow;
      })
    );
    // Manual edit overrides any prior proxy attribution.
    setProxyState((prev) => {
      const k = `${key}:${field}`;
      if (!(k in prev)) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
    markEdited(key, field);
  }

  function updateDimNote(key: string, field: DimField, value: string) {
    setImported(false);
    const noteField = DIM_NOTE_FIELD[field];
    setRows((prev) =>
      prev.map((r) => (r._key === key ? ({ ...r, [noteField]: value } as EditableRow) : r))
    );
    markEdited(key, field);
  }

  function setProxyAnswer(rowKey: string, field: DimField, questionId: string, value: string) {
    const cfg = PROXY_CONFIGS[field];
    if (!cfg) return;
    const k = `${rowKey}:${field}`;
    const prevEntry = proxyState[k]?.answers ?? {};
    const answers = { ...prevEntry, [questionId]: value };
    const result = cfg.score(answers);
    setProxyState((prev) => ({
      ...prev,
      [k]: { answers, note: result?.note ?? "" },
    }));
    if (result) {
      setImported(false);
      setRows((prev) =>
        prev.map((r) => (r._key === rowKey ? ({ ...r, [field]: result.score } as EditableRow) : r))
      );
    }
  }

  function deleteRow(key: string) {
    setImported(false);
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  function addRow() {
    setImported(false);
    setRows((prev) => [...prev, blankRow()]);
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── AI Intake handlers ────────────────────────────────────────────────
  async function addIntakeFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const prepared: IntakeFile[] = [];
    for (const f of incoming) {
      const base64 = await readFileAsBase64(f);
      prepared.push({
        id: newKey(),
        name: f.name,
        mediaType: f.type || guessMediaType(f.name),
        size: f.size,
        base64,
      });
    }
    setIntakeFiles((prev) => [...prev, ...prepared]);
  }

  function removeIntakeFile(id: string) {
    setIntakeFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function addUrl() {
    const u = urlDraft.trim();
    if (!u) return;
    try {
      new URL(u);
    } catch {
      setAiError("Please enter a valid URL (starting with http:// or https://).");
      return;
    }
    setAiError(null);
    if (!intakeUrls.includes(u)) setIntakeUrls((prev) => [...prev, u]);
    setUrlDraft("");
  }

  function removeUrl(u: string) {
    setIntakeUrls((prev) => prev.filter((x) => x !== u));
  }

  async function runAnalysis() {
    if (intakeFiles.length === 0 && intakeUrls.length === 0) return;
    setAnalysing(true);
    setAiError(null);
    try {
      const result = await analyze({
        data: {
          files: intakeFiles.map((f) => ({
            name: f.name,
            mediaType: f.mediaType,
            base64: f.base64,
          })),
          urls: intakeUrls,
        },
      });
      const newRows = (result.projects ?? []).map(mapAiToRow);
      setRows((prev) => [...prev, ...newRows]);
      const sources: ProjectSource[] = (result.sources ?? []).map((s: any) => ({
        projectId: String(s.project_id ?? "").trim(),
        sourceType: String(s.source_type ?? "Document").trim(),
        sourceTitle: String(s.source_title ?? "Untitled source").trim(),
        url: s.url ? String(s.url) : null,
        note: s.note ? String(s.note) : "",
      }));
      setPendingSources((prev) => [...prev, ...sources]);
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const r of newRows) next.add(r._key);
        return next;
      });
      setImported(false);
    } catch (e) {
      setAiError((e as Error).message ?? "Analysis failed.");
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <WorkflowNav />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Import projects</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Use AI to read your project documents and fill the matrix automatically, or upload a
          completed template. Every cell is editable inline and re-validated in real time before
          you commit.
        </p>

        {/* ───────── AI INTAKE ───────── */}
        <section data-tour="add-project-upload" className="mt-8 rounded-xl border bg-surface-elevated p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Analyse project documents</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Upload any combination of project documents and URLs. The AI will read them, fill
                the Interaction Matrix template row by row, suggest scores with codebook-based
                rationale, and populate the Sources sheet automatically. You review and edit
                before committing.
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <label className="group relative mt-5 flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-surface transition hover:border-primary hover:bg-primary-soft/40">
            <input
              type="file"
              accept={ACCEPTED_DOC_TYPES}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && e.target.files.length > 0 && addIntakeFiles(e.target.files)}
            />
            <Upload size={24} className="text-muted-foreground transition group-hover:text-primary" />
            <div className="mt-2 text-sm font-medium">Drop or select documents</div>
            <div className="mt-1 max-w-md text-center text-[11px] text-muted-foreground">
              Accepted: PDF, Word, Excel, plain text, and URLs — project fiches, donor reports,
              action documents, strategy papers, legal texts, project pages.
            </div>
          </label>

          {/* URL input */}
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <LinkIcon
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="url"
                placeholder="https://… paste a project page, fiche, or report URL"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUrl();
                  }
                }}
                className="w-full rounded-md border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={addUrl}
              className="rounded-md border bg-surface px-4 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
            >
              Add
            </button>
          </div>

          {/* Added items */}
          {(intakeFiles.length > 0 || intakeUrls.length > 0) && (
            <ul className="mt-4 divide-y rounded-md border bg-surface">
              {intakeFiles.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <FileText size={14} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {fileExt(f.name)}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatBytes(f.size)}</span>
                  <button
                    onClick={() => removeIntakeFile(f.id)}
                    className="rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove file"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
              {intakeUrls.map((u) => (
                <li key={u} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <LinkIcon size={14} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{u}</span>
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    URL
                  </span>
                  <button
                    onClick={() => removeUrl(u)}
                    className="rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove URL"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Analyse button + state */}
          {(intakeFiles.length > 0 || intakeUrls.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={runAnalysis}
                disabled={analysing}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analysing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {analysing ? "Analysing…" : "Analyse documents"}
              </button>
              {analysing && (
                <span className="text-xs text-muted-foreground">
                  Reading your documents and generating scores — this may take 20–40 seconds
                  depending on document volume.
                </span>
              )}
            </div>
          )}

          {aiError && (
            <div
              className="mt-3 rounded-md border px-3 py-2 text-xs"
              style={{
                borderColor: "color-mix(in oklab, var(--color-destructive) 40%, transparent)",
                color: "var(--color-destructive)",
                background: "color-mix(in oklab, var(--color-destructive) 8%, transparent)",
              }}
            >
              {aiError}
            </div>
          )}
        </section>

        {/* ───────── Divider ───────── */}
        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Or upload a completed template manually
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ───────── Existing manual upload (unchanged behavior) ───────── */}
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
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
            download="Blank_Template.xlsx"
            data-tour="add-project-template"
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

        {/* ───────── Validation table (unchanged behaviour, AI-aware UI) ───────── */}
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
              Run AI analysis above, upload a template, or click{" "}
              <span className="font-medium text-foreground">+ Add row</span> to start.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    <th className="w-6 px-2 py-2"></th>
                    {["Country", "ID", "Name", "Type", "GTMI", "Composite", "Risk", "Interaction", ""].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isOpen = expanded.has(row._key);
                    const aiTint = row._aiSuggested
                      ? "bg-[color-mix(in_oklab,var(--color-risk-medium)_8%,transparent)]"
                      : "";
                    return (
                      <Fragment key={row._key}>
                        <tr className={`border-t align-top ${aiTint}`}>
                          <td className="px-2 py-2 align-top">
                            {row._aiDetail ? (
                              <button
                                onClick={() => toggleExpand(row._key)}
                                className="rounded p-1 text-muted-foreground transition hover:bg-secondary"
                                aria-label="Toggle score detail"
                                title="Score detail"
                              >
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            ) : null}
                          </td>
                          <EditCell row={row} field="country" value={row.country} issues={issuesByCell} onChange={updateCell}
                            display={(v) => FOCUS_COUNTRIES[v]?.name ?? v ?? "—"} />
                          <EditCell row={row} field="projectId" value={row.projectId} issues={issuesByCell} onChange={updateCell} mono />
                          <EditCell row={row} field="projectName" value={row.projectName} issues={issuesByCell} onChange={updateCell} />
                          <EditCell row={row} field="projectType" value={row.projectType} issues={issuesByCell} onChange={updateCell} />
                          <SelectCell row={row} field="gtmiTier" value={String(row.gtmiTier)} issues={issuesByCell} onChange={updateCell}
                            options={GTMI_TIERS as readonly string[]} />
                          <CompositeCell row={row} issues={issuesByCell} />

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
                        {isOpen && row._aiDetail && (
                          <tr className={`border-t ${aiTint}`}>
                            <td colSpan={10} className="px-6 py-4">
                              <ScoreDetail
                                row={row}
                                detail={row._aiDetail}
                                onScoreChange={updateDim}
                                onNoteChange={updateDimNote}
                                editedFields={editedDims[row._key] ?? new Set()}
                                proxyState={proxyState}
                                onProxyAnswer={setProxyAnswer}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
    <td className={`px-3 py-2 ${hasErr ? "bg-destructive/10" : ""}`}>
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
          className={`block w-full min-w-[6rem] text-left ${mono ? "font-mono" : ""} ${!value ? (hasErr ? "text-destructive italic" : "text-muted-foreground italic") : ""}`}
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
    <td className={`px-3 py-2 ${hasErr ? "bg-destructive/10" : ""}`}>
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

function CompositeCell({ row, issues }: { row: EditableRow; issues: Map<string, ValidationIssue[]> }) {
  const { sum, count, missing } = sumDims(row);
  const cellErr = cellIssues(issues, row._key, "compositeScore");
  const hasErr = cellErr.some((i) => i.severity === "error");
  const max = count * 3;
  const partial = missing.length > 0;
  return (
    <td className={`px-3 py-2 ${hasErr ? "bg-destructive/10" : ""}`}>
      <div
        className={`block w-full min-w-[6rem] font-mono ${hasErr ? "text-destructive" : ""}`}
        title={partial ? `Partial: ${count} of 5 dimensions scored` : "Auto-calculated from D1–D5"}
      >
        {sum}/{partial ? max : 15}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {partial ? `${count}/5 dims scored · Σ` : "auto · Σ D1–D5"}
      </div>
      {partial && (
        <div className="mt-1 text-[10px] leading-tight text-destructive">
          {missing.length} dimension{missing.length > 1 ? "s" : ""} unscored — add a score to commit.
        </div>
      )}
      {cellErr.filter((i) => !partial || !i.message.includes("unscored")).length > 0 && (
        <div className="mt-1 text-[10px] leading-tight" style={{ color: hasErr ? "var(--color-destructive)" : "var(--color-risk-medium)" }}>
          {cellErr
            .filter((i) => !partial || !i.message.includes("unscored"))
            .map((i, idx) => <div key={idx}>{i.message}</div>)}
        </div>
      )}
    </td>
  );
}


const DIM_LABELS: Array<[keyof AIDetail, DimField, string]> = [
  ["d1", "dim1_institutional", "D1 · Institutional Absorption Load"],
  ["d2", "dim2_regulatory", "D2 · Regulatory Dependencies"],
  ["d3", "dim3_technical", "D3 · Technical Dependencies"],
  ["d4", "dim4_political", "D4 · Political Sensitivity"],
  ["d5", "dim5_investment", "D5 · Investment Needs & Funding"],
];

type ProxyQuestion = {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

type ProxyConfig = {
  questions: ProxyQuestion[];
  score: (a: Record<string, string>) => { score: 1 | 2 | 3; note: string } | null;
};

const PROXY_CONFIGS: Record<DimField, ProxyConfig> = {
  dim1_institutional: {
    questions: [
      {
        id: "agencies",
        label: "How many distinct implementing agencies or ministries are involved?",
        options: [
          { value: "one", label: "One lead agency" },
          { value: "two_three", label: "2–3 agencies" },
          { value: "four_plus", label: "4+ agencies / cross-ministerial" },
        ],
      },
      {
        id: "coordination",
        label: "Is a new coordination mechanism (steering committee, MoU, joint unit) required?",
        options: [
          { value: "none", label: "No — existing channels suffice" },
          { value: "existing", label: "Yes — reuses an existing committee" },
          { value: "new_permanent", label: "Yes — new permanent inter-institutional body" },
        ],
      },
    ],
    score: (a) => {
      if (!a.agencies || !a.coordination) return null;
      const aMap: Record<string, 1 | 2 | 3> = { one: 1, two_three: 2, four_plus: 3 };
      const cMap: Record<string, 1 | 2 | 3> = { none: 1, existing: 2, new_permanent: 3 };
      const score = Math.max(aMap[a.agencies], cMap[a.coordination]) as 1 | 2 | 3;
      const ag = { one: "single agency", two_three: "2–3 agencies", four_plus: "4+ agencies" }[a.agencies];
      const co = { none: "no new coordination", existing: "existing committee", new_permanent: "new permanent body" }[a.coordination];
      return { score, note: `${ag}, ${co} → score ${score}` };
    },
  },
  dim2_regulatory: {
    questions: [
      {
        id: "legal_basis",
        label: "Can the project be implemented under current law?",
        options: [
          { value: "yes", label: "Yes — existing framework covers it" },
          { value: "secondary", label: "Needs new secondary legislation (decrees, reglamentos)" },
          { value: "primary", label: "Needs new primary legislation (congressional approval)" },
        ],
      },
      {
        id: "blocking",
        label: "Is any pending legislation a precondition for implementation?",
        options: [
          { value: "no", label: "No" },
          { value: "maybe", label: "Possibly — gaps flagged but not blocking" },
          { value: "yes", label: "Yes — explicitly listed as precondition" },
        ],
      },
    ],
    score: (a) => {
      if (!a.legal_basis || !a.blocking) return null;
      const lMap: Record<string, 1 | 2 | 3> = { yes: 1, secondary: 2, primary: 3 };
      const bMap: Record<string, 1 | 2 | 3> = { no: 1, maybe: 2, yes: 3 };
      const score = Math.max(lMap[a.legal_basis], bMap[a.blocking]) as 1 | 2 | 3;
      const lg = { yes: "current law sufficient", secondary: "needs secondary legislation", primary: "needs primary legislation" }[a.legal_basis];
      const bl = { no: "no blocking gap", maybe: "regulatory gap identified", yes: "pending legislation is precondition" }[a.blocking];
      return { score, note: `${lg}, ${bl} → score ${score}` };
    },
  },
  dim3_technical: {
    questions: [
      {
        id: "infra",
        label: "What technical footprint does the project require?",
        options: [
          { value: "existing", label: "Deploys on existing infrastructure" },
          { value: "integrate", label: "Integrates with 1–2 existing core systems" },
          { value: "new", label: "Builds new national-level IT infrastructure" },
        ],
      },
      {
        id: "cross",
        label: "Does it integrate with 3+ systems or cross-border platforms?",
        options: [
          { value: "no", label: "No" },
          { value: "maybe", label: "Some integration, scope unclear" },
          { value: "yes", label: "Yes — multi-system or cross-border" },
        ],
      },
    ],
    score: (a) => {
      if (!a.infra || !a.cross) return null;
      const iMap: Record<string, 1 | 2 | 3> = { existing: 1, integrate: 2, new: 3 };
      const cMap: Record<string, 1 | 2 | 3> = { no: 1, maybe: 2, yes: 3 };
      const score = Math.max(iMap[a.infra], cMap[a.cross]) as 1 | 2 | 3;
      const inf = { existing: "existing infra", integrate: "integrates 1–2 systems", new: "new national IT" }[a.infra];
      const cr = { no: "no cross-system integration", maybe: "some integration", yes: "multi-system / cross-border" }[a.cross];
      return { score, note: `${inf}, ${cr} → score ${score}` };
    },
  },
  dim4_political: {
    questions: [
      {
        id: "interests",
        label: "Does the project threaten entrenched political or economic interests?",
        options: [
          { value: "no", label: "No — technocratic, broad consensus" },
          { value: "some", label: "Some stakeholders lose relative advantage" },
          { value: "yes", label: "Yes — directly threatens vested interests" },
        ],
      },
      {
        id: "cpi",
        label: "What is the country's Corruption Perceptions Index band?",
        options: [
          { value: "above_50", label: "Above 50 / 100 (stronger institutions)" },
          { value: "between", label: "35–50 / 100" },
          { value: "below_35", label: "Below 35 / 100 (high-risk environment)" },
        ],
      },
    ],
    score: (a) => {
      if (!a.interests || !a.cpi) return null;
      const iMap: Record<string, 1 | 2 | 3> = { no: 1, some: 2, yes: 3 };
      const cMap: Record<string, 1 | 2 | 3> = { above_50: 1, between: 2, below_35: 3 };
      const score = Math.max(iMap[a.interests], cMap[a.cpi]) as 1 | 2 | 3;
      const it = { no: "no vested interests threatened", some: "some friction", yes: "threatens vested interests" }[a.interests];
      const cp = { above_50: "CPI > 50", between: "CPI 35–50", below_35: "CPI < 35" }[a.cpi];
      return { score, note: `${it}, ${cp} → score ${score}` };
    },
  },
  dim5_investment: {
    questions: [
      {
        id: "secured",
        label: "Has the total project budget been confirmed and fully secured?",
        options: [
          { value: "fully", label: "Yes, fully secured" },
          { value: "partial", label: "Partially confirmed" },
          { value: "unconfirmed", label: "No — budget unclear or unconfirmed" },
        ],
      },
      {
        id: "scale",
        label: "What is the approximate budget scale?",
        options: [
          { value: "small", label: "Small (under €5M)" },
          { value: "medium", label: "Medium (€5M–€50M)" },
          { value: "large", label: "Large (over €50M or multi-phase)" },
          { value: "unknown", label: "Unknown" },
        ],
      },
    ],
    score: (a) => {
      if (!a.secured || !a.scale) return null;
      let score: 1 | 2 | 3;
      if (a.secured === "fully" && (a.scale === "small" || a.scale === "medium")) score = 1;
      else if (a.secured === "fully" && a.scale === "large") score = 2;
      else if (a.secured === "partial") score = 2;
      else score = 3; // unconfirmed + any, or unknown scale + unconfirmed
      const sec = { fully: "Budget fully secured", partial: "Budget partially confirmed", unconfirmed: "Budget unconfirmed" }[a.secured];
      const sc = { small: "small scale", medium: "medium scale", large: "large scale", unknown: "unknown scale" }[a.scale];
      return { score, note: `${sec}, ${sc} → score ${score}` };
    },
  },
};

type ProxyEntry = { answers: Record<string, string>; note: string };

function ScoreDetail({
  row,
  detail,
  onScoreChange,
  proxyState,
  onProxyAnswer,
}: {
  row: EditableRow;
  detail: AIDetail;
  onScoreChange: (key: string, field: DimField, value: string) => void;
  proxyState: Record<string, ProxyEntry>;
  onProxyAnswer: (rowKey: string, field: DimField, questionId: string, value: string) => void;
}) {
  const AMBER = "var(--color-risk-medium)";
  return (
    <div className="space-y-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        AI-suggested scores · review before committing
      </div>
      {detail.keyRiskFlag && (
        <div className="rounded-md border bg-surface p-3 text-xs">
          <div className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">Key risk flag</div>
          <div className="mt-1">{detail.keyRiskFlag}</div>
        </div>
      )}
      {detail.plainLanguageSummary && (
        <div className="rounded-md border bg-surface p-3 text-xs">
          <div className="font-mono uppercase tracking-wider text-[10px] text-muted-foreground">Plain-language summary</div>
          <div className="mt-1">{detail.plainLanguageSummary}</div>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {DIM_LABELS.map(([k, dimField, label]) => {
          const d = detail[k] as AIDimensionDetail;
          const current = (row as any)[dimField] as number | null;
          const missing = current == null;
          const proxyKey = `${row._key}:${dimField}`;
          const proxy = proxyState[proxyKey];
          const isProxyScore = !missing && !!proxy && !!proxy.note;
          const config = PROXY_CONFIGS[dimField];

          const borderClass = missing
            ? "border-[color:var(--color-risk-medium)]"
            : isProxyScore
              ? "border-[color:var(--color-risk-medium)]"
              : "";

          return (
            <div key={k as string} className={`rounded-md border bg-surface p-3 ${borderClass}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium">{label}</div>
                <div className="flex items-center gap-2">
                  {missing ? (
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[11px]"
                      style={{
                        background: `color-mix(in oklab, ${AMBER} 18%, transparent)`,
                        color: AMBER,
                      }}
                    >
                      pending
                    </span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      max={3}
                      step={1}
                      value={current}
                      onChange={(e) => onScoreChange(row._key, dimField, e.target.value)}
                      className="h-7 w-14 rounded border bg-background px-2 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                      style={isProxyScore ? { borderColor: AMBER, color: AMBER } : undefined}
                      aria-label={`Edit score for ${label}`}
                      title={isProxyScore ? "Proxy score — click to override" : "Click to edit"}
                    />
                  )}
                  <ConfidenceBadge level={d.confidence} />
                </div>
              </div>

              <div className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {d.rationale || "(no rationale provided)"}
              </div>

              {isProxyScore && (
                <div className="mt-2 space-y-0.5">
                  <div className="text-[10px] font-medium" style={{ color: AMBER }}>
                    Proxy score — derived from user input, not document evidence.
                  </div>
                  <div className="text-[10px] text-muted-foreground">{proxy!.note}</div>
                </div>
              )}

              {missing && config && (
                <div
                  className="mt-3 rounded border p-2.5"
                  style={{
                    borderColor: AMBER,
                    background: `color-mix(in oklab, ${AMBER} 6%, transparent)`,
                  }}
                >
                  <div className="text-[10px] font-medium" style={{ color: AMBER }}>
                    Insufficient evidence — answer to derive a proxy score:
                  </div>
                  <div className="mt-2 space-y-3">
                    {config.questions.map((q) => {
                      const selected = proxy?.answers?.[q.id] ?? "";
                      return (
                        <div key={q.id}>
                          <div className="text-[11px] font-medium text-foreground">{q.label}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {q.options.map((opt) => {
                              const active = selected === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => onProxyAnswer(row._key, dimField, q.id, opt.value)}
                                  className="rounded border px-2 py-1 text-[10px] transition"
                                  style={
                                    active
                                      ? {
                                          background: AMBER,
                                          borderColor: AMBER,
                                          color: "white",
                                        }
                                      : {
                                          borderColor: `color-mix(in oklab, ${AMBER} 35%, transparent)`,
                                          color: "var(--color-foreground)",
                                        }
                                  }
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-[10px] text-muted-foreground">
                      Or type a score (1, 2, or 3):{" "}
                      <input
                        type="number"
                        min={1}
                        max={3}
                        step={1}
                        placeholder="—"
                        value=""
                        onChange={(e) => onScoreChange(row._key, dimField, e.target.value)}
                        className="ml-1 h-6 w-12 rounded border bg-background px-1.5 font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                        aria-label={`Manually enter score for ${label}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: "High" | "Medium" | "Low" }) {
  const tone =
    level === "High"
      ? "var(--color-risk-low)"
      : level === "Medium"
        ? "var(--color-risk-medium)"
        : "var(--color-risk-high)";
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
      style={{
        background: `color-mix(in oklab, ${tone} 15%, transparent)`,
        color: tone,
      }}
    >
      {level}
    </span>
  );
}

function fileExt(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "file";
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function guessMediaType(name: string) {
  const ext = fileExt(name);
  return (
    {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      txt: "text/plain",
      md: "text/markdown",
    }[ext] ?? "application/octet-stream"
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

function parseSourceRows(raw: Record<string, any>[]): ProjectSource[] {
  const out: ProjectSource[] = [];
  for (const r of raw) {
    const rawIds = String(pick(r, "Project ID") ?? "").trim();
    if (!rawIds) continue;
    const ids = rawIds.split(/[,;/]|\band\b/i).map((s) => s.trim()).filter(Boolean);
    for (const projectId of ids) {
      const sourceTitle = String(pick(r, "Source Title", "Source Title / Description") ?? "").trim();
      if (!sourceTitle) continue;
      const url = String(pick(r, "URL") ?? "").trim();
      out.push({
        projectId,
        sourceType: String(pick(r, "Source Type") ?? "Document").trim() || "Document",
        sourceTitle,
        url: url || null,
        note: String(pick(r, "Notes", "Notes / Key Info") ?? "").trim(),
      });
    }
  }
  return out;
}
