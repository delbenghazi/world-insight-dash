// src/lib/codebook.ts

// ---------------------------------------------------------------------------

// Turns the Codebook sheet of master.xlsx into the CODEBOOK section of the

// system prompt. This file is PURE (no node/fs imports) so it is safe to use

// anywhere. The server function reads the workbook and calls buildCodebookSection().

//

// Workbook layout contract (Codebook sheet) — keep intact when editing master.xlsx:

//   - Three tables side by side, each separated by ONE blank column.

//   - Row 1 is the header row for every table.

//   - Block A (cols A-E):  DIMENSION | Score | Label | Observable Criteria | Decision Rules

//   - Block B (cols G-I):  Type | Definition | Trigger Condition

//   - Block C (cols K-N):  OVERALL RISK LEVEL | Typical Composite Range | Additional Conditions | Recommended Action

//   - The DIMENSION column uses merged cells spanning each dimension's score rows.

// ---------------------------------------------------------------------------

import * as XLSX from "xlsx";

export type BlockKind = "dimensions" | "interactions" | "risk" | "unknown";

export interface CodebookBlock {

  kind: BlockKind;

  headers: string[];

  rows: Record<string, string>[];

}

// --- Position-accurate grid, with merged cells filled in --------------------

function sheetToGrid(sheet: XLSX.WorkSheet): string[][] {

  const ref = sheet["!ref"];

  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);

  const grid: string[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {

    const row: string[] = [];

    for (let c = range.s.c; c <= range.e.c; c++) {

      const cell = sheet[XLSX.utils.encode_cell({ r, c })];

      row.push(cell && cell.v != null ? String(cell.v).trim() : "");

    }

    grid.push(row);

  }

  // Fill merges so the merged DIMENSION name repeats down its score rows.

  for (const m of sheet["!merges"] ?? []) {

    const v = grid[m.s.r]?.[m.s.c] ?? "";

    for (let r = m.s.r; r <= m.e.r; r++)

      for (let c = m.s.c; c <= m.e.c; c++) if (grid[r]) grid[r][c] = v;

  }

  return grid;

}

function detectColumnBlocks(headerRow: string[]) {

  const blocks: Array<{ start: number; end: number }> = [];

  let start = -1;

  for (let c = 0; c < headerRow.length; c++) {

    const has = headerRow[c] !== "";

    if (has && start === -1) start = c;

    if (!has && start !== -1) {

      blocks.push({ start, end: c - 1 });

      start = -1;

    }

  }

  if (start !== -1) blocks.push({ start, end: headerRow.length - 1 });

  return blocks;

}

function classifyBlock(headers: string[]): BlockKind {

  const h = headers.map((x) => x.toLowerCase());

  if (h.some((x) => x.startsWith("score"))) return "dimensions";

  if (h.some((x) => x.includes("trigger"))) return "interactions";

  if (h.some((x) => x.includes("composite") || x.includes("risk level")))

    return "risk";

  return "unknown";

}

export function parseCodebook(sheet: XLSX.WorkSheet): CodebookBlock[] {

  const grid = sheetToGrid(sheet);

  if (grid.length === 0) return [];

  const headerRow = grid[0];

  return detectColumnBlocks(headerRow).map(({ start, end }) => {

    const headers = headerRow.slice(start, end + 1);

    const rows: Record<string, string>[] = [];

    for (let r = 1; r < grid.length; r++) {

      const slice = grid[r].slice(start, end + 1);

      if (slice.every((v) => v === "")) continue;

      const obj: Record<string, string> = {};

      headers.forEach((h, i) => (obj[h] = slice[i] ?? ""));

      rows.push(obj);

    }

    return { kind: classifyBlock(headers), headers, rows };

  });

}

// --- Fuzzy field accessor: tolerant of minor header renames -----------------

function field(

  row: Record<string, string>,

  headers: string[],

  ...needles: string[]

): string {

  const key = headers.find((h) =>

    needles.some((n) => h.toLowerCase().includes(n))

  );

  return key ? (row[key] ?? "").trim() : "";

}

// --- Render the three blocks into the CODEBOOK section of the prompt --------

export function buildCodebookSection(blocks: CodebookBlock[]): string {

  const dims = blocks.find((b) => b.kind === "dimensions");

  const inter = blocks.find((b) => b.kind === "interactions");

  const risk = blocks.find((b) => b.kind === "risk");

  const out: string[] = [

    "CODEBOOK (apply triggers strictly — extracted from master.xlsx; do not infer beyond what is stated here)",

  ];

  // Dimensions, grouped by dimension name in first-appearance order -> D1..Dn

  if (dims) {

    out.push("\nDIMENSION SCORING");

    const order: string[] = [];

    const byDim = new Map<string, Record<string, string>[]>();

    for (const row of dims.rows) {

      const name = field(row, dims.headers, "dimension");

      if (!name) continue;

      if (!byDim.has(name)) {

        byDim.set(name, []);

        order.push(name);

      }

      byDim.get(name)!.push(row);

    }

    order.forEach((name, i) => {

      out.push(`\nD${i + 1} — ${name.toUpperCase()}`);

      for (const row of byDim.get(name)!) {

        const score = field(row, dims.headers, "score");

        const label = field(row, dims.headers, "label");

        const criteria = field(row, dims.headers, "observable", "criteria");

        const rule = field(row, dims.headers, "decision", "rule");

        out.push(`- ${score} (${label}): ${criteria}`);

        if (rule) out.push(`  Decision rule: ${rule}`);

      }

    });

  }

  // Interaction types

  if (inter) {

    out.push("\nINTERACTION TYPES (cite the trigger that fired in interaction_note)");

    for (const row of inter.rows) {

      const type = field(row, inter.headers, "type");

      const def = field(row, inter.headers, "definition");

      const trig = field(row, inter.headers, "trigger");

      out.push(`- ${type} — ${def}`);

      if (trig) out.push(`  Trigger: ${trig}`);

    }

  }

  // Overall risk

  if (risk) {

    out.push("\nOVERALL RISK LEVEL (derive overall_risk strictly from these rules)");

    for (const row of risk.rows) {

      const level = field(row, risk.headers, "risk level", "overall");

      const range = field(row, risk.headers, "composite", "range");

      const cond = field(row, risk.headers, "additional", "condition");

      const action = field(row, risk.headers, "recommended", "action");

      let line = `- ${level}: Composite ${range}.`;

      if (cond) line += ` ${cond}.`;

      if (action) line += ` Action: ${action}.`;

      out.push(line);

    }

  }

  return out.join("\n");

}

// --- Deterministic risk band (for the later provisional-mode work) ----------

// Not wired into the prompt yet. Use when you add provisional handling so the

// displayed band is computed from the workbook ranges, not invented by the model.

function parseCompositeRange(s: string): [number, number] {

  const nums = s.replace(/[–—-]/g, " ").match(/\d+/g)?.map(Number) ?? [];

  if (nums.length >= 2) return [nums[0], nums[1]];

  if (nums.length === 1) return [nums[0], Infinity];

  return [-Infinity, Infinity];

}

export function computeBaseRisk(

  scores: Array<number | null>,

  riskBlock: CodebookBlock

) {

  const rangeKey = riskBlock.headers.find((h) =>

    h.toLowerCase().includes("composite")

  );

  const levelKey = riskBlock.headers[0];

  const bandFor = (composite: number): string => {

    if (!rangeKey) return "Unknown";

    for (const row of riskBlock.rows) {

      const [lo, hi] = parseCompositeRange(row[rangeKey]);

      if (composite >= lo && composite <= hi) return row[levelKey];

    }

    return "Unknown";

  };

  const known = scores.filter((s): s is number => s != null);

  const missing = scores.length - known.length;

  const base = known.reduce((a, b) => a + b, 0);

  if (missing === 0)

    return { provisional: false, composite: base, level: bandFor(base) };

  const lo = base + missing;

  const hi = base + missing * 3;

  const loB = bandFor(lo);

  const hiB = bandFor(hi);

  return {

    provisional: true,

    compositeRange: [lo, hi] as [number, number],

    level: loB === hiB ? loB : `${loB}-${hiB}`,

  };

}