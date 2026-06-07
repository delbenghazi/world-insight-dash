import { createFileRoute, notFound } from "@tanstack/react-router";
import { DetailPanel } from "@/components/DetailPanel";
import { WorkflowNav } from "@/components/WorkflowNav";
import { AIAdvisor } from "@/components/AIAdvisor";
import { FOCUS_COUNTRIES } from "@/lib/project-data";
import { getCountryMeta, normalizeCountry } from "@/lib/countries";

export const Route = createFileRoute("/country/$code")({
  head: ({ params }) => ({
    meta: [
      {
        title: `${FOCUS_COUNTRIES[params.code]?.name ?? params.code} — DT Global GovTech Atlas`,
      },
      {
        name: "description",
        content: `Interaction classification, composite risk, and sequencing implications for ${FOCUS_COUNTRIES[params.code]?.name ?? params.code}.`,
      },
    ],
  }),
  loader: ({ params }) => {
    const resolved = getCountryMeta(params.code) ? params.code : normalizeCountry(params.code);
    if (!resolved) throw notFound();
    return { code: resolved };
  },
  notFoundComponent: () => (
    <div className="flex h-screen items-center justify-center text-muted-foreground">
      Unknown country code.
    </div>
  ),
  errorComponent: () => (
    <div className="flex h-screen items-center justify-center text-destructive">
      Something went wrong.
    </div>
  ),
  component: CountryPage,
});

function CountryPage() {
  const { code } = Route.useLoaderData();
  return (
    <div className="flex h-screen flex-col bg-background">
      <WorkflowNav />
      <div className="flex-1 overflow-hidden">
        <DetailPanel code={code} />
      </div>
    </div>
  );
}
