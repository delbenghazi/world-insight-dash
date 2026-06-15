import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ExternalLink, FileText, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { WorkflowNav } from "@/components/WorkflowNav";
import { RadarChart } from "@/components/RadarChart";
import { resolveSourceUrls } from "@/lib/source-urls.functions";
import {
  FOCUS_COUNTRIES,
  InteractionType,
  Project,
  RiskLevel,
  countryColorVar,
  projectsByCountry,
  projectHasProxy,
  useProjectStore,
} from "@/lib/project-data";

export const Route = createFileRoute("/project/$projectId")({
  head: ({ params }) => ({
    meta: [
      { title: `Project ${params.projectId} — DT Global GovTech Atlas` },
      {
        name: "description",
        content: `Project ${params.projectId} detail: snapshot datasheet, five-dimension radar, and analytical assessment.`,
      },
    ],
  }),
  loader: ({ params }) => ({ projectId: params.projectId }),
  notFoundComponent: () => (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
      <div>Unknown project ID.</div>
      <Link to="/" className="text-sm underline">
        Go back to home
      </Link>
    </div>
  ),
  errorComponent: () => (
    <div className="flex h-screen items-center justify-center text-destructive">
      Something went wrong loading this project.
    </div>
  ),
  component: ProjectPage,
});

interface DimensionEntry {
  key: string;
  abbr: string;
  label: string;
  score: number;
  note: string;
}

function getDimensions(p: Project): DimensionEntry[] {
  return [
    { key: "D1", abbr: "IL", label: "Institutional Absorption Load", score: p.dim1_institutional, note: p.dim1_note },
    { key: "D2", abbr: "RD", label: "Regulatory Dependencies", score: p.dim2_regulatory, note: p.dim2_note },
    { key: "D3", abbr: "TD", label: "Technical Dependencies", score: p.dim3_technical, note: p.dim3_note },
    { key: "D4", abbr: "PS", label: "Political Sensitivity", score: p.dim4_political, note: p.dim4_note },
    { key: "D5", abbr: "IN", label: "Investment Needs & Funding", score: p.dim5_investment, note: p.dim5_note },
  ];
}

function getKeyRiskDimension(p: Project): DimensionEntry {
  const dims = getDimensions(p);
  return dims.reduce((max, d) => (d.score > max.score ? d : max), dims[0]);
}

function plainLanguageSummary(p: Project): string {
  const country = FOCUS_COUNTRIES[p.country]?.name ?? p.country;
  const donor = p.leadDonor.split("—")[0].split("|")[0].trim();
  return `${p.projectName.split(/[—–-]/)[0].trim()} is a ${p.projectType.toLowerCase()} initiative in ${country}, implemented by ${p.implementingAgency.split("+")[0].trim()} with funding from ${donor}. It matters for the portfolio because it is ${p.interactionType.toLowerCase()} with other parallel digital investments in the country — ${p.interactionNote}`;
}

function interactionTone(t: InteractionType) {
  switch (t) {
    case "Complementary":
      return { bg: "color-mix(in oklab, var(--color-risk-low) 16%, transparent)", fg: "var(--color-risk-low)" };
    case "Sequentially Dependent":
      return { bg: "color-mix(in oklab, var(--primary) 14%, transparent)", fg: "var(--primary)" };
    case "Institutionally Competing":
      return { bg: "color-mix(in oklab, var(--color-risk-medium) 18%, transparent)", fg: "var(--color-risk-medium)" };
    case "Governance-Conflicting":
      return { bg: "color-mix(in oklab, var(--color-risk-high) 18%, transparent)", fg: "var(--color-risk-high)" };
  }
}

function calloutTone(risk: RiskLevel) {
  if (risk === "High") {
    return {
      bg: "color-mix(in oklab, var(--color-risk-high) 12%, var(--surface))",
      border: "color-mix(in oklab, var(--color-risk-high) 55%, transparent)",
      fg: "var(--color-risk-high)",
      label: "High risk",
    };
  }
  return {
    bg: "color-mix(in oklab, var(--color-risk-medium) 14%, var(--surface))",
    border: "color-mix(in oklab, var(--color-risk-medium) 55%, transparent)",
    fg: "var(--color-risk-medium)",
    label: risk === "Medium" ? "Material risk" : "Watch item",
  };
}

function riskBadge(risk: RiskLevel) {
  const letter = risk === "Low" ? "L" : risk === "Medium" ? "M" : "H";
  const color =
    risk === "Low"
      ? "var(--color-risk-low)"
      : risk === "Medium"
        ? "var(--color-risk-medium)"
        : "var(--color-risk-high)";
  return { letter, color };
}

function implementationStatus(p: Project): { label: string; tone: string } {
  const now = Date.now();
  const start = Date.parse(p.startDate);
  const end = Date.parse(p.endDate);
  if (!Number.isNaN(start) && start > now) {
    return { label: "Under Preparation", tone: "var(--color-risk-medium)" };
  }
  if (!Number.isNaN(end) && end < now) {
    return { label: "Closed", tone: "var(--muted-foreground)" };
  }
  if (!Number.isNaN(start)) {
    const live = new Date(start).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });
    return { label: `Active — live since ${live}`, tone: "var(--color-risk-low)" };
  }
  return { label: "Active", tone: "var(--color-risk-low)" };
}

function splitAgencies(raw: string): { primary: string; partners: string[] } {
  const parts = raw.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { primary: raw, partners: [] };
  return { primary: parts[0], partners: parts.slice(1) };
}

function splitFunders(raw: string): { lead: string; cofinanciers: string[] } {
  // Heuristic split on " + " and " | " — leave em-dashes (which carry budget figures) intact.
  const parts = raw.split(/\s+(?:\+|\|)\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return { lead: raw, cofinanciers: [] };
  return { lead: parts[0], cofinanciers: parts.slice(1) };
}

function extractBudget(raw: string): string {
  // Pick out currency amounts e.g. "€23.4M", "USD 9M", "$2M".
  const matches = raw.match(/(?:€|EUR|USD|US\$|\$)\s?[\d.,]+\s?[MmBbKk]?/g);
  if (!matches || matches.length === 0) return "Not disclosed";
  return matches.join(" · ");
}

function fmtDate(s: string): string {
  const t = Date.parse(s);
  if (Number.isNaN(t)) return s || "—";
  return new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function countrySlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Resolve a donor / funder string to a real institutional landing page. */
function donorPortal(donorRaw: string, iso3: string, countryName: string): string {
  const d = donorRaw.toLowerCase();
  const slug = countrySlug(countryName);
  if (/\beu\b|european union|european commission|intpa|dg /.test(d))
    return `https://international-partnerships.ec.europa.eu/countries/${slug}_en`;
  if (/world bank|ibrd|\bida\b|wbg/.test(d))
    return `https://projects.worldbank.org/en/projects-operations/projects-list?countrycode_exact=${iso3}`;
  if (/undp/.test(d)) return `https://open.undp.org/projects?country=${iso3}`;
  if (/\bgiz\b|deutsche gesellschaft/.test(d))
    return `https://www.giz.de/en/worldwide/worldwide.html`;
  if (/usaid/.test(d)) return `https://www.usaid.gov/${slug}`;
  if (/\bafd\b|agence française/.test(d))
    return `https://www.afd.fr/en/page-region-pays/${slug}`;
  if (/afdb|african development bank/.test(d))
    return `https://projectsportal.afdb.org/dataportal/VProject/listProjects?country=${iso3}`;
  if (/\badb\b|asian development bank/.test(d))
    return `https://www.adb.org/projects/country/${iso3.toLowerCase()}`;
  if (/iadb|inter-american development bank/.test(d))
    return `https://www.iadb.org/en/projects-search?country=${iso3}`;
  if (/kfw/.test(d)) return `https://www.kfw-entwicklungsbank.de/International-financing/KfW-Development-Bank/`;
  if (/gates foundation|bmgf/.test(d)) return `https://www.gatesfoundation.org/`;
  if (/\bfcdo\b|foreign, commonwealth/.test(d))
    return `https://devtracker.fcdo.gov.uk/countries/${iso3}/projects`;
  return `https://stats.oecd.org/Index.aspx?DataSetCode=CRS1`;
}

/** Resolve an implementing agency to its reporting / country presence page. */
function agencySite(agencyRaw: string, iso3: string, countryName: string): string {
  const a = agencyRaw.toLowerCase();
  const slug = countrySlug(countryName);
  if (/undp/.test(a)) return `https://www.undp.org/${slug}`;
  if (/\bgiz\b/.test(a)) return `https://www.giz.de/en/worldwide/worldwide.html`;
  if (/world bank|ibrd|\bida\b/.test(a))
    return `https://projects.worldbank.org/en/projects-operations/projects-list?countrycode_exact=${iso3}`;
  if (/unicef/.test(a)) return `https://www.unicef.org/${slug}`;
  if (/unesco/.test(a)) return `https://www.unesco.org/en/countries/${iso3.toLowerCase()}`;
  if (/\bilo\b/.test(a)) return `https://www.ilo.org/`;
  if (/\bfao\b/.test(a)) return `https://www.fao.org/countryprofiles/index/en/?iso3=${iso3}`;
  if (/\bwfp\b/.test(a)) return `https://www.wfp.org/countries/${slug}`;
  if (/\bwho\b/.test(a)) return `https://www.who.int/countries/${iso3.toLowerCase()}`;
  if (/ministry|government of/.test(a))
    return `https://reliefweb.int/country/${iso3.toLowerCase()}`;
  return `https://reliefweb.int/country/${iso3.toLowerCase()}`;
}

function buildDocumentTrail(p: Project) {
  const donor = p.leadDonor.split("—")[0].trim();
  const agency = p.implementingAgency.split("+")[0].trim();
  const country = FOCUS_COUNTRIES[p.country]?.name ?? p.country;
  const donorUrl = donorPortal(donor, p.country, country);
  const agencyUrl = agencySite(agency, p.country, country);
  return [
    {
      type: "Donor financing agreement",
      title: `${donor} — financing agreement for ${p.projectId}`,
      link: donorUrl,
    },
    {
      type: "Project fiche / action document",
      title: `${p.projectName} — action document (${new Date(p.startDate).getFullYear() || "—"})`,
      link: donorUrl,
    },
    {
      type: "Implementer reporting",
      title: `${agency} — implementation reports`,
      link: agencyUrl,
    },
    {
      type: "Country strategy / GTMI",
      title: `${country} — GTMI tier ${p.gtmiTier} country profile`,
      link: "https://www.worldbank.org/en/programs/govtech/gtmi",
    },
  ];
}

function SnapshotRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-4 border-b border-border/60 px-4 py-2.5 last:border-b-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-[13px] leading-snug text-foreground">{children}</dd>
    </div>
  );
}

function ProjectPage() {
  const { projectId } = Route.useLoaderData();
  const projects = useProjectStore((s) => s.projects);
  const storeSources = useProjectStore((s) => s.sources);
  const project = projects.find((p) => p.projectId === projectId);

  if (!project) throw notFound();

  const country = FOCUS_COUNTRIES[project.country];
  const dimensions = getDimensions(project);
  const keyDim = getKeyRiskDimension(project);
  const callout = calloutTone(project.overallRisk);
  const siblings = projectsByCountry(projects, project.country).filter(
    (p) => p.projectId !== project.projectId
  );
  const aiSources = storeSources.filter((s) => s.projectId === project.projectId);
  const baseDocuments =
    aiSources.length > 0
      ? aiSources.map((s) => ({
          type: s.sourceType,
          title: s.note ? `${s.sourceTitle} — ${s.note}` : s.sourceTitle,
          link: s.url ?? donorPortal(project.leadDonor, project.country, FOCUS_COUNTRIES[project.country]?.name ?? project.country),
        }))
      : buildDocumentTrail(project);

  const resolveFn = useServerFn(resolveSourceUrls);
  const resolvedQuery = useQuery({
    queryKey: ["source-urls", project.projectId, baseDocuments.map((d) => d.title).join("|")],
    queryFn: () =>
      resolveFn({
        data: {
          projectId: project.projectId,
          projectName: project.projectName,
          country: FOCUS_COUNTRIES[project.country]?.name ?? project.country,
          donor: project.leadDonor,
          agency: project.implementingAgency,
          documents: baseDocuments.map((d) => ({ type: d.type, title: d.title })),
        },
      }),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
  const documents = baseDocuments.map((d, i) => ({
    ...d,
    link: resolvedQuery.data?.urls[i] ?? d.link,
    resolved: !!resolvedQuery.data?.urls[i],
  }));
  const resolving = resolvedQuery.isLoading;

  const { lead, cofinanciers } = splitFunders(project.leadDonor);
  const { primary: primaryAgency, partners: implementingPartners } = splitAgencies(
    project.implementingAgency,
  );
  void extractBudget;
  const status = implementationStatus(project);
  const accent = countryColorVar(project.country);
  const risk = riskBadge(project.overallRisk);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WorkflowNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <Link
          to="/country/$code"
          params={{ code: project.country }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft size={12} /> Back to {country?.name ?? project.country} portfolio
        </Link>

        {/* Header */}
        <header className="mt-4 flex items-start gap-3">
          <span
            className="mt-2 h-3 w-3 shrink-0 rounded-full"
            style={{ background: accent }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              <span>{country?.region}</span>
              <span>·</span>
              <span>{country?.name ?? project.country}</span>
              <span>·</span>
              <span>Project {project.projectId}</span>
            </div>
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">
              {project.projectName}
            </h1>
          </div>
        </header>

        {/* ============ SECTION 1 — PROJECT SNAPSHOT + RADAR ============ */}
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Project snapshot
            </h2>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
            {/* Datasheet */}
            <dl className="overflow-hidden rounded-xl border bg-surface">
              <SnapshotRow label="Project ID">
                <span className="font-mono">{project.projectId}</span>
              </SnapshotRow>
              <SnapshotRow label="GTMI Tier">
                <span className="font-mono">Tier {project.gtmiTier}</span>
              </SnapshotRow>
              <SnapshotRow label="Project Type">{project.projectType}</SnapshotRow>
              <SnapshotRow label="Project Name">{project.projectName}</SnapshotRow>
              <SnapshotRow label="Lead Funder">{lead}</SnapshotRow>
              <SnapshotRow label="Co-Financiers">
                {cofinanciers.length === 0 ? (
                  <span className="italic text-muted-foreground">None recorded</span>
                ) : (
                  <ul className="space-y-1">
                    {cofinanciers.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </SnapshotRow>
              <SnapshotRow label="Implementing Agency">{primaryAgency}</SnapshotRow>
              <SnapshotRow label="Implementing Partners">
                {implementingPartners.length === 0 ? (
                  <span className="italic text-muted-foreground">None recorded</span>
                ) : (
                  <ul className="space-y-1">
                    {implementingPartners.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                )}
              </SnapshotRow>
              <SnapshotRow label="Status">
                <span style={{ color: status.tone }} className="font-medium">
                  {status.label}
                </span>
              </SnapshotRow>
              <SnapshotRow label="Start – End">
                <span className="font-mono text-[12px]">
                  {fmtDate(project.startDate)} → {fmtDate(project.endDate)}
                </span>
              </SnapshotRow>
              <SnapshotRow label="Interaction Type">
                <span
                  className="rounded px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: interactionTone(project.interactionType).bg,
                    color: interactionTone(project.interactionType).fg,
                  }}
                >
                  {project.interactionType}
                </span>
              </SnapshotRow>
              <SnapshotRow label="Linked Projects">
                {project.linkedProjectIds.length === 0 ? (
                  <span className="italic text-muted-foreground">None</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {project.linkedProjectIds.map((id) => (
                      <Link
                        key={id}
                        to="/project/$projectId"
                        params={{ projectId: id }}
                        className="rounded border bg-background px-2 py-0.5 font-mono text-[11px] hover:bg-secondary"
                      >
                        {id}
                      </Link>
                    ))}
                  </div>
                )}
              </SnapshotRow>
            </dl>

            {/* Radar + composite */}
            <aside className="flex flex-col items-center gap-3 rounded-xl border bg-surface p-4">
              <RadarChart
                dimensions={dimensions.map((d) => ({
                  abbr: d.abbr,
                  label: d.label,
                  score: d.score,
                  note: d.note,
                }))}
                colors={[
                  {
                    id: project.projectId,
                    stroke: accent,
                    fill: `color-mix(in oklab, ${accent} 35%, transparent)`,
                    dash: "0",
                  },
                ]}
                series={[
                  {
                    id: project.projectId,
                    values: dimensions.map((d) => d.score),
                  },
                ]}
                size={240}
              />
              <div className="w-full border-t pt-3 text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Composite Score
                </div>
                <div className="mt-0.5 text-2xl font-bold tabular-nums">
                  {project.compositeScore} <span className="text-muted-foreground">/ 15</span>
                </div>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Overall Risk
                  </span>
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: risk.color }}
                  >
                    {risk.letter}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ============ SECTION 2 — ANALYTICAL ASSESSMENT ============ */}
        <div className="mt-12 flex items-center gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Analytical assessment
          </h2>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Plain Language Summary */}
        <section className="mt-6">
          <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            What this project does
          </h3>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            {plainLanguageSummary(project)}
          </p>
        </section>

        {/* Key Risk Flag */}
        <section
          className="mt-8 rounded-xl border-l-4 p-5"
          style={{
            background: callout.bg,
            borderLeftColor: callout.fg,
            borderColor: callout.border,
            borderWidth: 1,
            borderLeftWidth: 4,
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} style={{ color: callout.fg }} className="mt-0.5 shrink-0" />
            <div>
              <div
                className="text-[10px] font-mono uppercase tracking-[0.18em]"
                style={{ color: callout.fg }}
              >
                Key risk · {callout.label} · {keyDim.label}
              </div>
              <p className="mt-1.5 text-[15px] font-medium leading-snug text-foreground">
                {keyDim.note}
              </p>
            </div>
          </div>
        </section>

        {/* Per-dimension rationale */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Per-dimension scoring rationale
            </h3>
            <div className="font-mono text-xs text-muted-foreground">
              Composite {project.compositeScore}/15
            </div>
          </div>
          {projectHasProxy(project) && (
            <div
              className="mt-1 text-right text-[11px] italic"
              style={{ color: "var(--color-risk-medium)" }}
            >
              Composite includes {project.proxyDimensions!.length} proxy-scored dimension
              {project.proxyDimensions!.length === 1 ? "" : "s"} — based on user input, not document evidence.
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            {dimensions.map((d) => (
              <div key={d.key} className="rounded-lg border bg-surface p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {d.abbr}
                  </span>
                  <span className="font-mono text-2xl font-semibold tabular-nums">{d.score}</span>
                </div>
                <div className="mt-1 text-[11px] font-medium text-foreground">{d.label}</div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{d.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interaction Panel */}
        <section className="mt-10">
          <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Interactions in this portfolio
          </h3>
          {siblings.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed bg-surface/50 p-6 text-center text-sm text-muted-foreground">
              No other projects in {country?.name ?? project.country} yet — no interactions to assess.
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {siblings.map((s) => {
                const tone = interactionTone(s.interactionType);
                const isLinked = project.linkedProjectIds.includes(s.projectId);
                return (
                  <li
                    key={s.projectId}
                    className="flex flex-col gap-2 rounded-lg border bg-surface p-4 sm:flex-row sm:items-start sm:gap-4"
                  >
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className="rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
                        style={{ background: tone.bg, color: tone.fg }}
                      >
                        {s.interactionType}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {project.projectId} ↔ {s.projectId}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/project/$projectId"
                        params={{ projectId: s.projectId }}
                        className="text-sm font-medium hover:underline"
                      >
                        {s.projectName}
                      </Link>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {isLinked
                          ? project.interactionNote
                          : `No explicit linkage recorded; runs in parallel within the same portfolio (${s.interactionType.toLowerCase()}).`}
                      </p>
                    </div>
                    <Link
                      to="/compare"
                      className="shrink-0 self-start rounded-md border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    >
                      View in Compare →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Document Trail */}
        <section className="mt-10 pb-12">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Document trail
            </h3>
            {resolving && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <Loader2 size={11} className="animate-spin" /> Resolving real URLs…
              </span>
            )}
          </div>
          <ul className="mt-3 divide-y rounded-lg border bg-surface">
            {documents.map((doc, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <FileText size={14} className="mt-1 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {doc.type}
                    {doc.resolved && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                        verified link
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm">{doc.title}</div>
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{doc.link}</div>
                </div>
                <a
                  href={doc.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 self-center text-xs text-primary hover:underline"
                >
                  Open <ExternalLink size={11} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
