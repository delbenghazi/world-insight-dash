import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { useProjectStore } from "@/lib/project-data";

// ----- Step definitions -----

export interface TourStep {
  /** Pathname (with concrete params already filled in) this step lives on. */
  path: string;
  /** CSS selector for the highlighted element. */
  selector: string;
  title: string;
  body: string;
}

function buildSteps(countryCode: string): TourStep[] {
  return [
    {
      path: "/",
      selector: '[data-tour="world-map"]',
      title: "The interactive map",
      body: "Hover a country to preview it, click to open its full portfolio.",
    },
    {
      path: "/",
      selector: '[data-tour="countries-list"]',
      title: "Countries in portfolio",
      body: "Jump straight to any country's portfolio from here.",
    },
    {
      path: "/methodology",
      selector: '[data-tour="dimensions"]',
      title: "Five assessment dimensions",
      body: "Every project is scored 1–3 across these five dimensions.",
    },
    {
      path: "/methodology",
      selector: '[data-tour="interactions"]',
      title: "Interaction analysis",
      body: "Projects are then classified into one of these four interaction types.",
    },
    {
      path: "/methodology",
      selector: '[data-tour="risk-classification"]',
      title: "Scoring & risk classification",
      body: "The five dimension scores sum into a composite score, which sets the risk tier.",
    },
    {
      path: `/country/${countryCode}`,
      selector: '[data-tour="composite"]',
      title: "Composite risk score",
      body: "This is the project's total risk load, out of 15.",
    },
    {
      path: `/country/${countryCode}`,
      selector: '[data-tour="sequencing"]',
      title: "Sequencing implications",
      body: "A plain-language read of what's driving risk in this portfolio.",
    },
    {
      path: `/country/${countryCode}`,
      selector: '[data-tour="project-table"]',
      title: "Project details",
      body: "Click any row, or 'View details,' to open a project's full assessment.",
    },
    {
      path: "/portfolio-advisor",
      selector: '[data-tour="advisor-country-select"]',
      title: "Pick a country to advise on",
      body: "Select a country here to load its portfolio. The advisor will then sequence every project pair into implementation waves, surface the critical path, and flag bottlenecks and conflicts.",
    },
    {
      path: "/compare",
      selector: '[data-tour="country-checkboxes"]',
      title: "Compare country portfolios",
      body: "Tick two or more country checkboxes to compare their portfolios side by side. The comparison view updates automatically as you add or remove countries.",
    },
  ];
}

// ----- Context -----

interface TourCtx {
  active: boolean;
  start: () => void;
  stop: () => void;
}

const TourContext = createContext<TourCtx | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside TourProvider");
  return ctx;
}

const STORAGE_KEY = "tourState";

interface PersistedState {
  active: boolean;
  index: number;
  country: string;
}

function readPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function writePersisted(s: PersistedState | null) {
  if (typeof window === "undefined") return;
  if (!s) window.sessionStorage.removeItem(STORAGE_KEY);
  else window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const selectedCountry = useProjectStore((s) => s.selectedCountry);
  const projects = useProjectStore((s) => s.projects);

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [countryCode, setCountryCode] = useState<string>("GTM");

  // Initiating navigation from the tour itself; suppresses "user navigated away" guard.
  const intentionalNavRef = useRef(false);

  const steps = useMemo(() => buildSteps(countryCode), [countryCode]);

  // Hydrate from sessionStorage once
  useEffect(() => {
    const persisted = readPersisted();
    if (persisted?.active) {
      setCountryCode(persisted.country);
      setIndex(persisted.index);
      setActive(true);
      // Treat the very first post-hydration render as expected for whatever path we're on.
      intentionalNavRef.current = true;
    }
  }, []);

  // Persist
  useEffect(() => {
    if (active) {
      writePersisted({ active: true, index, country: countryCode });
    } else {
      writePersisted(null);
    }
  }, [active, index, countryCode]);

  const stop = useCallback(() => {
    setActive(false);
    setIndex(0);
    intentionalNavRef.current = false;
  }, []);

  const start = useCallback(() => {
    // Pick first available country with projects, else fall back to selectedCountry/GTM.
    const codesWithProjects = Array.from(new Set(projects.map((p) => p.country)));
    const code = codesWithProjects[0] ?? selectedCountry ?? "GTM";
    setCountryCode(code);
    setIndex(0);
    setActive(true);
    intentionalNavRef.current = true;
    if (pathname !== "/") {
      navigate({ to: "/" });
    }
  }, [navigate, pathname, projects, selectedCountry]);

  // Detect manual navigation away from the expected step path → end tour.
  useEffect(() => {
    if (!active) return;
    const expected = steps[index]?.path;
    if (!expected) return;
    if (pathname === expected) {
      intentionalNavRef.current = false;
      return;
    }
    if (intentionalNavRef.current) {
      // We caused this navigation; wait for the expected path.
      return;
    }
    // User navigated somewhere unexpected.
    stop();
  }, [pathname, active, index, steps, stop]);

  const goNext = useCallback(() => {
    const next = index + 1;
    if (next >= steps.length) {
      // Done — handled by UI state; keep active until user clicks Exit on the finish card.
      setIndex(next);
      return;
    }
    setIndex(next);
    const nextPath = steps[next].path;
    if (nextPath !== pathname) {
      intentionalNavRef.current = true;
      navigate({ to: nextPath as never });
    }
  }, [index, steps, pathname, navigate]);

  const goBack = useCallback(() => {
    const prev = Math.max(0, index - 1);
    setIndex(prev);
    const prevPath = steps[prev].path;
    if (prevPath !== pathname) {
      intentionalNavRef.current = true;
      navigate({ to: prevPath as never });
    }
  }, [index, steps, pathname, navigate]);

  const ctx: TourCtx = useMemo(
    () => ({ active, start, stop }),
    [active, start, stop]
  );

  const onCorrectPath = active && steps[index] && pathname === steps[index].path;
  const finished = active && index >= steps.length;

  return (
    <TourContext.Provider value={ctx}>
      {children}
      {active && (finished ? (
        <TourFinishCard onExit={stop} />
      ) : onCorrectPath ? (
        <TourOverlay
          step={steps[index]}
          index={index}
          total={steps.length}
          onBack={index > 0 ? goBack : undefined}
          onNext={goNext}
          onExit={stop}
        />
      ) : null)}
    </TourContext.Provider>
  );
}

// ----- Overlay UI -----

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function useTargetRect(selector: string): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    let cancelled = false;

    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        setRect((prev) => (prev === null ? prev : null));
        return;
      }
      const r = el.getBoundingClientRect();
      setRect((prev) => {
        if (
          prev &&
          prev.top === r.top &&
          prev.left === r.left &&
          prev.width === r.width &&
          prev.height === r.height
        )
          return prev;
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      });
    };

    const tick = () => {
      if (cancelled) return;
      measure();
      raf = window.requestAnimationFrame(tick);
    };

    // Try to scroll the element into view first
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      } catch {
        /* ignore */
      }
    }
    tick();
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [selector]);

  return rect;
}

function TourOverlay({
  step,
  index,
  total,
  onBack,
  onNext,
  onExit,
}: {
  step: TourStep;
  index: number;
  total: number;
  onBack?: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const rect = useTargetRect(step.selector);

  // Tooltip placement
  const tooltip = computeTooltipPosition(rect);

  return (
    <div
      className="fixed inset-0 z-[9999]"
      // Block interactions only on the dim area, not on the highlighted element.
      style={{ pointerEvents: "none" }}
    >
      {/* Dim layer using box-shadow cutout around the target */}
      {rect ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 12,
            boxShadow:
              "0 0 0 9999px rgba(8, 12, 24, 0.62), 0 0 0 3px rgba(255,255,255,0.95), 0 0 0 6px rgba(99, 162, 255, 0.55), 0 0 30px rgba(99, 162, 255, 0.45)",
            transition: "all 200ms ease",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8, 12, 24, 0.62)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        role="dialog"
        aria-label={step.title}
        className="rounded-xl border border-border bg-surface text-foreground shadow-2xl"
        style={{
          position: "fixed",
          top: tooltip.top,
          left: tooltip.left,
          width: 340,
          maxWidth: "calc(100vw - 24px)",
          pointerEvents: "auto",
          padding: 16,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Tour · {index + 1} of {total}
          </div>
          <button
            onClick={onExit}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Exit tour"
          >
            <X size={14} />
          </button>
        </div>
        <h3 className="mt-1.5 text-sm font-semibold tracking-tight">{step.title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={onExit}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Exit tour
          </button>
          <div className="flex gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}
            <button
              onClick={onNext}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              {index + 1 === total ? "Finish" : "Next"} <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function computeTooltipPosition(rect: Rect | null): { top: number; left: number } {
  if (typeof window === "undefined") return { top: 80, left: 80 };
  const W = window.innerWidth;
  const H = window.innerHeight;
  const TW = 340;
  const TH = 180;
  const margin = 16;

  if (!rect) {
    return { top: Math.max(margin, H / 2 - TH / 2), left: Math.max(margin, W / 2 - TW / 2) };
  }

  // Prefer below, then above, then right, then left.
  const spaceBelow = H - (rect.top + rect.height) - margin;
  const spaceAbove = rect.top - margin;
  const spaceRight = W - (rect.left + rect.width) - margin;
  const spaceLeft = rect.left - margin;

  let top = 0;
  let left = 0;

  if (spaceBelow >= TH) {
    top = rect.top + rect.height + 12;
    left = clamp(rect.left + rect.width / 2 - TW / 2, margin, W - TW - margin);
  } else if (spaceAbove >= TH) {
    top = rect.top - TH - 12;
    left = clamp(rect.left + rect.width / 2 - TW / 2, margin, W - TW - margin);
  } else if (spaceRight >= TW) {
    left = rect.left + rect.width + 12;
    top = clamp(rect.top + rect.height / 2 - TH / 2, margin, H - TH - margin);
  } else if (spaceLeft >= TW) {
    left = rect.left - TW - 12;
    top = clamp(rect.top + rect.height / 2 - TH / 2, margin, H - TH - margin);
  } else {
    top = margin;
    left = Math.max(margin, W - TW - margin);
  }
  return { top, left };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function TourFinishCard({ onExit }: { onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: "auto" }}>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8, 12, 24, 0.62)",
        }}
      />
      <div
        role="dialog"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 text-center shadow-2xl"
        style={{ width: 360, maxWidth: "calc(100vw - 24px)" }}
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles size={18} />
        </div>
        <h3 className="mt-3 text-base font-semibold tracking-tight">Tour complete</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You're ready to explore on your own.
        </p>
        <button
          onClick={onExit}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Exit
        </button>
      </div>
    </div>
  );
}

// ----- Trigger button -----

export function TourTriggerButton() {
  const { active, start, stop } = useTour();
  if (active) {
    return (
      <button
        onClick={stop}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-secondary"
        title="Exit tour"
      >
        <X size={12} /> Exit tour
      </button>
    );
  }
  return (
    <button
      onClick={start}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-secondary"
      title="Take a guided tour"
    >
      <Sparkles size={12} /> Take a tour
    </button>
  );
}
