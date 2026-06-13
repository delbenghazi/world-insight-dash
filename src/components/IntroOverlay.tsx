import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { X, HelpCircle, ArrowUpDown, Link2, Flag } from "lucide-react";

export function IntroOverlay() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.aside
            key="intro-panel"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto absolute right-6 top-6 z-20 hidden w-[360px] overflow-hidden rounded-2xl border border-white/40 bg-white/55 shadow-xl backdrop-blur-xl md:block"
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Dismiss intro"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-700/70 transition hover:bg-black/5 hover:text-slate-900"
            >
              <X size={14} />
            </button>

            <div className="p-5 pr-10 text-slate-900">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
                What this tool does
              </div>
              <h2 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight">
                See how parallel digital investments collide — before you commit.
              </h2>

              <ol className="mt-4 space-y-2.5">
                <Step
                  n={1}
                  title="Score each project"
                  body="Across five dimensions: institutional load, regulatory and technical dependencies, political sensitivity, investment needs."
                />
                <Step
                  n={2}
                  title="Classify how they interact"
                  body={
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Tag tint="#16a34a">Complementary</Tag>
                      <Tag tint="#d97706">Sequentially dependent</Tag>
                      <Tag tint="#ea580c">Institutionally competing</Tag>
                      <Tag tint="#dc2626">Governance-conflicting</Tag>
                    </div>
                  }
                />
                <Step
                  n={3}
                  title="Decide before commitment"
                  body={
                    <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpDown size={12} /> Sequence
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Link2 size={12} /> Coordinate
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Flag size={12} /> Flag as risk
                      </span>
                    </div>
                  }
                />
              </ol>

              <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
                Hover a highlighted country to open its portfolio · or{" "}
                <Link to="/about" className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-700">
                  learn the methodology
                </Link>
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          onClick={() => setOpen(true)}
          aria-label="Reopen intro"
          className="pointer-events-auto absolute left-6 top-6 z-20 hidden h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/70 text-slate-800 shadow-md backdrop-blur-xl transition hover:bg-white/90 md:flex"
        >
          <HelpCircle size={18} />
        </motion.button>
      )}
    </>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-white/50 bg-white/45 p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
          {n}
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-slate-900">{title}</div>
          {typeof body === "string" ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-700">{body}</p>
          ) : (
            body
          )}
        </div>
      </div>
    </li>
  );
}

function Tag({ tint, children }: { tint: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{
        background: `color-mix(in oklab, ${tint} 13%, transparent)`,
        borderColor: `color-mix(in oklab, ${tint} 25%, transparent)`,
        color: `color-mix(in oklab, ${tint} 78%, #000)`,
      }}
    >
      {children}
    </span>
  );
}
