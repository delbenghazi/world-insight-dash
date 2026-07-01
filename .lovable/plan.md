## Goal
On the Add Project page, let users revise each AI-generated dimension score **and its rationale** before committing. Save the user-revised values (not the original AI output) as the project's final data. Only the AI review/commit stage changes — no other pages, no changes to the AI intake flow itself.

## Where the change lives
Only `src/routes/add-project.tsx`. The `ScoreDetail` component already renders the 5 dimension cards (score input + rationale text). Today the rationale is read-only text; scores are editable but edits aren't visually tracked, and rationale edits aren't captured at all.

## Changes

### 1. Editable rationale per dimension
In `ScoreDetail`, replace the static rationale `<div>` with an inline-editable block:
- Default view: rationale text with a small pencil "Edit" affordance.
- On click: swap to a `<textarea>` prefilled with the current rationale; Save / Cancel buttons (Save writes on blur/Enter, Cancel restores).
- Persist via a new handler `updateDimNote(rowKey, dimField, value)` in `AddProject`, which writes to the row's `dim1_note` … `dim5_note` field (these already exist on `EditableRow` and on `Project`).

### 2. Track "edited" state per dimension
Add a lightweight per-cell dirty map, e.g. `editedDims: Record<string, Set<DimField>>` keyed by row `_key`. Mark a dimension as edited when the user:
- changes the score via the number input in `ScoreDetail` (existing `updateDim` path), OR
- edits the rationale via the new `updateDimNote` path.
Proxy-derived scores stay in their existing "proxy" state and are not marked as user-edited (they already have their own amber styling).

### 3. Visual "edited" indicator
Inside `ScoreDetail`, when a dimension is in the edited set:
- Add a subtle left border accent on that dimension card (e.g. `border-l-2` in the primary color).
- Add a small `Edited` badge next to the existing `ConfidenceBadge` (same badge styling, neutral/primary tint).
Leave untouched dimensions visually identical to today (AI default look).

### 4. Commit path
`commit()` already spreads `rest` into the final `Project`, which includes `dim1_note` … `dim5_note`. Because `updateDimNote` writes straight into those fields, the user-revised rationale is saved automatically. No schema change required. Scores likewise already flow through `updateDim` → `rest.dimN_*`.

Also carry the edited-set forward so the committed project's `_aiDetail.rationale` display (only used in the intake table) matches — the committed `Project` uses `dimN_note`, which is the source of truth downstream.

### 5. Small UX polish
- Rationale textarea: `min-h-[80px]`, monospace-optional, same border/focus styles as other inputs in this file.
- Keyboard: Enter to save, Shift+Enter for newline, Esc to cancel.
- No changes to composite calc, validation, proxy flow, sources, template upload, or any other section.

## Files touched
- `src/routes/add-project.tsx` (only)

## Out of scope
- Editing already-committed projects from the atlas.
- Any changes to `Project` schema, project detail page, or AI intake server function.
