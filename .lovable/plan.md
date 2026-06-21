## Audit results

I walked through every route and shared component. Here's what's worth fixing, grouped by impact. Tell me which to address (default: all 🔴 + 🟠).

### 🔴 Broken (recommend fix)
1. **WorkflowNav "Atlas" label points to `/methodology`** (`src/components/WorkflowNav.tsx:22`). Misleading. Either rename the label to "Methodology" or change the link to `/`. My recommendation: rename to **"Methodology"** since `/` is already covered by another nav item.

### 🟠 Minor UX gaps
2. **Blank country region/name** when a URL uses a code outside `FOCUS_COUNTRIES` (`src/routes/project.$projectId.tsx:265`, `src/components/DetailPanel.tsx:38`). Add a safe fallback like `"Unknown region"` / `code.toUpperCase()`.
3. **Empty `<p>` on Compare** when a country has no summary (`src/routes/compare.tsx:193`). Add fallback copy: "No sequencing notes yet."
4. **Dead `extractBudget` function** in project detail (`src/routes/project.$projectId.tsx:147,286`). Either surface the budget in the UI or delete the function + `void` line.

### 🟡 Nits (optional)
5. Remove `console.error(error)` in root error boundary (`src/routes/__root.tsx:41`) — already reported via `reportLovableError`.
6. WorkflowNav fallback `countryCode = "GTM"` (`src/components/WorkflowNav.tsx:14`) — use first country from store, or disable the link when none selected.
7. Local `DetailPanel` inside `PortfolioAdvisor.tsx` shadows the shared component name — rename for clarity.

### Not bugs
- No broken `<Link to=…>` paths.
- No runtime errors in the current session.
- No missing alt text (no `<img>` tags).

## Proposed changes (default scope: 🔴 + 🟠)

- `WorkflowNav.tsx`: change `label: "Atlas"` → `label: "Methodology"`.
- `project.$projectId.tsx`: replace `country?.name` / `country?.region` reads with `country?.name ?? project.country` and `country?.region ?? "Unknown region"`. Decide on `extractBudget`: I'll **delete** it unless you want it surfaced.
- `DetailPanel.tsx`: same fallback pattern for `country?.region`.
- `compare.tsx`: `{summaries[code]?.summary ?? "No sequencing notes yet."}`.

Reply with anything to adjust (e.g. "include nits", "keep extractBudget and show budget", "rename to Atlas instead") or approve to implement.