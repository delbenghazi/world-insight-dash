import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CODEBOOK_SECTION } from "./codebook-content";


const FileInput = z.object({
  name: z.string(),
  mediaType: z.string(),
  base64: z.string(),
});

const Input = z.object({
  files: z.array(FileInput).max(15),
  urls: z.array(z.string().url()).max(15),
});

const PROMPT_PREAMBLE = `You are an analytical scoring assistant for a digital investment interaction matrix. You will receive a set of project documents that may cover one or more projects. First, identify how many distinct projects are described in the documents and give each a suggested Project ID and name. Then for each project, score it across five dimensions using the codebook below.

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
}`;

const PROMPT_CLOSER = `Return only the JSON object — no commentary, no markdown fence.`;

const SYSTEM_PROMPT = `${PROMPT_PREAMBLE}\n\n${CODEBOOK_SECTION}\n\n${PROMPT_CLOSER}`;


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
    const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];

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
      if (res.status === 429) throw new Error("AI rate limit reached. Please retry in a moment.");
      if (res.status === 402)
        throw new Error("AI credits exhausted for this workspace. Add credits in Workspace → Usage.");
      throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 300)}`);
    }

    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      // Strip optional ```json fences just in case.
      const cleaned = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```$/, "");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`AI returned unparseable JSON: ${(e as Error).message}`);
    }

    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    };
  });
