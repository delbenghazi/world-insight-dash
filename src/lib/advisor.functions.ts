import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CODEBOOK_SECTION } from "./codebook-content";
import {
  analyticsToPromptBlock,
  computeAdvisorAnalytics,
  suggestQuickActions,
} from "./advisor-analytics";
import { extractIds, lastUserQuery, rankMentioned, scorePair, scoreProject } from "./advisor-retrieval";




const Msg = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const ProjectLite = z.object({
  projectId: z.string(),
  projectName: z.string(),
  projectType: z.string().optional().default(""),
  leadDonor: z.string().optional().default(""),
  implementingAgency: z.string().optional().default(""),
  gtmiTier: z.string().optional().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  dim1_institutional: z.number().nullable().optional(),
  dim2_regulatory: z.number().nullable().optional(),
  dim3_technical: z.number().nullable().optional(),
  dim4_political: z.number().nullable().optional(),
  dim5_investment: z.number().nullable().optional(),
  compositeScore: z.number().nullable().optional(),
  interactionType: z.string().optional().default(""),
  interactionNote: z.string().optional().default(""),
  overallRisk: z.string().optional().default(""),
  linkedProjectIds: z.array(z.string()).optional().default([]),
});

const PairLite = z.object({
  a: z.string(),
  b: z.string(),
  outcome: z.string(),
  gate: z.number(),
  interactionType: z.string(),
  reason: z.string(),
  flags: z.array(z.string()).optional().default([]),
});

const Input = z.object({
  countryCode: z.string().min(2).max(8),
  countryName: z.string().min(1).max(120),
  portfolioSummary: z.string().max(8000).optional().default(""),
  projects: z.array(ProjectLite).max(120),
  pairs: z.array(PairLite).max(400),
  messages: z.array(Msg).min(1).max(40),
});

const CALIBRATION = `
CALIBRATION — DNA RUBRIC × INTERACTION MATRIX (authoritative)
When explaining any score, risk band, or pair outcome, you MUST reason from the codebook below.
- Every D1–D5 score you cite must be justified with the exact Score-level criteria or Decision rule from DIMENSION SCORING. If a user challenges a score, quote the rule that supports it verbatim.
- Every interaction call (Complementary / Sequentially Dependent / Institutionally Competing / Governance-Conflicting) must be tied to the specific Trigger from INTERACTION TYPES. Never label a pair with a type whose trigger is not met by the provided evidence.
- Composite = D1+D2+D3+D4+D5 (range 5–15). Risk bands come from OVERALL RISK LEVEL. Do not recompute or reband.
- If the codebook and the sequencing engine output disagree on a pair, the engine wins — explain the engine outcome and note the tension; do not override.
- If evidence for a trigger is absent from PORTFOLIO CONTEXT, say so; do not infer.

${CODEBOOK_SECTION}
`;

const CITATION_CONTRACT = `
CITATION CONTRACT (required in every reply)
- Cite every project reference with its ID in square brackets: [GTM1], [HND2]. When you first mention it in a reply, include the name inline once: "[GTM1] (GG-TDEI)".
- Cite pairs as [GTM1×GTM3].
- When you cite a score, quote the specific codebook line that justifies it, e.g. "D2=3 — 'no unified digital-services legal framework' (Rule D2·b)".
- When you cite a sequencing outcome, quote the engine's reason verbatim and prefix with the gate: "Gate 1 · Governance-Conflicting — <reason>".
- If a claim has no supporting evidence in PORTFOLIO CONTEXT or ANALYTICS, say "not in the portfolio data" — do NOT infer.
- Use markdown: short paragraphs, bullets for lists, **bold** for verdicts.
`;

const SYSTEM_COUNTRY = `You are the DPI-Atlas portfolio advisor. You explain — you do not invent.

GROUND RULES
- You are SCOPED to a single country portfolio. Do not speculate about other countries.
- Sequencing outcomes (Redesign / Sequence / Coordinate / Parallel) are decided by a deterministic four-gate engine in code. NEVER second-guess them. Quote the engine's outcome and reasoning verbatim when asked about a pair.
- Composite scores (5–15) and dimension scores (D1–D5) come from the codebook. Don't recompute them; cite the values provided.
- If the user asks something you don't have data for, say so plainly. Do not fabricate projects, donors, dates, or scores.
- Be concise. Prefer short paragraphs and bullet lists.
${CITATION_CONTRACT}
${CALIBRATION}`;

const SYSTEM_PORTFOLIO = `You are the DPI-Atlas portfolio advisor. You explain — you do not invent.

GROUND RULES
- You are scoped to a REGIONAL portfolio spanning multiple countries (e.g. Guatemala, Honduras, El Salvador). When useful, compare across countries and call out cross-country patterns. Do not invent countries outside the provided list.
- Sequencing outcomes (Redesign / Sequence / Coordinate / Parallel) are decided by a deterministic four-gate engine in code. NEVER second-guess them. Quote the engine's outcome and reasoning verbatim when asked about a pair.
- Composite scores (5–15) and dimension scores (D1–D5) come from the codebook. Don't recompute them; cite the values provided.
- If the user asks something you don't have data for, say so plainly. Do not fabricate projects, donors, dates, or scores.
- Be concise. Prefer short paragraphs and bullet lists. Prefix country when ambiguous.
${CITATION_CONTRACT}
${CALIBRATION}`;


type ProjectLite = z.infer<typeof ProjectLite>;
type PairLiteT = z.infer<typeof PairLite>;

function fullProjectLine(p: ProjectLite): string[] {
  return [
    `- [${p.projectId}] — ${p.projectName} [${p.projectType}] donor=${p.leadDonor} agency=${p.implementingAgency} tier=${p.gtmiTier} ${p.startDate}→${p.endDate}`,
    `    D1=${p.dim1_institutional ?? "?"} D2=${p.dim2_regulatory ?? "?"} D3=${p.dim3_technical ?? "?"} D4=${p.dim4_political ?? "?"} D5=${p.dim5_investment ?? "?"} composite=${p.compositeScore ?? "?"} risk=${p.overallRisk}`,
    `    interaction=${p.interactionType} linked=[${(p.linkedProjectIds ?? []).join(", ")}]`,
    ...(p.interactionNote ? [`    note: ${p.interactionNote}`] : []),
  ];
}

function shortProjectLine(p: ProjectLite): string {
  return `- [${p.projectId}] ${p.projectName} · ${p.leadDonor} · composite=${p.compositeScore ?? "?"} risk=${p.overallRisk}`;
}

function fullPairLine(pr: PairLiteT): string {
  return `- [${pr.a}×${pr.b}]: ${pr.outcome} (gate ${pr.gate} · ${pr.interactionType}) — ${pr.reason}${pr.flags?.length ? ` [${pr.flags.join(", ")}]` : ""}`;
}

function shortPairLine(pr: PairLiteT): string {
  return `- [${pr.a}×${pr.b}]: ${pr.outcome} · ${pr.interactionType}`;
}

function buildContext(data: z.infer<typeof Input>, analyticsBlock: string): string {
  const q = lastUserQuery(data.messages);
  const ids = extractIds(q);
  const { hits: projHits, rest: projRest } = rankMentioned(data.projects, (p) => scoreProject(p, q, ids));
  const { hits: pairHits, rest: pairRest } = rankMentioned(data.pairs, (pr) => scorePair(pr, q, ids));

  const lines: string[] = [];
  lines.push(`COUNTRY: ${data.countryName} (${data.countryCode})`);
  if (data.portfolioSummary?.trim()) {
    lines.push(`\nPORTFOLIO SUMMARY (analyst notes):\n${data.portfolioSummary.trim()}`);
  }

  lines.push(`\n${analyticsBlock}`);

  lines.push(`\nPROJECTS — RELEVANT (${projHits.length}):`);
  for (const p of projHits) lines.push(...fullProjectLine(p));
  if (projRest.length) {
    lines.push(`\nPROJECTS — OTHER (${projRest.length}, short form):`);
    for (const p of projRest) lines.push(shortProjectLine(p));
  }

  if (data.pairs.length) {
    lines.push(`\nSEQUENCING ENGINE OUTPUTS — RELEVANT (authoritative):`);
    for (const pr of pairHits) lines.push(fullPairLine(pr));
    if (pairRest.length) {
      lines.push(`\nSEQUENCING ENGINE OUTPUTS — OTHER:`);
      for (const pr of pairRest) lines.push(shortPairLine(pr));
    }
  }
  return lines.join("\n");
}

export const askAdvisor = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

    const analytics = computeAdvisorAnalytics(data.projects, data.pairs);

    const analyticsBlock = analyticsToPromptBlock(analytics);
    const quickActions = suggestQuickActions(analytics);

    const contextBlock = buildContext(data, analyticsBlock);

    const system = data.countryCode === "ALL" ? SYSTEM_PORTFOLIO : SYSTEM_COUNTRY;
    const messages = [
      { role: "system", content: system },
      { role: "system", content: `PORTFOLIO CONTEXT\n${contextBlock}` },
      ...data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429)
        throw new Error("AI rate limit reached. Please retry in a moment.");
      if (res.status === 402)
        throw new Error("AI credits exhausted for this workspace. Add credits in Workspace → Usage.");
      throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 300)}`);
    }

    const json = await res.json();
    const reply: string =
      json?.choices?.[0]?.message?.content?.toString().trim() ?? "";
    if (!reply) throw new Error("AI returned an empty response.");
    return { reply, quickActions };
  });

