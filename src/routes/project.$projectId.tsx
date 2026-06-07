import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { WorkflowNav } from "@/components/WorkflowNav";
import {
  FOCUS_COUNTRIES,
  InteractionType,
  Project,
  RiskLevel,
  countryColorVar,
  projectsByCountry,
  riskColorVar,
  useProjectStore,
} from "@/lib/project-data";

export const Route = createFileRoute("/project/$projectId")({
  head: ({ params }) => ({
    meta: [
      { title: `Project ${params.projectId} — DT Global GovTech Atlas` },
      {
        name: "description",
        content: `Project ${params.projectId} detail: key risk, plain-language summary, dimension scores, and interactions.`,
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
  label: string;
  score: number;
  note: string;
}

function getDimensions(p: Project): DimensionEntry[] {
  return [
    { key: "D1", label: "Institutional load", score: p.dim1_institutional, note: p.dim1_note },
    { key: "D2", label: "Regulatory readiness", score: p.dim2_regulatory, note: p.dim2_note },
    { key: "D3", label: "Technical complexity", score: p.dim3_technical, note: p.dim3_note },
    { key: "D4", label: "Political sensitivity", score: p.dim4_political, note: p.dim4_note },
    { key: "D5", label: "Investment needs", score: p.dim5_investment, note: p.dim5_note },
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

function buildDocumentTrail(p: Project) {
  return [
    {
      type: "Donor financing agreement",
      title: `${p.leadDonor.split("—")[0].trim()} — financing agreement for ${p.projectId}`,
      link: null,
    },
    {
      type: "Project fiche / action document",
      title: `${p.projectName} — action document (${new Date(p.startDate).getFullYear() || "—"})`,
      link: null,
    },
    {
      type: "Implementer reporting",
      title: `${p.implementingAgency.split("+")[0].trim()} — implementation reports`,
      link: null,
    },
    {
      type: "Country strategy / GTMI",
      title: `${FOCUS_COUNTRIES[p.country]?.name ?? p.country} — GTMI tier ${p.gtmiTier} country profile`,
      link: "https://www.worldbank.org/en/programs/govtech/gtmi",
    },
  ];
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
  const documents =
    aiSources.length > 0
      ? aiSources.map((s) => ({
          type: s.sourceType,
          title: s.note ? `${s.sourceTitle} — ${s.note}` : s.sourceTitle,
          link: s.url ?? null,
        }))
      : buildDocumentTrail(project);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WorkflowNav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
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
            style={{ background: countryColorVar(project.country) }}
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

        {/* 1. Key Risk Flag */}
        <section
          className="mt-6 rounded-xl border-l-4 p-5"
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
                {callout.label} · {keyDim.label}
              </div>
              <p className="mt-1.5 text-[15px] font-medium leading-snug text-foreground">
                {keyDim.note}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Plain Language Summary */}
        <section className="mt-8">
          <h2 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            What this project does
          </h2>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            {plainLanguageSummary(project)}
          </p>
        </section>

        {/* 3. Five Dimension Scores */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Five-dimension scoring
            </h2>
            <div className="font-mono text-xs text-muted-foreground">
              Composite {project.compositeScore}/15
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
            {dimensions.map((d) => (
              <div key={d.key} className="rounded-lg border bg-surface p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {d.key}
                  </span>
                  <span className="font-mono text-2xl font-semibold tabular-nums">{d.score}</span>
                </div>
                <div className="mt-1 text-[11px] font-medium text-foreground">{d.label}</div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{d.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Interaction Panel */}
        <section className="mt-10">
          <h2 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Interactions in this portfolio
          </h2>
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

        {/* 5. Document Trail */}
        <section className="mt-10 pb-12">
          <h2 className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Document trail
          </h2>
          <ul className="mt-3 divide-y rounded-lg border bg-surface">
            {documents.map((doc, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <FileText size={14} className="mt-1 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {doc.type}
                  </div>
                  <div className="mt-0.5 text-sm">{doc.title}</div>
                </div>
                {doc.link ? (
                  <a
                    href={doc.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 self-center text-xs text-primary hover:underline"
                  >
                    Open <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="shrink-0 self-center text-[11px] italic text-muted-foreground">
                    Available on request
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
