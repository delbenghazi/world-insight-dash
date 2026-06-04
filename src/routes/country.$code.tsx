import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DetailPanel } from "@/components/DetailPanel";
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
        content: `Project portfolio, scoring, and sequencing risks for ${FOCUS_COUNTRIES[params.code]?.name ?? params.code}.`,
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
      <header className="border-b bg-surface">
        <div className="mx-auto flex w-full items-center gap-4 px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Back to atlas
          </Link>
          <div className="ml-auto text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Country detail · {code}
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <DetailPanel code={code} />
      </div>
    </div>
  );
}
