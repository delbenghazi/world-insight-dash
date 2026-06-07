import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FileInput = z.object({
  name: z.string(),
  mediaType: z.string(),
  base64: z.string(),
});

const Input = z.object({
  files: z.array(FileInput).max(15),
  urls: z.array(z.string().url()).max(15),
});

const SYSTEM_PROMPT = `You are an analytical scoring assistant for a digital investment interaction matrix. You will receive a set of project documents that may cover one or more projects. First, identify how many distinct projects are described in the documents and give each a suggested Project ID and name. Then for each project, score it across five dimensions using the codebook below.

SCORING DISCIPLINE — read carefully:
- Always apply the decision rules and trigger conditions, not just the general definitions.
- If a trigger condition is met, that score is LOCKED regardless of general impression.
- For every dimension, the rationale MUST cite the specific observable criterion or trigger that fired (e.g. "Trigger 3(a): action document lists 5 counterpart institutions — Ministry of Finance, SAT, MINECO, BANGUAT, SIB"). Do not give vague rationales like "multiple agencies involved".
- If evidence is insufficient to evaluate the triggers, return score: null and confidence: "Low" and state what evidence is missing.

For each dimension provide: score (1, 2, or 3, or null), a rationale that names the triggered rule and cites the evidence, and confidence (High/Medium/Low). Also suggest: Interaction Type, Interaction Note (citing the interaction-type trigger that fired), Overall Risk (L/M/H) derived strictly from the Overall Risk rules, Key Risk Flag, Plain Language Summary (2–3 sentences), Lead Donor, Implementing Agency, GTMI Tier (A/B/C), Start Date, End Date, Country (ISO 3166-1 alpha-3), and Project Type. For each document/URL used, output a source entry with: project_id, source_type, source_title, url, and a one-sentence note on what key information it provided.

Return only valid JSON with this structure:
{
  "projects": [
    {
      "id": string, "name": string, "country": string, "type": string,
      "lead_donor": string, "implementing_agency": string, "gtmi_tier": "A"|"B"|"C",
      "start_date": string, "end_date": string,
      "d1_score": 1|2|3|null, "d1_rationale": string, "d1_confidence": "High"|"Medium"|"Low",
      "d2_score": 1|2|3|null, "d2_rationale": string, "d2_confidence": "High"|"Medium"|"Low",
      "d3_score": 1|2|3|null, "d3_rationale": string, "d3_confidence": "High"|"Medium"|"Low",
      "d4_score": 1|2|3|null, "d4_rationale": string, "d4_confidence": "High"|"Medium"|"Low",
      "d5_score": 1|2|3|null, "d5_rationale": string, "d5_confidence": "High"|"Medium"|"Low",
      "composite_score": number|null,
      "interaction_type": "Complementary"|"Sequentially Dependent"|"Institutionally Competing"|"Governance-Conflicting",
      "linked_project_ids": string[],
      "interaction_note": string,
      "overall_risk": "L"|"M"|"H",
      "key_risk_flag": string,
      "plain_language_summary": string
    }
  ],
  "sources": [
    { "project_id": string, "source_type": string, "source_title": string, "url": string|null, "note": string }
  ]
}

CODEBOOK (apply triggers strictly)

D1 — INSTITUTIONAL ABSORPTION LOAD
- 1 (Low): Single lead implementing agency; no inter-ministerial coordination; no new coordination units.
  Trigger 1: all implementation decisions can be made by one agency without external sign-off.
- 2 (Moderate): 2–3 agencies; at least one new coordination mechanism (joint committee, MoU, working group); at least one agency needs new internal units.
  Trigger 2: project requires a steering committee with multi-agency representation OR one agency formally delegates authority to another.
- 3 (High): 4+ agencies/ministries; new permanent inter-institutional body; project crosses 2+ policy domains; implementing agency has documented capacity gaps.
  Trigger 3 (any one fires): (a) action document lists 4+ named counterpart institutions, OR (b) a mid-term evaluation has flagged coordination failure, OR (c) government underwent a ministerial reshuffle during implementation.

D2 — REGULATORY DEPENDENCIES
- 1 (Low): Operates entirely within existing legal framework; at most internal procedural updates.
  Trigger 1: legal basis for all core activities already exists in current law.
- 2 (Moderate): Requires new secondary legislation (reglamentos, decrees, ministerial regulations) or significant updates to existing regulations; primary framework exists with material gaps; updates can be done by executive action without parliament.
  Trigger 2: at least one specific regulatory gap is identified in the project's action document or risk matrix.
- 3 (High): Requires new primary legislation (congressional approval); overhaul of legal framework; ratification of international agreements; or regulatory gap blocks implementation until resolved.
  Trigger 3 (any one fires): (a) project explicitly lists pending legislation as a precondition, OR (b) project requires a new national system with no legal basis in current law, OR (c) implementation requires constitutional-level changes.

D3 — TECHNICAL DEPENDENCIES
- 1 (Low): Technically self-contained; deploys on existing national IT infrastructure; no integration with external systems; primary output is human capacity or procedural change.
  Trigger 1: no new platforms, data centres, or APIs required; existing systems sufficient.
- 2 (Moderate): Integration with 1–2 existing core national systems (civil registry, customs single window, payment gateway); may require API development or data-exchange protocols; builds on existing infrastructure with moderate upgrades.
  Trigger 2: project requires connecting to national backbone systems but does not require building new backbone infrastructure.
- 3 (High): Builds new national-level IT infrastructure from scratch; integrates with 3+ systems simultaneously; cross-border interoperability layer; depends on systems that do not yet exist; proprietary hardware deployment at scale.
  Trigger 3 (any one fires): (a) action document specifies development of a new national IT system, OR (b) integration requires connecting to both domestic and international platforms simultaneously, OR (c) the project's technical output is a prerequisite for another project's technical layer.

D4 — POLITICAL SENSITIVITY
- 1 (Low): Technocratic; no identifiable vested interests threatened; cross-party consensus likely; implementing agency insulated from electoral cycles; no significant civil society opposition. Trade facilitation, technical standards, and connectivity projects typically score 1.
- 2 (Moderate): Some stakeholders lose relative advantage; moderate media visibility; intersects one politically sensitive policy area (e.g. land tenure, public sector reform); implementation could be slowed but not blocked by political change.
  Trigger 2: action document identifies political will as a risk factor but assesses it as manageable.
- 3 (High): Directly threatens entrenched economic or political interests; country CPI < 35/100 AND project involves anti-corruption tools, public finance transparency, or resource governance; documented political interference; implementing agency changed or abolished after election.
  Trigger 3 (any one fires): (a) CPI < 35 AND project domain is transparency/governance, OR (b) action document rates political risk as High, OR (c) documented evidence of government resistance.

D5 — INVESTMENT NEEDS & FUNDING
- 1 (Low): Total budget ≤ USD 15M AND primary implementing contract awarded; no funding gap in current phase.
- 2 (Moderate): Budget USD 15M–50M OR multi-donor with ≥ 50% confirmed; at least one financing agreement signed; remaining tranches have confirmed pipeline; funding gap < 30% of total.
- 3 (High): Budget > USD 50M OR significant gap in confirmed funding; funding gap > 30% of total; or project is "under preparation" with no financing agreement signed; or blended finance requires private co-financing not yet committed.

INTERACTION TYPES (cite the trigger that fired in interaction_note)
- Complementary — Different components of the same outcome; parallel execution beneficial.
  Trigger: projects share a beneficiary group or policy objective but have distinct implementing agencies and non-overlapping technical outputs.
- Sequentially Dependent — Project B cannot achieve objectives unless Project A reaches a milestone first.
  Trigger: Project B's technical input is Project A's output, OR Project B's implementing agency depends on capacity built by Project A.
- Institutionally Competing — Both projects draw on the same implementing agency or same senior counterpart officials simultaneously.
  Trigger: both projects list the same lead agency AND combined D1 scores sum to ≥ 5 within a single country.
- Governance-Conflicting — Contradictory rules, parallel systems for the same function, overlapping mandates, misaligned incentives.
  Trigger: two projects create separate digital systems for the same data type, OR two projects assign the same regulatory function to different agencies.

OVERALL RISK LEVEL (derive overall_risk strictly from these rules)
- L (Low): Composite 5–7 AND no Sequentially Dependent or Governance-Conflicting interactions. Action: monitor at annual review.
- M (Medium): Composite 8–10 OR any Institutionally Competing interaction; at least one dimension scores 3 but not across majority. Action: phased implementation, coordination mechanism before T3 investment.
- H (High): Composite 11–15 OR any Governance-Conflicting interaction OR Sequentially Dependent with an incomplete predecessor; OR D4 = 3 AND D3 = 3 simultaneously; OR predecessor project shows disbursement < 20% of budget. Action: parallel implementation not advisable; sequencing intervention required.

Return only the JSON object — no commentary, no markdown fence.`;

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrlText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (DPI-Atlas AI Intake)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return `[Failed to fetch ${url}: HTTP ${res.status}]`;
    const ct = res.headers.get("content-type") ?? "";
    const text = await res.text();
    const body = ct.includes("html") ? stripHtml(text) : text;
    return body.slice(0, 60000);
  } catch (e) {
    return `[Failed to fetch ${url}: ${(e as Error).message}]`;
  }
}

function decodeBase64ToString(b64: string) {
  try {
    return atob(b64);
  } catch {
    return "";
  }
}

export const analyzeIntake = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

    // Build the user content parts.
    const parts: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [];

    parts.push({
      type: "text",
      text: `You will receive ${data.files.length} file(s) and ${data.urls.length} URL(s). Analyse them and return the JSON schema specified in the system prompt. Today's date is ${new Date().toISOString().slice(0, 10)}.`,
    });

    for (const u of data.urls) {
      const text = await fetchUrlText(u);
      parts.push({
        type: "text",
        text: `\n--- URL: ${u} ---\n${text}\n--- END URL ---\n`,
      });
    }

    for (const f of data.files) {
      const isText =
        f.mediaType.startsWith("text/") ||
        f.name.toLowerCase().endsWith(".txt") ||
        f.name.toLowerCase().endsWith(".md");
      if (isText) {
        const text = decodeBase64ToString(f.base64).slice(0, 60000);
        parts.push({
          type: "text",
          text: `\n--- FILE: ${f.name} ---\n${text}\n--- END FILE ---\n`,
        });
      } else {
        // Send as multimodal data URL — Gemini through the gateway accepts PDFs etc.
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${f.mediaType};base64,${f.base64}`,
          },
        });
        parts.push({
          type: "text",
          text: `(File attached above: ${f.name}, type ${f.mediaType})`,
        });
      }
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: parts },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 429)
        throw new Error("AI rate limit reached. Please retry in a moment.");
      if (res.status === 402)
        throw new Error(
          "AI credits exhausted for this workspace. Add credits in Workspace → Usage."
        );
      throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 300)}`);
    }

    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      // Strip optional ```json fences just in case.
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`AI returned unparseable JSON: ${(e as Error).message}`);
    }

    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    };
  });
