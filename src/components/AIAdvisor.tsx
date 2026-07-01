import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles, X, Maximize2, Minimize2, Copy, RefreshCw, Trash2, Check } from "lucide-react";
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

const DEFAULT_SUGGESTIONS_COUNTRY = [
  "What should be sequenced first in this portfolio?",
  "Where do mandates compete inside this country?",
  "Which projects look complementary and can be coordinated?",
];

const DEFAULT_SUGGESTIONS_PORTFOLIO = [
  "Which countries have the highest coordination risk right now?",
  "Where are donors most likely to overlap across the region?",
  "What cross-country sequencing themes stand out?",
];

const HISTORY_KEY_PREFIX = "dpi-advisor-history-v1:";

function loadHistory(key: string): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
  } catch {}
  return [];
}

function saveHistory(key: string, messages: Msg[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY_PREFIX + key, JSON.stringify(messages.slice(-40)));
  } catch {}
}

/** Turn [GTM1], [GTM1×GTM3] into internal links inside markdown before rendering. */
function linkifyCitations(md: string): string {
  return md
    // pair citation → portfolio advisor deep link
    .replace(/\[([A-Z]{2,4}\d+)×([A-Z]{2,4}\d+)\]/g, (_m, a, b) => `[${a}×${b}](/portfolio-advisor?focus=${a},${b})`)
    // single project citation
    .replace(/\[([A-Z]{2,4}\d+)\](?!\()/g, (_m, id) => `[${id}](/project/${id})`);
}

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
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef<string | null>(null);

  const { selectedCountry, projects, summaries } = useProjectStore();
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
  const historyKey = portfolioMode ? "ALL" : (activeCode ?? "none");

  // Listen for external open + optional autoSend
  useEffect(() => {
    const handler = (e: Event) => {
      setOpen(true);
      const detail = (e as CustomEvent).detail as { question?: string } | undefined;
      if (detail?.question) {
        setTimeout(() => send(detail.question!), 100);
      }
    };
    window.addEventListener("open-advisor", handler as EventListener);
    return () => window.removeEventListener("open-advisor", handler as EventListener);
  }, []);

  // Auto-open + auto-ask from URL params (?ask=... on any page)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ask = params.get("ask");
    if (ask && autoSentRef.current !== ask) {
      autoSentRef.current = ask;
      setOpen(true);
      setTimeout(() => send(ask), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load per-scope history when scope changes.
  useEffect(() => {
    const loaded = loadHistory(historyKey);
    setMessages(loaded);
    setError(null);
  }, [historyKey]);

  // Persist on every change.
  useEffect(() => {
    if (messages.length > 0) saveHistory(historyKey, messages);
  }, [messages, historyKey]);

  // Auto-scroll + focus input.
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open, historyKey]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const canChat = portfolioMode || !!activeCode;

  async function send(q: string, replaceLastAssistant = false) {
    if (!q.trim() || !canChat || loading) return;
    const userMsg: Msg = { role: "user", content: q.trim() };
    const base = replaceLastAssistant
      ? messages.slice(0, messages.length - (messages[messages.length - 1]?.role === "assistant" ? 1 : 0))
      : messages;
    const next: Msg[] = replaceLastAssistant ? base : [...base, userMsg];
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
      if (Array.isArray(result.quickActions)) setQuickActions(result.quickActions);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function regenerateLast() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) send(lastUser.content, true);
  }

  function copyMessage(idx: number, content: string) {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((i) => (i === idx ? null : i)), 1500);
    });
  }

  function newConversation() {
    setMessages([]);
    setError(null);
    saveHistory(historyKey, []);
    inputRef.current?.focus();
  }

  const label = portfolioMode
    ? "AI Advisor · Regional portfolio"
    : countryCode && country
      ? `AI Advisor · ${country.name}`
      : "AI Advisor";
  const suggestions = quickActions.length > 0
    ? quickActions
    : (portfolioMode ? DEFAULT_SUGGESTIONS_PORTFOLIO : DEFAULT_SUGGESTIONS_COUNTRY);

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
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{label}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {portfolioMode
                    ? `Region-wide · ${portfolio.length} project${portfolio.length === 1 ? "" : "s"} across ${Object.keys(FOCUS_COUNTRIES).length} countries`
                    : country
                      ? `Scoped to ${portfolio.length} project${portfolio.length === 1 ? "" : "s"}`
                      : "Select a country to scope this advisor"}
                </div>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={newConversation}
                  className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setExpanded((e) => !e)}
                className={`${messages.length > 0 ? "" : "ml-auto "}rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground`}
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

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {!canChat ? (
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
                      {portfolioMode ? (
                        <>Ready to advise on the <span className="font-semibold">regional portfolio</span>. Ask about cross-country sequencing, donor overlaps, or coordination risks.</>
                      ) : (
                        <>Ready to advise on <span className="font-semibold">{country?.name}</span>. Ask about sequencing, mandate overlaps, or coordination risks.</>
                      )}
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`group ${expanded ? "max-w-[80%]" : "max-w-[92%]"} rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "ml-auto whitespace-pre-wrap bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <>
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-code:rounded prose-code:bg-background/60 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {linkifyCitations(m.content)}
                            </ReactMarkdown>
                          </div>
                          <div className="mt-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              onClick={() => copyMessage(i, m.content)}
                              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground"
                              title="Copy"
                            >
                              {copiedIdx === i ? <Check size={10} /> : <Copy size={10} />}
                              {copiedIdx === i ? "Copied" : "Copy"}
                            </button>
                            {i === messages.length - 1 && (
                              <button
                                onClick={regenerateLast}
                                disabled={loading}
                                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-50"
                                title="Regenerate"
                              >
                                <RefreshCw size={10} /> Regenerate
                              </button>
                            )}
                          </div>
                        </>
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
                  {!loading && suggestions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {messages.length === 0 && (
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested</div>
                      )}
                      {suggestions.map((s) => (
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
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  portfolioMode
                    ? "Ask about the regional portfolio…"
                    : activeCode
                      ? `Ask about ${country?.name}…`
                      : "Select a country first"
                }
                disabled={!canChat || loading}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!canChat || loading || !input.trim()}
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
