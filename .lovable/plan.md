## Goal
Reshape the platform from a "data dashboard" feel into a focused advisory tool that walks an advisor through: **methodology → country → projects/interactions → AI advisor → add project**. Every screen should make the interaction classification and composite risk score the visual anchor.

## 1. Homepage entry point (`src/routes/index.tsx` + `LeftPanel`)
- Replace the current ambient map intro with a **clear hero band** above the map: one-line tool definition + two primary CTAs ("Select a country" / "Add a project to run an assessment"). The map remains the country selector but is reframed as "Step 2: pick a country".
- Remove the decorative "World Map" mono label and the always-loading globe overlay on repeat visits (keep first-load only).
- Trim `LeftPanel`: keep purpose statement, but move secondary nav (Compare, Methodology) into a top app-bar so the panel is purely *"where are you working?"* (selected country + portfolio summary).

## 2. Workflow navigation
- Add a thin **top WorkflowNav** component rendered from `__root.tsx` with 5 numbered steps: Methodology · Country · Portfolio · AI Advisor · Add Project. Current step highlighted from route; each step shows a tiny "next" affordance.
- Each leaf route (country, add-project, methodology) gets a "Next: …" footer link mirroring the flow.

## 3. Visual hierarchy on country/project views (`country.$code.tsx`, `DetailPanel.tsx`)
- Promote **Interaction Classification badge** and **Composite Risk Score** to a hero strip at the top of the country view (large type, colored chip per classification, score as a single big number with qualitative label).
- Demote raw tables to a collapsed "Project details" section below.
- Same treatment in `DetailPanel`: classification + score first, metadata after.

## 4. Reduce cognitive load
- Audit `DetailPanel`, `CountryCard`, `methodology`, `compare`: remove redundant labels ("Region / Country" double headers), decorative mono tags, duplicated counts. Hide advanced fields (indicator breakdowns, raw scores) behind a "Show detail" disclosure.
- Standardize spacing and drop ornamental dividers that don't separate decisions.

## 5. Empty states
- Add a shared `EmptyState` component (`src/components/EmptyState.tsx`) with icon + message + CTA.
- Wire into: country with 0 projects (CTA → Add Project pre-filled with country), compare page with <2 countries, AI advisor with no portfolio selected, homepage map when no projects exist.

## 6. AI Advisor repositioning (`AIAdvisor.tsx`)
- Rename floating widget to **"Portfolio Advisor"** and bind its title to the active country ("Advisor · Guatemala portfolio").
- Move the launcher button into the country view as a prominent "Consult the Advisor on this portfolio" CTA after the hero strip; keep a smaller floating fallback on other pages.
- When no country selected, advisor opens with the empty state "Select a country first" instead of accepting general queries.

## Technical notes
- No data model changes. All edits are presentation-layer.
- New files: `src/components/WorkflowNav.tsx`, `src/components/EmptyState.tsx`, `src/components/RiskHero.tsx` (shared classification + score hero).
- Edits: `__root.tsx`, `routes/index.tsx`, `routes/country.$code.tsx`, `routes/add-project.tsx`, `routes/methodology.tsx`, `routes/compare.tsx`, `components/LeftPanel.tsx`, `components/DetailPanel.tsx`, `components/CountryCard.tsx`, `components/AIAdvisor.tsx`.
- Keep existing design tokens in `src/styles.css`; add semantic classification color tokens if missing.

## Out of scope
- Backend / data schema changes
- New analytics or scoring logic
- Map interaction behavior (already redone)

Approve and I'll implement in one pass, verifying via the preview afterward.