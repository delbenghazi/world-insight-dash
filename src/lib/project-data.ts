// Domain types + seed sample data + zustand store for projects.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CountryCode = "GTM" | "HND" | "SLV";

export const FOCUS_COUNTRIES: Record<
  CountryCode,
  { name: string; region: string; tone: string }
> = {
  GTM: { name: "Guatemala", region: "Central America", tone: "guatemala" },
  HND: { name: "Honduras", region: "Central America", tone: "honduras" },
  SLV: { name: "El Salvador", region: "Central America", tone: "elsalvador" },
};

export type RiskLevel = "Low" | "Medium" | "High";
export type InteractionType =
  | "Complementary"
  | "Sequentially Dependent"
  | "Institutionally Competing"
  | "Governance-Conflicting";

export interface Project {
  country: CountryCode;
  projectId: string;
  projectName: string;
  projectType: string;
  gtmiTier: "Tier 1" | "Tier 2" | "Tier 3";
  dim1_absorption: number;       // 1-5
  dim2_regulatory: number;
  dim3_technical: number;
  dim4_political: number;
  dim5_investment: number;
  interactionType: InteractionType;
  linkedProjectIds: string[];
  notes: string;
  compositeScore: number;        // computed but stored
  overallRisk: RiskLevel;
}

export interface CountrySummary {
  code: CountryCode;
  summary: string;
  updatedAt: number;
}

const seed: Project[] = [
  {
    country: "GTM",
    projectId: "GT-001",
    projectName: "National Digital ID Platform",
    projectType: "Foundational DPI",
    gtmiTier: "Tier 2",
    dim1_absorption: 4, dim2_regulatory: 4, dim3_technical: 3, dim4_political: 4, dim5_investment: 4,
    interactionType: "Sequentially Dependent",
    linkedProjectIds: ["GT-002", "GT-003"],
    notes: "Pre-requisite for downstream service digitization.",
    compositeScore: 3.8,
    overallRisk: "High",
  },
  {
    country: "GTM",
    projectId: "GT-002",
    projectName: "Interoperability Backbone",
    projectType: "DPI Infrastructure",
    gtmiTier: "Tier 2",
    dim1_absorption: 3, dim2_regulatory: 3, dim3_technical: 4, dim4_political: 3, dim5_investment: 3,
    interactionType: "Complementary",
    linkedProjectIds: ["GT-001"],
    notes: "Builds on Digital ID rollout.",
    compositeScore: 3.2,
    overallRisk: "Medium",
  },
  {
    country: "GTM",
    projectId: "GT-003",
    projectName: "e-Tax Modernization",
    projectType: "GovTech",
    gtmiTier: "Tier 2",
    dim1_absorption: 3, dim2_regulatory: 2, dim3_technical: 3, dim4_political: 4, dim5_investment: 3,
    interactionType: "Institutionally Competing",
    linkedProjectIds: ["GT-001"],
    notes: "Competing mandate with SAT modernization unit.",
    compositeScore: 3.0,
    overallRisk: "Medium",
  },
  {
    country: "HND",
    projectId: "HN-001",
    projectName: "Civil Registry Digitization",
    projectType: "Foundational DPI",
    gtmiTier: "Tier 3",
    dim1_absorption: 4, dim2_regulatory: 3, dim3_technical: 4, dim4_political: 3, dim5_investment: 4,
    interactionType: "Sequentially Dependent",
    linkedProjectIds: ["HN-002"],
    notes: "Anchors downstream identity services.",
    compositeScore: 3.6,
    overallRisk: "High",
  },
  {
    country: "HND",
    projectId: "HN-002",
    projectName: "Open Data Portal",
    projectType: "Transparency",
    gtmiTier: "Tier 2",
    dim1_absorption: 2, dim2_regulatory: 2, dim3_technical: 2, dim4_political: 3, dim5_investment: 2,
    interactionType: "Complementary",
    linkedProjectIds: [],
    notes: "Low absorption load.",
    compositeScore: 2.2,
    overallRisk: "Low",
  },
  {
    country: "SLV",
    projectId: "SV-001",
    projectName: "Unified Payments Rail",
    projectType: "DPI Infrastructure",
    gtmiTier: "Tier 2",
    dim1_absorption: 3, dim2_regulatory: 4, dim3_technical: 3, dim4_political: 4, dim5_investment: 4,
    interactionType: "Governance-Conflicting",
    linkedProjectIds: ["SV-002"],
    notes: "Mandate overlap between Central Bank and Ministry of Finance.",
    compositeScore: 3.6,
    overallRisk: "High",
  },
  {
    country: "SLV",
    projectId: "SV-002",
    projectName: "Health Information Exchange",
    projectType: "Sector DPI",
    gtmiTier: "Tier 2",
    dim1_absorption: 3, dim2_regulatory: 3, dim3_technical: 3, dim4_political: 2, dim5_investment: 3,
    interactionType: "Complementary",
    linkedProjectIds: ["SV-001"],
    notes: "Depends on payments rail for reimbursement workflows.",
    compositeScore: 2.8,
    overallRisk: "Medium",
  },
];

const defaultSummaries: Record<CountryCode, string> = {
  GTM: "Guatemala is mid-maturity on GTMI Tier 2 with strong sequencing risk: Digital ID is the keystone for e-Tax and Interoperability work. Institutional competition between SAT and the digital agency is the main coordination risk.",
  HND: "Honduras is GTMI Tier 3 overall. Civil registry digitization is the foundational dependency; downstream investments should be sequenced after it lands. Absorption capacity is the main constraint.",
  SLV: "El Salvador shows strong political appetite but governance-conflicting mandates between the Central Bank and Ministry of Finance on payments rails. Sequencing must resolve institutional ownership before scaling.",
};

interface State {
  projects: Project[];
  summaries: Record<CountryCode, CountrySummary>;
  selectedCountry: CountryCode | null;
  hoveredCountry: CountryCode | null;
  setSelectedCountry: (c: CountryCode | null) => void;
  setHoveredCountry: (c: CountryCode | null) => void;
  setProjects: (p: Project[]) => void;
  updateSummary: (c: CountryCode, summary: string) => void;
}

export const useProjectStore = create<State>()(
  persist(
    (set) => ({
      projects: seed,
      summaries: {
        GTM: { code: "GTM", summary: defaultSummaries.GTM, updatedAt: Date.now() },
        HND: { code: "HND", summary: defaultSummaries.HND, updatedAt: Date.now() },
        SLV: { code: "SLV", summary: defaultSummaries.SLV, updatedAt: Date.now() },
      },
      selectedCountry: "GTM",
      hoveredCountry: null,
      setSelectedCountry: (c) => set({ selectedCountry: c }),
      setHoveredCountry: (c) => set({ hoveredCountry: c }),
      setProjects: (p) => set({ projects: p }),
      updateSummary: (c, summary) =>
        set((s) => ({
          summaries: {
            ...s.summaries,
            [c]: { code: c, summary, updatedAt: Date.now() },
          },
        })),
    }),
    { name: "dpi-dashboard-v1" }
  )
);

export function projectsByCountry(projects: Project[], c: CountryCode) {
  return projects.filter((p) => p.country === c);
}

export function countryStats(projects: Project[], c: CountryCode) {
  const list = projectsByCountry(projects, c);
  const avg =
    list.length === 0
      ? 0
      : list.reduce((a, p) => a + p.compositeScore, 0) / list.length;
  const tier =
    list.length === 0
      ? "—"
      : (list.sort((a, b) => b.gtmiTier.localeCompare(a.gtmiTier))[0].gtmiTier as string);
  const risk: RiskLevel =
    avg >= 3.5 ? "High" : avg >= 2.5 ? "Medium" : "Low";
  return { count: list.length, avgScore: avg, gtmiTier: tier, overallRisk: risk };
}

export function riskColorVar(r: RiskLevel) {
  return r === "High"
    ? "var(--color-risk-high)"
    : r === "Medium"
      ? "var(--color-risk-medium)"
      : "var(--color-risk-low)";
}

export function countryColorVar(c: CountryCode) {
  return c === "GTM"
    ? "var(--color-country-guatemala)"
    : c === "HND"
      ? "var(--color-country-honduras)"
      : "var(--color-country-elsalvador)";
}
