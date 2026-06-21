import { useEffect, useMemo, useState } from "react";
import { Bot, Send, Sparkles, X, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useServerFn } from "@tanstack/react-start";
import { useProjectStore, FOCUS_COUNTRIES, projectsByCountry } from "@/lib/project-data";
import { evaluateAllPairs } from "@/lib/sequencing";
import { askAdvisor } from "@/lib/advisor.functions";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS_COUNTRY = [
  "What should be sequenced first in this portfolio?",
  "Where do mandates compete inside this country?",
  "Which projects look complementary and can be coordinated?",
];

const SUGGESTIONS_PORTFOLIO = [
  "Which countries have the highest coordination risk right now?",
  "Where are donors most likely to overlap across the region?",
  "What cross-country sequencing themes stand out?",
];

export function AIAdvisor({
  countryCode,
  portfolioMode = false,
}: {
  countryCode?: string;
  portfolioMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedCountry, projects, summaries } = useProjectStore();
  // In portfolio mode, advisor is region-wide and IGNORES per-country hover/selection.
  const activeCode = portfolioMode ? null : (countryCode ?? selectedCountry);
  const country = activeCode ? FOCUS_COUNTRIES[activeCode] : null;
  const portfolio = useMemo(
    () => {
      if (portfolioMode) {
        const codes = Object.keys(FOCUS_COUNTRIES);
        return codes.flatMap((c) => projectsByCountry(projects, c));
      }
      return activeCode ? projectsByCountry(projects, activeCode) : [];
    },
    [projects, activeCode, portfolioMode],
  );
  const pairs = useMemo(
    () => (portfolio.length >= 2 ? evaluateAllPairs(portfolio) : []),
    [portfolio],
  );

  const ask = useServerFn(askAdvisor);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-advisor", handler);
    return () => window.removeEventListener("open-advisor", handler);
  }, []);

  // Reset chat when active country changes — advisor is scoped to current portfolio.
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [activeCode]);

  // In portfolio mode the chat is always available — there's no per-country gate.
  const canChat = portfolioMode || !!activeCode;

  async function send(q: string) {
    if (!q.trim() || !canChat || loading) return;
    const userMsg: Msg = { role: "user", content: q.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const payloadCountryCode = portfolioMode ? "ALL" : activeCode!;
      const payloadCountryName = portfolioMode
        ? "Central America regional portfolio (GTM, HND, SLV)"
        : (country?.name ?? activeCode!);
      const payloadSummary = portfolioMode
        ? Object.keys(FOCUS_COUNTRIES)
            .map((c) => {
              const s = summaries[c]?.summary?.trim();
              return s ? `${FOCUS_COUNTRIES[c]?.name ?? c}: ${s}` : "";
            })
            .filter(Boolean)
            .join("\n\n")
        : (summaries[activeCode!]?.summary ?? "");
      const result = await ask({
        data: {
          countryCode: payloadCountryCode,
          countryName: payloadCountryName,
          portfolioSummary: payloadSummary,
          projects: portfolio.map((p) => ({
            projectId: p.projectId,
            projectName: p.projectName,
            projectType: p.projectType,
            leadDonor: p.leadDonor,
            implementingAgency: p.implementingAgency,
            gtmiTier: String(p.gtmiTier ?? ""),
            startDate: p.startDate,
            endDate: p.endDate,
            dim1_institutional: p.dim1_institutional ?? null,
            dim2_regulatory: p.dim2_regulatory ?? null,
            dim3_technical: p.dim3_technical ?? null,
            dim4_political: p.dim4_political ?? null,
            dim5_investment: p.dim5_investment ?? null,
            compositeScore: p.compositeScore ?? null,
            interactionType: p.interactionType ?? "",
            interactionNote: p.interactionNote ?? "",
            overallRisk: p.overallRisk ?? "",
            linkedProjectIds: p.linkedProjectIds ?? [],
          })),
          pairs: pairs.map((pr) => ({
            a: pr.a.projectId,
            b: pr.b.projectId,
            outcome: pr.outcome,
            gate: pr.gate,
            interactionType: pr.interactionType,
            reason: pr.reason,
            flags: pr.flags,
          })),
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: result.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const label = portfolioMode
    ? "AI Advisor · Regional portfolio"
    : countryCode && country
      ? `AI Advisor · ${country.name}`
      : "AI Advisor";
  const suggestions = portfolioMode ? SUGGESTIONS_PORTFOLIO : SUGGESTIONS_COUNTRY;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-lg transition hover:scale-[1.02]"
      >
        <Sparkles size={14} />
        {label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 right-6 z-40 flex flex-col overflow-hidden rounded-xl border bg-surface shadow-2xl ${
              expanded
                ? "h-[80vh] w-[70vw] max-w-[70vw]"
                : "h-[520px] w-[400px]"
            }`}
          >
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
                <Bot size={14} />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {countryCode && country ? `AI Advisor · ${country.name}` : "AI Advisor"}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {country
                    ? `Scoped to ${portfolio.length} project${portfolio.length === 1 ? "" : "s"}`
                    : "Select a country to scope this advisor"}
                </div>
              </div>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={expanded ? "Collapse advisor" : "Expand advisor"}
              >
                {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close advisor"
              >
                <X size={14} />
              </button>
            </div>


            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {!activeCode ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Sparkles size={16} />
                  </div>
                  <div className="mt-3 text-sm font-semibold">No portfolio selected</div>
                  <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                    The advisor only answers questions about a specific country portfolio. Select a country on the map or from the sidebar to begin.
                  </p>
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="rounded-md bg-secondary px-3 py-2 text-sm leading-relaxed text-foreground">
                      Ready to advise on{" "}
                      <span className="font-semibold">{country?.name}</span>. Ask about sequencing, mandate overlaps, or coordination risks across this portfolio.
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`${expanded ? "max-w-[80%]" : "max-w-[88%]"} rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "ml-auto whitespace-pre-wrap bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-code:rounded prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground prose-a:text-primary">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>
                  ))}
                  {loading && (
                    <div className="max-w-[88%] rounded-lg bg-secondary px-3 py-2 text-sm italic text-muted-foreground">
                      Thinking…
                    </div>
                  )}
                  {error && (
                    <div className="max-w-[88%] rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {error}
                    </div>
                  )}
                  {messages.length === 0 && !loading && (
                    <div className="space-y-1.5 pt-1">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="w-full rounded-md border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-primary hover:text-foreground"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activeCode
                    ? `Ask about ${country?.name}…`
                    : "Select a country first"
                }
                disabled={!activeCode || loading}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!activeCode || loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
