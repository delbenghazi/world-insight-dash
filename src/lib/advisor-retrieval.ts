// Lightweight retrieval — score projects/pairs by relevance to the user's
// latest question so the prompt always includes what they asked about in
// full, and truncates the rest to a one-liner.

import type { AnalyticsProject } from "./advisor-analytics";
import type { PairLite } from "./advisor-analytics";


const DIM_KEYWORDS: Record<string, RegExp> = {
  dim1_institutional: /\b(institution|mandate|agency|govern|coordinat)/i,
  dim2_regulatory: /\b(regulat|law|legal|policy|framework)/i,
  dim3_technical: /\b(technical|stack|architect|interoper|standard|api|infrastruct)/i,
  dim4_political: /\b(politic|election|risk|instabilit|regime)/i,
  dim5_investment: /\b(invest|funding|budget|cost|financ|donor)/i,
};

function extractIds(q: string): Set<string> {
  const ids = new Set<string>();
  const re = /\b([A-Z]{2,4})(\d+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) ids.add(`${m[1]}${m[2]}`);
  return ids;
}

export function scoreProject(p: Project, q: string, ids: Set<string>): number {
  let s = 0;
  if (ids.has(p.projectId)) s += 10;
  const qL = q.toLowerCase();
  if (p.projectName && qL.includes(p.projectName.toLowerCase().slice(0, 12))) s += 4;
  if (p.leadDonor && qL.includes(p.leadDonor.toLowerCase())) s += 3;
  if (p.implementingAgency && qL.includes(p.implementingAgency.toLowerCase())) s += 2;
  if (p.projectType && qL.includes(p.projectType.toLowerCase())) s += 2;
  for (const [, re] of Object.entries(DIM_KEYWORDS)) if (re.test(q)) s += 1;
  return s;
}

export function scorePair(pr: PairLite, q: string, ids: Set<string>): number {
  let s = 0;
  if (ids.has(pr.a) && ids.has(pr.b)) s += 12;
  else if (ids.has(pr.a) || ids.has(pr.b)) s += 4;
  const qL = q.toLowerCase();
  if (qL.includes(pr.interactionType.toLowerCase())) s += 3;
  if (qL.includes(pr.outcome.toLowerCase())) s += 3;
  if (/\b(sequenc|conflict|complement|competing|redesign|coordinat)/i.test(q)) s += 1;
  return s;
}

export function rankMentioned<T>(items: T[], score: (t: T) => number): { hits: T[]; rest: T[] } {
  const withScores = items.map((it) => ({ it, s: score(it) }));
  const hits = withScores.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.it);
  const hitSet = new Set(hits);
  const rest = items.filter((it) => !hitSet.has(it));
  return { hits, rest };
}

export function lastUserQuery(messages: { role: string; content: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

export { extractIds };
