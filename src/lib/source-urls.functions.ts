import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const DocItem = z.object({
  type: z.string().max(200),
  title: z.string().max(400),
});

const Input = z.object({
  projectId: z.string().max(50),
  projectName: z.string().max(300),
  country: z.string().max(120),
  donor: z.string().max(300),
  agency: z.string().max(300),
  documents: z.array(DocItem).min(1).max(12),
});

const SYSTEM = `You are a research librarian. For each document description you receive, return the SINGLE best canonical public URL on the official institution's site (donor portal, implementer reports page, government / GTMI source). 
Rules:
- Return only URLs you are confident actually exist on that institution's domain.
- Prefer deep links (specific project page, specific report, specific country profile) over generic homepages.
- Never use google.com/search, bing.com, duckduckgo.com or other search-engine URLs.
- If you cannot find a confident canonical URL, return null for that item.
- Return strictly valid JSON matching the requested schema. No prose.`;

export const resolveSourceUrls = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => Input.parse(v))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

    const userPrompt = `Project: ${data.projectName} (${data.projectId})
Country: ${data.country}
Lead donor / funder: ${data.donor}
Implementing agency: ${data.agency}

Resolve a real canonical URL for each of these source descriptions:
${data.documents.map((d, i) => `${i + 1}. [${d.type}] ${d.title}`).join("\n")}

Respond as JSON: {"urls": [{"index": 1, "url": "https://..."} | {"index": 1, "url": null}, ...]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI gateway error ${res.status}`);
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content?.toString() ?? "{}";
    let parsed: { urls?: Array<{ index: number; url: string | null }> } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const out: Array<string | null> = data.documents.map(() => null);
    for (const u of parsed.urls ?? []) {
      const i = Number(u?.index) - 1;
      if (i < 0 || i >= out.length) continue;
      const url = typeof u?.url === "string" ? u.url.trim() : "";
      if (!url) continue;
      // Reject search-engine URLs as a safety net.
      if (/google\.[a-z.]+\/search|bing\.com\/search|duckduckgo\.com/i.test(url)) continue;
      try {
        const parsedUrl = new URL(url);
        if (!/^https?:$/.test(parsedUrl.protocol)) continue;
        out[i] = parsedUrl.toString();
      } catch {
        continue;
      }
    }

    return { urls: out };
  });
