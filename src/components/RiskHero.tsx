import type { InteractionType, RiskLevel } from "@/lib/project-data";
import { riskColorVar } from "@/lib/project-data";

const INTERACTION_TONES: Record<InteractionType, { bg: string; fg: string; label: string }> = {
  Complementary: {
    bg: "color-mix(in oklab, var(--color-risk-low) 18%, transparent)",
    fg: "var(--color-risk-low)",
    label: "Reinforcing — coordinate timelines",
  },
  "Sequentially Dependent": {
    bg: "color-mix(in oklab, var(--color-risk-medium) 18%, transparent)",
    fg: "var(--color-risk-medium)",
    label: "Order matters — sequence before commitment",
  },
  "Institutionally Competing": {
    bg: "color-mix(in oklab, var(--color-risk-high) 18%, transparent)",
    fg: "var(--color-risk-high)",
    label: "Mandate overlap — designate a lead agency",
  },
  "Governance-Conflicting": {
    bg: "color-mix(in oklab, var(--color-destructive) 18%, transparent)",
    fg: "var(--color-destructive)",
    label: "Resolve governance question first",
  },
};

function scoreQualitative(score: number) {
  if (score >= 12) return "High coordination load";
  if (score >= 9) return "Moderate coordination load";
  return "Manageable load";
}

interface RiskHeroProps {
  interaction: InteractionType | string;
  composite: number; // 0–15
  risk: RiskLevel;
  context?: string;
  compact?: boolean;
}

export function RiskHero({ interaction, composite, risk, context, compact }: RiskHeroProps) {
  const tone =
    INTERACTION_TONES[interaction as InteractionType] ?? {
      bg: "var(--secondary)",
      fg: "var(--foreground)",
      label: "Interaction classification",
    };
  const pct = Math.max(0, Math.min(100, (composite / 15) * 100));

  return (
    <div className={`rounded-xl border bg-surface ${compact ? "p-4" : "p-6"}`}>
      <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
        {/* Classification */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Interaction classification
          </div>
          <div
            className="mt-2 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {interaction}
          </div>
          <div className="mt-3 text-sm leading-relaxed text-foreground/80">
            {tone.label}
          </div>
          {context && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{context}</p>
          )}
        </div>

        {/* Composite score */}
        <div className="rounded-lg border bg-background p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            Composite risk score
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums">
              {composite.toFixed(composite % 1 ? 1 : 0)}
            </span>
            <span className="text-sm text-muted-foreground">/ 15</span>
            <span
              className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                background: `color-mix(in oklab, ${riskColorVar(risk)} 18%, transparent)`,
                color: riskColorVar(risk),
              }}
            >
              {risk}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full"
              style={{ width: `${pct}%`, background: riskColorVar(risk) }}
            />
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {scoreQualitative(composite)}
          </div>
        </div>
      </div>
    </div>
  );
}
