## Goal

Stop generating `google.com/search?q=...` links (which get blocked by the iframe preview) and instead point each document trail entry to a real, embeddable source URL keyed off the donor / agency / country.

## Approach

Rewrite `buildDocumentTrail()` in `src/routes/project.$projectId.tsx` so each of the four document types resolves to an actual landing page on the responsible institution's site. No business logic changes elsewhere; only the link targets and a small lookup helper.

### 1. Donor → financing portal map

Add a `DONOR_PORTALS` lookup that maps donor short names found in `project.leadDonor` to their public project/finance database:

| Donor pattern        | URL                                                          |
| -------------------- | ------------------------------------------------------------ |
| EU / European Union  | `https://international-partnerships.ec.europa.eu/policies/programming/programmes_en` |
| World Bank / IBRD / IDA | `https://projects.worldbank.org/en/projects-operations/projects-list?countrycode_exact={ISO3}` |
| UNDP                 | `https://open.undp.org/projects?country={ISO3}`              |
| GIZ                  | `https://www.giz.de/en/worldwide/{country-slug}.html`        |
| USAID                | `https://www.usaid.gov/{country-slug}`                       |
| AFD                  | `https://www.afd.fr/en/page-region-pays/{country-slug}`      |
| AfDB                 | `https://projectsportal.afdb.org/dataportal/VProject/listProjects?country={ISO3}` |
| Default fallback     | OECD Creditor Reporting System: `https://stats.oecd.org/Index.aspx?DataSetCode=CRS1` |

### 2. Implementer → reporting site map

Add `AGENCY_SITES` for the primary implementer parsed from `project.implementingAgency`:

| Agency             | URL                                              |
| ------------------ | ------------------------------------------------ |
| UNDP               | `https://www.undp.org/{country-slug}`            |
| GIZ                | `https://www.giz.de/en/worldwide/{country-slug}.html` |
| World Bank         | same as donor entry above                        |
| Ministry of …      | country e-gov portal from a small country lookup |
| Default fallback   | ReliefWeb country page: `https://reliefweb.int/country/{iso3-lower}` |

### 3. Project fiche

Use the donor's project database search filtered by country instead of Google:
- EU: `https://international-partnerships.ec.europa.eu/countries/{country-slug}_en`
- World Bank: country project list URL above
- Others: same as donor portal entry

### 4. Country GTMI

Keep the existing `https://www.worldbank.org/en/programs/govtech/gtmi` link (already a real URL).

### 5. `aiSources` branch

In the `aiSources.length > 0` map, replace the `searchLink(...)` fallback with the same donor/agency resolver so AI-provided sources without a `url` still get a real institutional link rather than a Google query.

### 6. Cleanup

Delete the `searchLink()` helper once no caller remains.

## Out of scope

- No data model changes (no new fields on `Project` or `Source`).
- No new country metadata beyond what's already in `FOCUS_COUNTRIES` (ISO3 + name + slug derived from name).
- Radar chart, snapshot grid, AI panel, and styling are untouched.

## Files

- `src/routes/project.$projectId.tsx` — update `buildDocumentTrail`, add `DONOR_PORTALS` / `AGENCY_SITES` lookups, update `aiSources` fallback, remove `searchLink`.

## Open question

Want me to keep a "Search the web" secondary link (opening in a new tab via `duckduckgo.com/?q=...`, which is iframe-friendly) as a backup next to each real URL, or just the single institutional link?
