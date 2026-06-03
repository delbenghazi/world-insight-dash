import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore, FOCUS_COUNTRIES } from "@/lib/project-data";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What sequencing risks should DT Global flag for donors?",
  "Where do mandates compete inside the selected country?",
  "Summarize stakeholder implications for citizens.",
];

export function AIAdvisor() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Policy copilot ready. I answer only within DPI sequencing scope for Guatemala, Honduras, and El Salvador. Ask about sequencing, coordination risks, or stakeholder implications.",
    },
  ]);
  const { selectedCountry, projects, summaries } = useProjectStore();

  function ask(q: string) {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    // Stub reply — wire to Lovable AI once Cloud is enabled.
    const country = selectedCountry ? FOCUS_COUNTRIES[selectedCountry].name : "the region";
    const ctx = selectedCountry
      ? summaries[selectedCountry]?.summary
      : "Three-country Central America scope.";
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Working from ${projects.length} projects of record in scope. For ${country}: ${ctx?.slice(
            0,
            260
          )}…\n\n(Live AI advisor activates once Lovable Cloud + AI Gateway is enabled. The current response is a scoped stub so the UX is visible.)`,
        },
      ]);
    }, 350);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-lg transition hover:scale-[1.02]"
      >
        <Sparkles size={14} />
        Policy copilot
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
                <div className="text-sm font-semibold">AI Advisor</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Scoped to DPI sequencing · CA-3
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
              {messages.length <= 1 && (
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
                placeholder="Ask about sequencing, mandates, donors…"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
              />
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"
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
