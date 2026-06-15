// Pair sequencing engine. Pure rules tree — no AI calls.
// For any pair of projects, runs four gates in severity order and stops
// at the first match ("worst case wins"). The AI advisor only explains
// these outputs; it never decides them.

import type { Project } from "./project-data";

export type GateOutcome = "Redesign" | "Sequence" | "Coordinate" | "Parallel";

export interface PairResult {
  a: Project;
  b: Project;
  outcome: GateOutcome;
  gate: 1 | 2 | 3 | 4;
  interactionType: string;
  reason: string;
  direction?: { first: Project; second: Project } | null;
  /** True when direction couldn't be inferred from the matrix note. */
  directionUnknown?: boolean;
  flags: string[];
  /** Any D1–D5 score missing or proxy on either project. */
  provisional: boolean;
}

const SEVERITY = [
  "Governance-Conflicting",
  "Sequentially Dependent",
  "Institutionally Competing",
  "Complementary",
] as const;

function pairInteractionType(a: Project, b: Project): string | null {
  const aLinks = a.linkedProjectIds?.includes(b.projectId);
  const bLinks = b.linkedProjectIds?.includes(a.projectId);
  const types: string[] = [];
  if (aLinks) types.push(a.interactionType);
  if (bLinks) types.push(b.interactionType);
  for (const t of SEVERITY) if (types.includes(t)) return t;
  return null;
}

function inferDirection(a: Project, b: Project): PairResult["direction"] {
  // Heuristic: scan interactionNote for "X depends on Y" / "Y first" cues.
  const note = `${a.interactionNote ?? ""} ${b.interactionNote ?? ""}`.toLowerCase();
  const aId = a.projectId.toLowerCase();
  const bId = b.projectId.toLowerCase();
  // "a depends on b" → b first
  const aDepB = new RegExp(`${aId}[^.]*depend[^.]*${bId}`).test(note);
  const bDepA = new RegExp(`${bId}[^.]*depend[^.]*${aId}`).test(note);
  if (aDepB && !bDepA) return { first: b, second: a };
  if (bDepA && !aDepB) return { first: a, second: b };
  // "feeds into" / "enabler for" cues from a → b means a first
  const aFeedsB = new RegExp(`${aId}[^.]*(feeds into|enabler for|prerequisite for|reinforces)[^.]*${bId}`).test(note);
  const bFeedsA = new RegExp(`${bId}[^.]*(feeds into|enabler for|prerequisite for|reinforces)[^.]*${aId}`).test(note);
  if (aFeedsB && !bFeedsA) return { first: a, second: b };
  if (bFeedsA && !aFeedsB) return { first: b, second: a };
  return null;
}

function hasMissingOrProxyScore(p: Project): boolean {
  const dims = [
    p.dim1_institutional,
    p.dim2_regulatory,
    p.dim3_technical,
    p.dim4_political,
    p.dim5_investment,
  ];
  if (dims.some((d) => d == null || Number.isNaN(d))) return true;
  return !!p.proxyDimensions && p.proxyDimensions.length > 0;
}

export function evaluatePair(a: Project, b: Project): PairResult {
  const interactionType = pairInteractionType(a, b) ?? "Unclassified";
  const flags: string[] = [];

  // Add-on flags (independent of the gate outcome)
  if (a.dim5_investment === 3)
    flags.push(`${a.projectId} is funding-fragile (D5=3) — hold any dependent project until it is on track`);
  if (b.dim5_investment === 3)
    flags.push(`${b.projectId} is funding-fragile (D5=3) — hold any dependent project until it is on track`);
  if (a.dim3_technical === 3 && a.dim4_political === 3)
    flags.push(`${a.projectId} is overloaded (D3=3 and D4=3) — fragile on its own`);
  if (b.dim3_technical === 3 && b.dim4_political === 3)
    flags.push(`${b.projectId} is overloaded (D3=3 and D4=3) — fragile on its own`);

  const provisional = hasMissingOrProxyScore(a) || hasMissingOrProxyScore(b);
  if (provisional)
    flags.push("Result is provisional — one or more dimension scores are missing or proxy-derived");

  // Gate 1 — Redesign
  if (interactionType === "Governance-Conflicting") {
    return {
      a,
      b,
      outcome: "Redesign",
      gate: 1,
      interactionType,
      reason: `Governance conflict between ${a.projectId} and ${b.projectId} (${a.interactionNote || b.interactionNote || "two systems or split ownership for the same function"}). Resolve governance before either moves; redesign to one system / one owner.`,
      flags,
      provisional,
    };
  }

  // Gate 2 — Sequence
  const aPrecond = a.dim2_regulatory === 3 || a.dim3_technical === 3;
  const bPrecond = b.dim2_regulatory === 3 || b.dim3_technical === 3;
  const seqByType = interactionType === "Sequentially Dependent";
  const seqByPrecond =
    (aPrecond && !bPrecond) || (bPrecond && !aPrecond); // one has an unmet precondition the other may resolve
  if (seqByType || seqByPrecond) {
    const direction = inferDirection(a, b);
    const note = a.interactionNote || b.interactionNote || "";
    let reason: string;
    if (direction) {
      reason = `${direction.first.projectId} must land first: ${note}. Run the predecessor first; hold the dependent project.`;
    } else {
      reason = `Sequential dependency between ${a.projectId} and ${b.projectId}: ${note || "an unmet regulatory or technical precondition links the two"}. Run the predecessor first; hold the dependent project.`;
    }
    return {
      a,
      b,
      outcome: "Sequence",
      gate: 2,
      interactionType,
      reason,
      direction,
      directionUnknown: !direction,
      flags,
      provisional,
    };
  }

  // Gate 3 — Coordinate
  const sameLead =
    !!a.implementingAgency &&
    !!b.implementingAgency &&
    a.implementingAgency === b.implementingAgency;
  const combinedD1 = (a.dim1_institutional ?? 0) + (b.dim1_institutional ?? 0);
  if (sameLead && combinedD1 >= 5) {
    return {
      a,
      b,
      outcome: "Coordinate",
      gate: 3,
      interactionType,
      reason: `Both lean on ${a.implementingAgency}'s limited capacity; combined institutional load = ${combinedD1} (${a.dim1_institutional}+${b.dim1_institutional}). Add a coordination mechanism (lead agency or joint committee) and stagger workplans.`,
      flags,
      provisional,
    };
  }

  // Gate 4 — Parallel (default)
  return {
    a,
    b,
    outcome: "Parallel",
    gate: 4,
    interactionType,
    reason: `No blocking conflict, sequence, or shared-lead overload detected (combined D1 = ${combinedD1}${sameLead ? ", same lead" : ", different leads"}). Run both at the same time; align timelines at review points.`,
    flags,
    provisional,
  };
}

export function evaluateAllPairs(projects: Project[]): PairResult[] {
  const results: PairResult[] = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      results.push(evaluatePair(projects[i], projects[j]));
    }
  }
  return results;
}

export const OUTCOME_META: Record<
  GateOutcome,
  { label: string; tint: string; dot: string }
> = {
  Redesign: {
    label: "Redesign",
    tint: "var(--color-risk-high)",
    dot: "var(--color-risk-high)",
  },
  Sequence: {
    label: "Sequence",
    tint: "var(--color-risk-medium)",
    dot: "var(--color-risk-medium)",
  },
  Coordinate: {
    label: "Coordinate",
    tint: "#14b8a6",
    dot: "#14b8a6",
  },
  Parallel: {
    label: "Run in parallel",
    tint: "var(--color-risk-low)",
    dot: "var(--color-risk-low)",
  },
};
