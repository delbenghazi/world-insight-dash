# Move "Take a tour" to home + clearer guidance steps

## 1. Relocate the tour trigger
- Remove `TourTriggerButton` from `src/components/WorkflowNav.tsx` (top navigation bar).
- Add `TourTriggerButton` to `src/routes/index.tsx` (home page) as a prominent CTA — placed near the top of the hero/intro area so it's the first thing a new user sees.
- Keep the "Exit tour" control available while the tour is active. Since the button is no longer globally visible, the in-tooltip "Exit"/X control inside `TourOverlay` becomes the primary exit affordance during the tour (already exists). No floating global exit needed.

## 2. Improve the Portfolio Advisor step
Current step just spotlights the roadmap. Update it to actively instruct the user:
- Copy: **"Select a country from the dropdown to generate a tailored sequencing roadmap and see prioritized recommendations."**
- Target stays on the advisor's country selector (switch `data-tour="roadmap"` target to the country selector element, or add a new `data-tour="advisor-country-select"` and point the step there).

## 3. Improve the Compare step
Update the final compare step copy:
- Copy: **"Tick two or more country checkboxes here to compare their portfolios side by side. The comparison view updates as you add countries."**
- Target remains the `data-tour="country-checkboxes"` element.

## 4. No changes to
- Tour state machine, persistence, navigation between pages, or step ordering/count.
- Any other page's tour steps or copy.
- Layout/styling outside the home hero and the two updated tooltip strings.

## Files touched
- `src/components/WorkflowNav.tsx` — remove trigger button.
- `src/routes/index.tsx` — add trigger button to home.
- `src/components/Tour.tsx` — update step copy for advisor and compare; possibly adjust advisor target selector.
- `src/components/PortfolioAdvisor.tsx` — if retargeting, add `data-tour` to country selector.
