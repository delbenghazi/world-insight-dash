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

/**
 * Many project notes refer to siblings by a short alias ("ES1", "H2", "G3")
 * even though projectId is the long form ("SLV1", "HND2", "GTM3"). Return the
 * set of aliases used to find pair-specific mentions inside a note.
 */
function idAliases(projectId: string): string[] {
  const aliases = new Set<string>([projectId]);
  const m = projectId.match(/^([A-Z]{2,4})(\d+)$/);
  if (m) {
    const [, prefix, num] = m;
    if (prefix === "SLV") aliases.add(`ES${num}`);
    if (prefix === "HND") aliases.add(`H${num}`);
    if (prefix === "GTM") aliases.add(`G${num}`);
  }
  return [...aliases];
}

function mentionsPartner(text: string, partner: Project): boolean {
  const aliases = idAliases(partner.projectId);
  return aliases.some((a) => new RegExp(`\\b${a}\\b`, "i").test(text));
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Pull the bits of each project's note that actually reference the pair partner. */
function pairNote(a: Project, b: Project): string {
  const fragments: string[] = [];
  for (const [self, other] of [
    [a, b],
    [b, a],
  ] as const) {
    const note = self.interactionNote ?? "";
    if (!note) continue;
    const sentences = splitSentences(note);
    const pairSentences = sentences.filter((s) => mentionsPartner(s, other));
    if (pairSentences.length > 0) fragments.push(pairSentences.join(" "));
  }
  return fragments.join(" ").replace(/\s+/g, " ").trim();
}

function tidy(text: string): string {
  return text.replace(/\.{2,}/g, ".").replace(/\s+\./g, ".").replace(/\s+/g, " ").trim();
}

const DEP_CUES =
  /\b(depend(s|ed|ent)?|prerequisite|precondition|feeds into|enabler|backbone|must (land|come) first|before|requires?|relies on|fall back|delayed)\b/i;

/**
 * True only if one project's note explicitly ties a precondition to THIS pair
 * partner — not just because a project has a high D2/D3 in isolation.
 */
function hasCrossDependency(a: Project, b: Project): boolean {
  for (const [self, other] of [
    [a, b],
    [b, a],
  ] as const) {
    const sentences = splitSentences(self.interactionNote ?? "");
    for (const s of sentences) {
      if (mentionsPartner(s, other) && DEP_CUES.test(s)) return true;
    }
  }
  return false;
}

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
  const aAliases = idAliases(a.projectId);
  const bAliases = idAliases(b.projectId);
  const aPat = aAliases.join("|");
  const bPat = bAliases.join("|");
  const note = `${a.interactionNote ?? ""} ${b.interactionNote ?? ""}`;
  // "a depends on b" → b first
  const aDepB = new RegExp(`\\b(${aPat})\\b[^.]*depend[^.]*\\b(${bPat})\\b`, "i").test(note);
  const bDepA = new RegExp(`\\b(${bPat})\\b[^.]*depend[^.]*\\b(${aPat})\\b`, "i").test(note);
  if (aDepB && !bDepA) return { first: b, second: a };
  if (bDepA && !aDepB) return { first: a, second: b };
  const cue = "(feeds into|enabler for|prerequisite for|backbone|reinforces|before|must land first)";
  const aFeedsB = new RegExp(`\\b(${aPat})\\b[^.]*${cue}[^.]*\\b(${bPat})\\b`, "i").test(note);
  const bFeedsA = new RegExp(`\\b(${bPat})\\b[^.]*${cue}[^.]*\\b(${aPat})\\b`, "i").test(note);
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
  const baseType = pairInteractionType(a, b) ?? "Unclassified";
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

  const pNote = pairNote(a, b);

  // Gate 1 — Redesign
  if (baseType === "Governance-Conflicting") {
    const detail = pNote || "two systems or split ownership for the same function";
    return {
      a,
      b,
      outcome: "Redesign",
      gate: 1,
      interactionType: "Governance-Conflicting",
      reason: tidy(
        `Governance conflict between ${a.projectId} and ${b.projectId}. ${detail} Resolve governance before either moves; redesign to one system / one owner.`,
      ),
      flags,
      provisional,
    };
  }

  // Gate 2 — Sequence
  // Only fires on a REAL directional dependency between THIS pair:
  //   (a) interaction type is "Sequentially Dependent", OR
  //   (b) one project's note explicitly ties a precondition to the partner.
  const seqByType = baseType === "Sequentially Dependent";
  const crossDep = hasCrossDependency(a, b);
  if (seqByType || crossDep) {
    const direction = inferDirection(a, b);
    const detail = pNote || "an unmet regulatory or technical precondition links the two";
    let reason: string;
    if (direction) {
      reason = `${direction.first.projectId} must land first. ${detail} Run the predecessor first; hold the dependent project.`;
    } else {
      reason = `Sequential dependency between ${a.projectId} and ${b.projectId}. ${detail} Run the predecessor first; hold the dependent project.`;
    }
    return {
      a,
      b,
      outcome: "Sequence",
      gate: 2,
      interactionType: "Sequentially Dependent",
      reason: tidy(reason),
      direction,
      directionUnknown: !direction,
      flags,
      provisional,
    };
  }

  // Pair has no cross-dependency — but flag if both projects are individually
  // high on regulatory or technical load so reviewers can confirm.
  if (a.dim3_technical === 3 && b.dim3_technical === 3)
    flags.push(`both D3=3 — could reclassify to sequence · confirm`);
  if (a.dim2_regulatory === 3 && b.dim2_regulatory === 3)
    flags.push(`both D2=3 — could reclassify to sequence · confirm`);

  // Gate 3 — Coordinate
  const sameLead =
    !!a.implementingAgency &&
    !!b.implementingAgency &&
    a.implementingAgency === b.implementingAgency;
  const combinedD1 = (a.dim1_institutional ?? 0) + (b.dim1_institutional ?? 0);
  if (sameLead && combinedD1 >= 5) {
    const detail = pNote ? ` ${pNote}` : "";
    return {
      a,
      b,
      outcome: "Coordinate",
      gate: 3,
      interactionType: baseType,
      reason: tidy(
        `Both lean on ${a.implementingAgency}'s limited capacity; combined institutional load = ${combinedD1} (${a.dim1_institutional}+${b.dim1_institutional}).${detail} Add a coordination mechanism (lead agency or joint committee) and stagger workplans.`,
      ),
      flags,
      provisional,
    };
  }

  // Gate 4 — Parallel (default)
  const detail = pNote ? ` ${pNote}` : "";
  return {
    a,
    b,
    outcome: "Parallel",
    gate: 4,
    interactionType: baseType,
    reason: tidy(
      `No blocking conflict, sequence, or shared-lead overload detected (combined D1 = ${combinedD1}${sameLead ? ", same lead" : ", different leads"}).${detail} Run both at the same time; align timelines at review points.`,
    ),
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
