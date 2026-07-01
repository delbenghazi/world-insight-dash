// Precomputed portfolio patterns for the AI advisor. Runs server-side before
// prompt assembly so the model reasons on cooked signals, not raw rows.

export interface AnalyticsProject {
  projectId: string;
  projectName?: string;
  leadDonor?: string;
  startDate?: string;
  endDate?: string;
  dim1_institutional?: number | null;
  dim2_regulatory?: number | null;
  dim3_technical?: number | null;
  dim4_political?: number | null;
  dim5_investment?: number | null;
  compositeScore?: number | null;
  overallRisk?: string;
}


export interface PairLite {
  a: string;
  b: string;
  outcome: string;
  gate: number;
  interactionType: string;
  reason: string;
  flags?: string[];
}

export interface AdvisorAnalytics {
  hotspots: Array<{ id: string; composite: number; risk: string }>;
  dimensionAverages: { d1: number; d2: number; d3: number; d4: number; d5: number };
  weakestDimension: string;
  conflictClusters: Array<{ members: string[]; kinds: string[] }>;
  sequencingChains: string[][]; // e.g. [["GTM1","GTM3","HND2"]]
  donorOverlaps: Array<{ donor: string; projects: string[] }>;
  timelinePressure: Array<{ a: string; b: string; overlapMonths: number }>;
}

function avg(nums: number[]): number {
  const clean = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  return clean.length ? Math.round((clean.reduce((s, n) => s + n, 0) / clean.length) * 10) / 10 : 0;
}

function monthsBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(+da) || Number.isNaN(+db)) return 0;
  return Math.round((+db - +da) / (1000 * 60 * 60 * 24 * 30));
}

function windowsOverlap(p: AnalyticsProject, q: AnalyticsProject): number {
  if (!p.startDate || !p.endDate || !q.startDate || !q.endDate) return 0;
  const start = new Date(Math.max(+new Date(p.startDate), +new Date(q.startDate)));
  const end = new Date(Math.min(+new Date(p.endDate), +new Date(q.endDate)));
  if (+end <= +start) return 0;
  return monthsBetween(start.toISOString(), end.toISOString());
}

export function computeAdvisorAnalytics(
  projects: AnalyticsProject[],
  pairs: PairLite[],
): AdvisorAnalytics {
  // Hotspots — top by composite
  const hotspots = [...projects]
    .filter((p) => typeof p.compositeScore === "number")
    .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0))
    .slice(0, 3)
    .map((p) => ({ id: p.projectId, composite: p.compositeScore, risk: p.overallRisk }));

  const dimensionAverages = {
    d1: avg(projects.map((p) => p.dim1_institutional)),
    d2: avg(projects.map((p) => p.dim2_regulatory)),
    d3: avg(projects.map((p) => p.dim3_technical)),
    d4: avg(projects.map((p) => p.dim4_political)),
    d5: avg(projects.map((p) => p.dim5_investment)),
  };
  const dimNames: Record<string, string> = {
    d1: "Institutional (D1)",
    d2: "Regulatory (D2)",
    d3: "Technical (D3)",
    d4: "Political (D4)",
    d5: "Investment (D5)",
  };
  const weakestKey = (Object.entries(dimensionAverages).sort((a, b) => b[1] - a[1])[0] ?? ["d1", 0])[0];
  const weakestDimension = dimNames[weakestKey] ?? "n/a";

  // Conflict clusters — union-find over conflicting/competing edges
  const conflictKinds = new Set(["Institutionally Competing", "Governance-Conflicting"]);
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) === x) return x;
    const r = find(parent.get(x)!);
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };
  const edgeKind = new Map<string, string[]>();
  for (const p of pairs) {
    if (!conflictKinds.has(p.interactionType)) continue;
    union(p.a, p.b);
    const key = find(p.a);
    edgeKind.set(key, [...(edgeKind.get(key) ?? []), p.interactionType]);
  }
  const clusters = new Map<string, Set<string>>();
  for (const p of pairs) {
    if (!conflictKinds.has(p.interactionType)) continue;
    const root = find(p.a);
    if (!clusters.has(root)) clusters.set(root, new Set());
    clusters.get(root)!.add(p.a);
    clusters.get(root)!.add(p.b);
  }
  const conflictClusters = [...clusters.entries()]
    .filter(([, members]) => members.size >= 2)
    .map(([root, members]) => ({
      members: [...members].sort(),
      kinds: [...new Set(edgeKind.get(root) ?? [])],
    }));

  // Sequencing chains — longest simple paths through dependent edges
  const depAdj = new Map<string, Set<string>>();
  for (const p of pairs) {
    if (p.interactionType !== "Sequentially Dependent") continue;
    if (!depAdj.has(p.a)) depAdj.set(p.a, new Set());
    depAdj.get(p.a)!.add(p.b);
  }
  const chains: string[][] = [];
  const visited = new Set<string>();
  const dfs = (node: string, path: string[]) => {
    const nexts = depAdj.get(node);
    if (!nexts || nexts.size === 0) {
      if (path.length >= 2) chains.push([...path]);
      return;
    }
    for (const n of nexts) {
      if (path.includes(n)) continue;
      dfs(n, [...path, n]);
    }
  };
  for (const start of depAdj.keys()) {
    if (visited.has(start)) continue;
    dfs(start, [start]);
    visited.add(start);
  }
  // Deduplicate — keep only maximal chains
  const maxChains = chains.filter(
    (c) => !chains.some((o) => o !== c && o.length > c.length && o.join(">").includes(c.join(">"))),
  );

  // Donor overlaps — donors funding ≥2 projects
  const donorMap = new Map<string, string[]>();
  for (const p of projects) {
    const key = (p.leadDonor || "").trim();
    if (!key) continue;
    if (!donorMap.has(key)) donorMap.set(key, []);
    donorMap.get(key)!.push(p.projectId);
  }
  const donorOverlaps = [...donorMap.entries()]
    .filter(([, ids]) => ids.length >= 2)
    .map(([donor, projects]) => ({ donor, projects: projects.sort() }));

  // Timeline pressure — projects with overlapping windows AND weak D1/D2
  const timelinePressure: Array<{ a: string; b: string; overlapMonths: number }> = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const p = projects[i];
      const q = projects[j];
      const overlap = windowsOverlap(p, q);
      if (overlap < 6) continue;
      const weakP = (p.dim1_institutional ?? 0) >= 3 || (p.dim2_regulatory ?? 0) >= 3;
      const weakQ = (q.dim1_institutional ?? 0) >= 3 || (q.dim2_regulatory ?? 0) >= 3;
      if (weakP && weakQ) {
        timelinePressure.push({ a: p.projectId, b: q.projectId, overlapMonths: overlap });
      }
    }
  }

  return {
    hotspots,
    dimensionAverages,
    weakestDimension,
    conflictClusters,
    sequencingChains: maxChains,
    donorOverlaps,
    timelinePressure: timelinePressure.slice(0, 8),
  };
}

export function analyticsToPromptBlock(a: AdvisorAnalytics): string {
  const lines: string[] = [];
  lines.push("PORTFOLIO ANALYTICS (precomputed — cite directly):");
  if (a.hotspots.length) {
    lines.push(
      `- Risk hotspots (top composite): ${a.hotspots.map((h) => `${h.id}=${h.composite}/${h.risk}`).join(", ")}`,
    );
  }
  lines.push(
    `- Dimension averages: D1=${a.dimensionAverages.d1} D2=${a.dimensionAverages.d2} D3=${a.dimensionAverages.d3} D4=${a.dimensionAverages.d4} D5=${a.dimensionAverages.d5} (weakest: ${a.weakestDimension})`,
  );
  if (a.conflictClusters.length) {
    lines.push(`- Conflict clusters:`);
    for (const c of a.conflictClusters)
      lines.push(`    · {${c.members.join(", ")}} — ${c.kinds.join(" + ")}`);
  }
  if (a.sequencingChains.length) {
    lines.push(`- Sequencing chains:`);
    for (const ch of a.sequencingChains) lines.push(`    · ${ch.join(" → ")}`);
  }
  if (a.donorOverlaps.length) {
    lines.push(`- Donor overlaps (≥2 projects):`);
    for (const d of a.donorOverlaps) lines.push(`    · ${d.donor}: ${d.projects.join(", ")}`);
  }
  if (a.timelinePressure.length) {
    lines.push(`- Timeline pressure (overlapping windows + weak D1/D2):`);
    for (const t of a.timelinePressure)
      lines.push(`    · ${t.a} × ${t.b}: ${t.overlapMonths}mo overlap`);
  }
  return lines.join("\n");
}

/** Suggested quick-action chips derived from analytics. */
export function suggestQuickActions(a: AdvisorAnalytics): string[] {
  const out: string[] = [];
  if (a.conflictClusters[0]) {
    const c = a.conflictClusters[0];
    out.push(`Explain the ${c.members.slice(0, 2).join(" × ")} conflict`);
  }
  if (a.sequencingChains[0]) {
    out.push(`Walk me through the ${a.sequencingChains[0].join(" → ")} chain`);
  }
  if (a.hotspots[0]) {
    out.push(`Why is ${a.hotspots[0].id} the highest-risk project?`);
  }
  if (a.donorOverlaps[0]) {
    out.push(`Where does ${a.donorOverlaps[0].donor} overlap with itself?`);
  }
  if (a.timelinePressure[0]) {
    const t = a.timelinePressure[0];
    out.push(`Is ${t.a} × ${t.b} at risk of colliding on the timeline?`);
  }
  return out.slice(0, 4);
}
