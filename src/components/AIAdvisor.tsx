import { useEffect, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore, FOCUS_COUNTRIES, projectsByCountry } from "@/lib/project-data";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should be sequenced first in this portfolio?",
  "Where do mandates compete inside this country?",
  "Which projects look complementary and can be coordinated?",
];

export function AIAdvisor({ countryCode }: { countryCode?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const { selectedCountry, projects, summaries } = useProjectStore();
  const activeCode = countryCode ?? selectedCountry;
  const country = activeCode ? FOCUS_COUNTRIES[activeCode] : null;
  const portfolio = activeCode ? projectsByCountry(projects, activeCode) : [];

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-advisor", handler);
    return () => window.removeEventListener("open-advisor", handler);
  }, []);

  // Reset chat when active country changes — advisor is scoped to current portfolio.
  useEffect(() => {
    setMessages([]);
  }, [selectedCountry]);

  function ask(q: string) {
    if (!q.trim() || !selectedCountry) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    const ctx = summaries[selectedCountry]?.summary ?? "No saved sequencing notes yet.";
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Scoped to ${country?.name} (${portfolio.length} project${portfolio.length === 1 ? "" : "s"}).\n\nSequencing notes on file: ${ctx.slice(0, 240)}${ctx.length > 240 ? "…" : ""}\n\n(Live AI advisor activates once Lovable AI is wired. This is a portfolio-scoped stub.)`,
        },
      ]);
    }, 350);
  }

  const label = country ? `Advisor · ${country.name}` : "Portfolio Advisor";

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
            className="fixed bottom-24 right-6 z-40 flex h-[520px] w-[400px] flex-col overflow-hidden rounded-xl border bg-surface shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
                <Bot size={14} />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {country ? `Advisor · ${country.name}` : "Portfolio Advisor"}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {country
                    ? `Scoped to ${portfolio.length} project${portfolio.length === 1 ? "" : "s"}`
                    : "Select a country to scope this advisor"}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close advisor"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {!selectedCountry ? (
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
                      className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="space-y-1.5 pt-1">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => ask(s)}
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
                ask(input);
              }}
              className="flex items-center gap-2 border-t p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedCountry
                    ? `Ask about ${country?.name}…`
                    : "Select a country first"
                }
                disabled={!selectedCountry}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!selectedCountry}
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
