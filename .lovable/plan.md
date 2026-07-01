## Goal

Turn the AI Advisor from a one-shot Q&A box into a grounded, interactive analyst — better answers, richer UX, and two-way links with the rest of the app. Keep `google/gemini-3-flash-preview`.

---

## 1. Smarter answers — retrieval + citations

**Server (`src/lib/advisor.functions.ts`)**

- Add a lightweight **retrieval step** before the LLM call:
  - Score every project + pair by keyword/ID overlap with the last user question (regex for `GTM\d`, `HND\d`, `SLV\d`, donor names, dimension words like "regulatory/political/etc").
  - Include ALL matched items in full; truncate the rest to a compact one-liner. Keeps prompt small for flash model but never drops what's asked about.
- Add a **citation contract** in the system prompt: every claim must cite either a project ID (`[GTM1]`), a pair (`[GTM1×GTM3]`), or a codebook rule (`[Rule D2·b]`). If evidence is missing, say "not in portfolio data".
- Include codebook rule anchors (`D1.a`, `D2.b`, …) directly next to each score in the PROJECT CONTEXT block so the model can quote them.

**Client (`AIAdvisor.tsx`)**

- Post-process the streamed reply: linkify `[GTM1]` → `/project/GTM1`, `[GTM1×GTM3]` → `/portfolio-advisor?focus=GTM1,GTM3`. Codebook refs → tooltip with the rule text.

---

## 2. Deeper portfolio reasoning — precomputed analytics

New `src/lib/advisor-analytics.ts`, called on the server before prompt assembly:

- **Conflict clusters** — groups of ≥2 pairs sharing an "Institutionally Competing" / "Governance-Conflicting" edge.
- **Sequencing chains** — transitive closure of "Sequentially Dependent" edges (A→B→C).
- **Donor overlap matrix** — donor × project-type counts, flags overlaps.
- **Timeline pressure** — projects whose windows overlap AND share dimension weakness (D1/D2 ≥ 3).
- **Risk hotspots** — top-3 projects by composite; portfolio-wide dimension averages.

Feed these as a compact `ANALYTICS` block. The model then references patterns instead of re-deriving them from raw rows (which flash sometimes fumbles).

---

## 3. Interactive tie-ins

**Two-way scoping**

- Add a `zustand`-backed `advisorContext` (selected projectId / pairIds) in `src/lib/project-data.ts`.
- Project detail page: "Ask advisor about this project" button → opens advisor pre-scoped, injects a system note "User is viewing GTM1".
- Portfolio Advisor: clicking an edge → "Explain this pair" opens advisor with `focusPair`.
- Cited IDs in advisor replies are clickable (see §1).

**Deep-link URL params**

- Advisor reads `?ask=...&focus=GTM1` on mount → auto-opens + auto-sends. Enables "Explain" buttons across the app.

---

## 4. Better UX

**Streaming** — migrate `askAdvisor` to `streamText` via AI SDK + `@ai-sdk/openai-compatible` against Lovable AI Gateway, exposed as a **server route** `src/routes/api/advisor.ts` (server functions can't stream). Client uses `useChat` with `DefaultChatTransport({ api: "/api/advisor" })`.

**Per-country persistence (localStorage)** — one conversation per country code, restored on open. "New conversation" button clears the active scope.

**Composer & message polish**
- Textarea auto-focus on open, after send, after country switch.
- Copy button on assistant messages; regenerate button on the last one.
- Quick-action chips derived from analytics (e.g. "Explain the GTM3↔HND2 conflict", "Why is SLV1 High risk?").
- `Stop` button while streaming (AI SDK `stop()`).
- Keep the existing expand-to-70% and markdown renderer.

**Error surfacing** — explicit toasts for 429 (rate limit) and 402 (credits) from the gateway.

---

## Technical notes

```text
src/
├── routes/api/advisor.ts           NEW – streaming server route (AI SDK + Lovable AI Gateway)
├── lib/
│   ├── ai-gateway.server.ts        NEW – shared provider helper (createLovableAiGatewayProvider)
│   ├── advisor-analytics.ts        NEW – conflict clusters, chains, donor overlap, hotspots
│   ├── advisor-retrieval.ts        NEW – keyword/ID scoring, prompt shrink
│   ├── advisor-context.ts          NEW – zustand store for cross-page scoping
│   └── advisor.functions.ts        KEEP as thin wrapper OR remove (route replaces it)
└── components/AIAdvisor.tsx        REWRITE – useChat, streaming, history, quick actions, linkified citations
```

- Model stays `google/gemini-3-flash-preview`.
- Codebook anchors sourced from existing `src/lib/codebook-content.ts` (add rule IDs if missing).
- Persist history under `dpi-advisor-history-v1:<countryCode|ALL>` — separate from the project store version bump.
- Sequencing engine outputs remain authoritative; prompt rule unchanged.

---

## Out of scope

- Vector embeddings / RAG store (keyword retrieval is enough for ~15 projects).
- Voice input, file upload, multi-user threads.
- Changing the sequencing engine or scoring math.
