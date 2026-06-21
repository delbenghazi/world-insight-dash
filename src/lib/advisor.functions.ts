import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

const SYSTEM_COUNTRY = `You are the DPI-Atlas portfolio advisor. You explain — you do not invent.

GROUND RULES
- You are SCOPED to a single country portfolio. Do not speculate about other countries.
- Sequencing outcomes (Redesign / Sequence / Coordinate / Parallel) are decided by a deterministic four-gate engine in code. NEVER second-guess them. Quote the engine's outcome and reasoning verbatim when asked about a pair.
- Composite scores (5–15) and dimension scores (D1–D5) come from the codebook. Don't recompute them; cite the values provided.
- If the user asks something you don't have data for, say so plainly. Do not fabricate projects, donors, dates, or scores.
- Be concise. Prefer short paragraphs and bullet lists. Cite project IDs (e.g. GTM1, HND2) explicitly.`;

const SYSTEM_PORTFOLIO = `You are the DPI-Atlas portfolio advisor. You explain — you do not invent.

GROUND RULES
- You are scoped to a REGIONAL portfolio spanning multiple countries (e.g. Guatemala, Honduras, El Salvador). When useful, compare across countries and call out cross-country patterns. Do not invent countries outside the provided list.
- Sequencing outcomes (Redesign / Sequence / Coordinate / Parallel) are decided by a deterministic four-gate engine in code. NEVER second-guess them. Quote the engine's outcome and reasoning verbatim when asked about a pair.
- Composite scores (5–15) and dimension scores (D1–D5) come from the codebook. Don't recompute them; cite the values provided.
- If the user asks something you don't have data for, say so plainly. Do not fabricate projects, donors, dates, or scores.
- Be concise. Prefer short paragraphs and bullet lists. Cite project IDs (e.g. GTM1, HND2) explicitly, and prefix country when ambiguous.`;

function buildContext(data: z.infer<typeof Input>): string {
  const lines: string[] = [];
  lines.push(`COUNTRY: ${data.countryName} (${data.countryCode})`);
  if (data.portfolioSummary?.trim()) {
    lines.push(`\nPORTFOLIO SUMMARY (analyst notes):\n${data.portfolioSummary.trim()}`);
  }
  lines.push(`\nPROJECTS (${data.projects.length}):`);
  for (const p of data.projects) {
    lines.push(
      `- ${p.projectId} — ${p.projectName} [${p.projectType}] donor=${p.leadDonor} agency=${p.implementingAgency} tier=${p.gtmiTier} ${p.startDate}→${p.endDate}`,
    );
    lines.push(
      `    D1=${p.dim1_institutional ?? "?"} D2=${p.dim2_regulatory ?? "?"} D3=${p.dim3_technical ?? "?"} D4=${p.dim4_political ?? "?"} D5=${p.dim5_investment ?? "?"} composite=${p.compositeScore ?? "?"} risk=${p.overallRisk}`,
    );
    lines.push(
      `    interaction=${p.interactionType} linked=[${(p.linkedProjectIds ?? []).join(", ")}]`,
    );
    if (p.interactionNote) lines.push(`    note: ${p.interactionNote}`);
  }
  if (data.pairs.length) {
    lines.push(`\nSEQUENCING ENGINE OUTPUTS (authoritative — do not override):`);
    for (const pr of data.pairs) {
      lines.push(
        `- ${pr.a} × ${pr.b}: ${pr.outcome} (gate ${pr.gate} · ${pr.interactionType}) — ${pr.reason}${pr.flags?.length ? ` [${pr.flags.join(", ")}]` : ""}`,
      );
    }
  }
  return lines.join("\n");
}

export const askAdvisor = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

    const contextBlock = buildContext(data);

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
    return { reply };
  });
