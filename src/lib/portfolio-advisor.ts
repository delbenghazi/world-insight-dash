// Portfolio Sequencing Advisor — derives decision-relevant insights
// (waves, critical path, bottlenecks, conflicts) from the pairwise
// sequencing engine. Pairwise results remain as the evidence layer.

import type { Project } from "./project-data";
import { evaluateAllPairs, evaluatePair, type PairResult } from "./sequencing";

export interface DepEdge {
  from: Project; // predecessor — must land first
  to: Project; // dependent
  pair: PairResult;
  directionConfirmed: boolean;
}

export interface CoordCluster {
  agency: string;
  projects: Project[];
  combinedD1: number;
}

export interface Wave {
  index: number; // 0-based
  projects: Project[];
}

export interface BottleneckEntry {
  project: Project;
  centrality: number;
  outDegree: number; // # of projects this project blocks
  inDegree: number; // # of projects blocking this one
}

export interface PortfolioAnalysis {
  projects: Project[];
  pairs: PairResult[];
  edges: DepEdge[];
  conflicts: PairResult[];
  coordClusters: CoordCluster[];
  waves: Wave[];
  criticalPath: Project[];
  bottlenecks: BottleneckEntry[];
  counts: {
    conflicts: number;
    sequencing: number;
    coordination: number;
    parallel: number;
  };
  portfolioRisk: {
    score: number; // 0..15
    label: "Low" | "Medium" | "High";
  };
  hasCycle: boolean;
}

export function composite(p: Project): number {
  return (
    (p.dim1_institutional ?? 0) +
    (p.dim2_regulatory ?? 0) +
    (p.dim3_technical ?? 0) +
    (p.dim4_political ?? 0) +
    (p.dim5_investment ?? 0)
  );
}

export function analyzePortfolio(projects: Project[]): PortfolioAnalysis {
  const pairs = projects.length >= 2 ? evaluateAllPairs(projects) : [];
  const edges: DepEdge[] = [];
  const conflicts: PairResult[] = [];

  for (const p of pairs) {
    if (p.outcome === "Redesign") conflicts.push(p);
    if (p.outcome === "Sequence") {
      if (p.direction) {
        edges.push({
          from: p.direction.first,
          to: p.direction.second,
          pair: p,
          directionConfirmed: true,
        });
      } else {
        const [first, second] = [p.a, p.b].sort((x, y) =>
          x.projectId.localeCompare(y.projectId),
        );
        edges.push({ from: first, to: second, pair: p, directionConfirmed: false });
      }
    }
  }

  // Coordination clusters — same lead agency, combined institutional load ≥ 5
  const byAgency = new Map<string, Project[]>();
  for (const p of projects) {
    if (!p.implementingAgency) continue;
    const arr = byAgency.get(p.implementingAgency) ?? [];
    arr.push(p);
    byAgency.set(p.implementingAgency, arr);
  }
  const coordClusters: CoordCluster[] = [];
  for (const [agency, arr] of byAgency) {
    if (arr.length < 2) continue;
    const combinedD1 = arr.reduce(
      (s, x) => s + (x.dim1_institutional ?? 0),
      0,
    );
    if (combinedD1 >= 5) coordClusters.push({ agency, projects: arr, combinedD1 });
  }

  // Waves via Kahn's topo sort on the directed dependency edges
  const ids = projects.map((p) => p.projectId);
  const idToProject = new Map(projects.map((p) => [p.projectId, p] as const));
  const inDeg = new Map<string, number>(ids.map((i) => [i, 0]));
  const outAdj = new Map<string, string[]>(ids.map((i) => [i, []]));
  for (const e of edges) {
    outAdj.get(e.from.projectId)!.push(e.to.projectId);
    inDeg.set(e.to.projectId, (inDeg.get(e.to.projectId) ?? 0) + 1);
  }
  const remaining = new Map(inDeg);
  const placed = new Set<string>();
  const waves: Wave[] = [];
  let hasCycle = false;
  let waveIdx = 0;
  while (placed.size < projects.length) {
    const ready = ids.filter(
      (id) => !placed.has(id) && (remaining.get(id) ?? 0) === 0,
    );
    if (ready.length === 0) {
      hasCycle = true;
      const rest = projects.filter((p) => !placed.has(p.projectId));
      waves.push({ index: waveIdx++, projects: rest });
      rest.forEach((p) => placed.add(p.projectId));
      break;
    }
    // Sort ready projects by projectId for deterministic ordering
    ready.sort();
    const waveProjs = ready.map((id) => idToProject.get(id)!);
    waves.push({ index: waveIdx++, projects: waveProjs });
    for (const id of ready) {
      placed.add(id);
      for (const next of outAdj.get(id) ?? []) {
        remaining.set(next, (remaining.get(next) ?? 1) - 1);
      }
    }
  }

  // Bottlenecks — degree centrality on the dependency graph
  const bottlenecks: BottleneckEntry[] = projects
    .map((p) => {
      const outDegree = outAdj.get(p.projectId)?.length ?? 0;
      const inDegree = edges.filter((e) => e.to.projectId === p.projectId)
        .length;
      return {
        project: p,
        centrality: outDegree + inDegree,
        outDegree,
        inDegree,
      };
    })
    .sort((a, b) => b.centrality - a.centrality || composite(b.project) - composite(a.project));

  // Critical path — longest weighted chain in the DAG, weights = composite score
  const memo = new Map<string, { len: number; path: string[] }>();
  function longest(id: string): { len: number; path: string[] } {
    if (memo.has(id)) return memo.get(id)!;
    const proj = idToProject.get(id)!;
    const w = composite(proj);
    let best: { len: number; path: string[] } = { len: w, path: [id] };
    for (const next of outAdj.get(id) ?? []) {
      if (next === id) continue;
      const sub = longest(next);
      if (sub.len + w > best.len) best = { len: sub.len + w, path: [id, ...sub.path] };
    }
    memo.set(id, best);
    return best;
  }
  let critBest = { len: 0, path: [] as string[] };
  if (!hasCycle) {
    for (const id of ids) {
      const r = longest(id);
      if (r.len > critBest.len) critBest = r;
    }
  }
  const criticalPath = critBest.path.map((id) => idToProject.get(id)!);

  const counts = {
    conflicts: pairs.filter((p) => p.outcome === "Redesign").length,
    sequencing: pairs.filter((p) => p.outcome === "Sequence").length,
    coordination: coordClusters.length,
    parallel: pairs.filter((p) => p.outcome === "Parallel").length,
  };

  const avgComposite =
    projects.reduce((s, p) => s + composite(p), 0) / Math.max(projects.length, 1);
  const conflictPenalty = counts.conflicts * 0.75;
  const score = Math.min(15, avgComposite + conflictPenalty);
  const label: "Low" | "Medium" | "High" =
    score >= 10 ? "High" : score >= 7 ? "Medium" : "Low";

  return {
    projects,
    pairs,
    edges,
    conflicts,
    coordClusters,
    waves,
    criticalPath,
    bottlenecks,
    counts,
    portfolioRisk: { score, label },
    hasCycle,
  };
}

/**
 * "What-if" lite: if the user forces `forced` to start before `blocker`,
 * does that violate a dependency? Returns a verdict + risk-level delta.
 * Risk impact is expressed as a label change only — no month estimates.
 */
export interface WhatIfResult {
  ok: boolean;
  forced: Project;
  blocker: Project;
  message: string;
  riskBefore: "Low" | "Medium" | "High";
  riskAfter: "Low" | "Medium" | "High";
  recommendation: string;
}

export function simulateForceStart(
  analysis: PortfolioAnalysis,
  forcedId: string,
  blockerId: string,
): WhatIfResult | null {
  const forced = analysis.projects.find((p) => p.projectId === forcedId);
  const blocker = analysis.projects.find((p) => p.projectId === blockerId);
  if (!forced || !blocker) return null;
  const pair = evaluatePair(forced, blocker);
  const violates =
    pair.outcome === "Sequence" &&
    ((pair.direction && pair.direction.first.projectId === blocker.projectId) ||
      !pair.direction);
  const riskBefore = analysis.portfolioRisk.label;
  const order: Array<"Low" | "Medium" | "High"> = ["Low", "Medium", "High"];
  const riskAfter = violates
    ? order[Math.min(order.indexOf(riskBefore) + 1, 2)]
    : riskBefore;
  return {
    ok: !violates,
    forced,
    blocker,
    riskBefore,
    riskAfter,
    message: violates
      ? `Prerequisite dependency violated. ${blocker.projectId} is an institutional enabler for ${forced.projectId}.`
      : `No prerequisite dependency detected between ${forced.projectId} and ${blocker.projectId}.`,
    recommendation: violates
      ? `Hold ${forced.projectId} until ${blocker.projectId} reaches its institutional milestone (e.g. 50% disbursement).`
      : `Safe to run ${forced.projectId} ahead of ${blocker.projectId}; align at review points.`,
  };
}
