// Domain types + seed EU Global Gateway / IDB project data.
// Country handling is now global — any ISO 3166-1 alpha-3 code is valid.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ALL_COUNTRIES,
  countryAccent,
  getCountryMeta,
  normalizeCountry,
} from "./countries";

/** ISO 3166-1 alpha-3 country code (e.g. "GTM", "USA", "KEN"). */
export type CountryCode = string;

/**
 * Backwards-compatible lookup. Any valid ISO3 code resolves to a country.
 * Returns undefined for unknown codes so existing optional-chaining patterns
 * keep working.
 */
export const FOCUS_COUNTRIES: Record<
  string,
  { name: string; region: string; tone: string; latlng: [number, number] }
> = new Proxy(
  {},
  {
    get(_t, prop: string) {
      const meta = getCountryMeta(prop);
      if (!meta) return undefined;
      return {
        name: meta.name,
        region: meta.subregion || meta.region,
        tone: meta.cca3,
        latlng: meta.latlng,
      };
    },
    has(_t, prop: string) {
      return !!getCountryMeta(prop);
    },
    ownKeys() {
      return Object.keys(ALL_COUNTRIES);
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    },
  }
) as Record<string, { name: string; region: string; tone: string; latlng: [number, number] }>;

export { normalizeCountry };

export type RiskLevel = "Low" | "Medium" | "High";
export type GTMITier = "A" | "B" | "C";
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
  leadDonor: string;
  implementingAgency: string;
  gtmiTier: GTMITier | string;
  startDate: string;
  endDate: string;
  dim1_institutional: number;
  dim1_note: string;
  dim2_regulatory: number;
  dim2_note: string;
  dim3_technical: number;
  dim3_note: string;
  dim4_political: number;
  dim4_note: string;
  dim5_investment: number;
  dim5_note: string;
  compositeScore: number; // 5–15
  interactionType: InteractionType;
  linkedProjectIds: string[];
  interactionNote: string;
  overallRisk: RiskLevel;
}

export interface CountrySummary {
  code: CountryCode;
  summary: string;
  updatedAt: number;
}

export interface ProjectSource {
  projectId: string;
  sourceType: string;
  sourceTitle: string;
  url?: string | null;
  note?: string;
}

const seed: Project[] = [
  {
    "country": "HND",
    "projectId": "HND1",
    "projectName": "VPA & Beyond: Voluntary Partnership Agreement, Forest Partnership and Green Business + \"Living Forests of Honduras\" (IICA) – SALH/TLAS Digital Traceability System",
    "projectType": "Supply Chain Traceability & Trade Compliance Digital Infrastructure",
    "leadDonor": "EU (INTPA) – €23.4M (2023 AAP) + €16M (Living Forests / IICA, 2024)",
    "implementingAgency": "Instituto de Conservación Forestal (ICF) + IICA (implementing agency for Living Forests component)",
    "gtmiTier": "B",
    "startDate": "03/01/2024",
    "endDate": "03/01/2030",
    "dim1_institutional": 3,
    "dim1_note": "ICF must coordinate with private sector timber operators, civil society, indigenous peoples, and multiple government ministries. The VPA Joint Implementation Committee (JIC) alone involves 6+ stakeholder groups. IICA adds a second implementing chain.",
    "dim2_regulatory": 3,
    "dim2_note": "SALH (Sistema de Aseguramiento de la Legalidad de Honduras) requires a full new national timber legality framework including revised forestry regulations, chain-of-custody rules, and FLEGT licensing procedures — none fully in place yet.",
    "dim3_technical": 3,
    "dim3_note": "Requires building a new national IT system for timber tracking (QR-based monitoring, government databases, transport licensing module) from scratch, plus integration with EU FLEGT licensing and EU Deforestation Regulation due-diligence systems.",
    "dim4_political": 2,
    "dim4_note": "Medium sensitivity: VPA is internationally binding and broadly supported, but timber sector interests (illegal logging networks linked to drug trafficking) and indigenous land rights create implementation friction at field level.",
    "dim5_investment": 2,
    "dim5_note": "€39.4M total EU funding committed and financing agreements signed (March + June 2024). Budget is secured for current phase; scaling SALH nationally post-pilot will require additional funding rounds.",
    "compositeScore": 13,
    "interactionType": "Sequentially Dependent",
    "linkedProjectIds": [
      "HND2",
      "HND3"
    ],
    "interactionNote": "SALH digital system depends on H2 (Cooperation Facility) to build ICF institutional capacity. SALH also feeds into H3 (PDCC) as timber export compliance data will ultimately link to regional trade interoperability.",
    "overallRisk": "High"
  },
  {
    "country": "HND",
    "projectId": "HND2",
    "projectName": "Cooperation Facility for Honduras – Public Sector Institutional Strengthening & Digital Governance (2021 AAP, Annex II)",
    "projectType": "Public Sector Capacity Building & Digital Governance Enabler",
    "leadDonor": "EU (INTPA) – €11M (2021 AAP)",
    "implementingAgency": "General Coordination of Government (SCGG) + Ministry of Finance (SEFIN) + Ministry of Transparency (STLCC)",
    "gtmiTier": "B",
    "startDate": "01/01/2022",
    "endDate": "06/01/2027",
    "dim1_institutional": 3,
    "dim1_note": "Three components (public sector, civil society, strategic communication) each with separate steering bodies. Ministry reshuffles after 2022 elections required mid-course adjustments; no single coordinating ministry has full authority.",
    "dim2_regulatory": 2,
    "dim2_note": "IMF-linked digital governance tools (electronic asset declarations, beneficial ownership registry) require new secondary legislation. Basic PFM legal framework exists but gender-sensitive budgeting rules and anti-corruption digital reporting standards are still being drafted.",
    "dim3_technical": 2,
    "dim3_note": "Primarily technical assistance (PEFA, TADAT assessments, gender-sensitive planning tools). Some e-governance tools require integration with existing SIAFI public financial management system, but no new infrastructure layer.",
    "dim4_political": 3,
    "dim4_note": "High sensitivity: transparency and anti-corruption tools directly threaten entrenched patronage networks. Honduras scored 22/100 on CPI 2024 (TI). Castro government used amnesties for officials with corruption cases pending, signalling resistance to accountability mechanisms.",
    "dim5_investment": 1,
    "dim5_note": "€11M fully committed and contracted under 2021 AAP. Relatively small budget focused on TA; no significant funding gap for current phase.",
    "compositeScore": 11,
    "interactionType": "Complementary",
    "linkedProjectIds": [
      "HND1",
      "HND3"
    ],
    "interactionNote": "Acts as institutional enabler for H1: without stronger ICF and SEFIN capacity, SALH will stall. Also reinforces H3 (PDCC) by improving regulatory readiness for digital trade facilitation and customs reform.",
    "overallRisk": "Medium"
  },
  {
    "country": "HND",
    "projectId": "HND3",
    "projectName": "Plataforma Digital de Comercio Centroamericana (PDCC) – Central American Digital Trade Platform (Regional GG Flagship; Honduras node)",
    "projectType": "Regional Digital Trade Interoperability Platform",
    "leadDonor": "EU (INTPA) + IDB (co-financing); regional coordination via SIECA",
    "implementingAgency": "Dirección General de Aduanas (DGA) + Ministerio de Agricultura (SAG) + SENASA – as national node within SIECA-managed platform",
    "gtmiTier": "B",
    "startDate": "01/01/2022",
    "endDate": "12/01/2026",
    "dim1_institutional": 2,
    "dim1_note": "Honduras node requires coordination between Customs (DGA), Agriculture (SAG/SENASA), and Migration — manageable as a national sub-component of a SIECA-governed regional system, but adaptation to national system legacy is needed.",
    "dim2_regulatory": 2,
    "dim2_note": "Existing customs and phytosanitary legislation covers core functions. PDCC 2.0 expansion requires harmonisation of technical regulations at regional level (COMIECO agreements) and some national regulatory updates for data-sharing.",
    "dim3_technical": 3,
    "dim3_note": "Honduras must connect its national customs IT system, single foreign trade window, and migration database to the regional SIECA node. 2025 PDCC–Algeciras Port PCS interoperability adds a further EU-side integration layer.",
    "dim4_political": 1,
    "dim4_note": "Low political sensitivity: trade facilitation is technocratic in nature. Honduras benefits from reduced trade costs (projected -3.2%). No major vested interests threatened, though illegal timber exporters may resist traceability links.",
    "dim5_investment": 2,
    "dim5_note": "Core EU funding committed and platform already live (Dec 2023). PDCC 2.0 expansion co-financed by IDB (RG-T4217). Honduras national adaptation costs are low; no significant funding gap.",
    "compositeScore": 10,
    "interactionType": "Complementary",
    "linkedProjectIds": [
      "HND1",
      "HND2"
    ],
    "interactionNote": "PDCC complements H1 by providing the regional export interoperability layer that SALH-certified timber will eventually feed into. Complementary to H2 as customs modernisation and regulatory harmonisation both improve platform adoption.",
    "overallRisk": "Medium"
  },
  {
    "country": "GTM",
    "projectId": "GTM1",
    "projectName": "EU Global Gateway: Digital Inclusive Transition Initiative (GG-TDEI) — MSME Competitiveness and Trade Digitalisation",
    "projectType": "Global Gateway Team Europe digital economy initiative — MSME platform and trade digitalisation",
    "leadDonor": "EU (INTPA) / Team Europe — Germany (GIZ), Spain (COFIDES), Sweden (Swisscontact), IDB Lab, ITC (International Trade Centre)",
    "implementingAgency": "Ministry of Economy (MINECO) + Secretariat for Public Innovation (SIP) — GIZ, COFIDES, Swisscontact, IDB Lab, ITC as implementing partners",
    "gtmiTier": "B",
    "startDate": "06/01/2025",
    "endDate": "12/01/2028",
    "dim1_institutional": 3,
    "dim1_note": "Five implementing partners (GIZ, COFIDES, Swisscontact, IDB Lab, ITC) operate separate project lines under a Team Europe umbrella with no formally designated coordinating mechanism above the bilateral level. SIP, created in 2021, has limited administrative capacity relative to its Digital Government Plan 2021–2026 mandate.",
    "dim2_regulatory": 3,
    "dim2_note": "Guatemala has no comprehensive data protection law — Decreto 57-2008 covers only partial public-sector data — so digital financial services and data-sharing components lack a secure legal framework, exposing private partners such as COFIDES to regulatory risk.",
    "dim3_technical": 2,
    "dim3_note": "The initiative relies on existing fintech infrastructure (mobile POS, APIs) and GIZ's INATrace traceability tool, avoiding new state infrastructure build-out; integration with MINECO's business registration systems and the Guatecompras e-procurement platform is required for trade-facilitation components, creating moderate interoperability demands on legacy systems.",
    "dim4_political": 2,
    "dim4_note": "The Arévalo government has positioned digital transformation as a reform priority, lending political buy-in to MSME-focused components; implementation in indigenous and rural communities — over 40% of the population — introduces logistical and political complexity not fully captured in the programme design as launched.",
    "dim5_investment": 3,
    "dim5_note": "Per-project budgets within the Team Europe envelope are not publicly disaggregated; core MIP funding is committed but the absence of transparent, component-level budget data and the acknowledged need to scale digital inclusion beyond the current envelope justify a score of 3 for investment needs.",
    "compositeScore": 13,
    "interactionType": "Institutionally Competing",
    "linkedProjectIds": [
      "GTM2",
      "GTM3"
    ],
    "interactionNote": "G1 and G2 both draw on SIP's limited digital governance capacity, creating institutional competition, while G1's ITC trade-digitalisation outputs overlap with G3's PDCC interface at MINECO/VUPE, so without a joint coordination mechanism there is a high risk of parallel rather than complementary trade-facilitation platforms.",
    "overallRisk": "Medium"
  },
  {
    "country": "GTM",
    "projectId": "GTM2",
    "projectName": "Digital Governance Enhancement in Guatemala (EU–Estonia eGA / Global Gateway)",
    "projectType": "Digital Public Administration & GovTech Enablers (Global Gateway)",
    "leadDonor": "EU (INTPA) — €2M grant | Team Europe (Estonia e-Governance Academy)",
    "implementingAgency": "Comisión Presidencial de Gobierno Abierto y Electrónico (GAE) — lead + inter-institutional group of strategic ministries and secretariats",
    "gtmiTier": "B",
    "startDate": "2025-01-09 00:00:00",
    "endDate": "2029-01-03 00:00:00",
    "dim1_institutional": 2,
    "dim1_note": "GAE leads an inter-institutional group spanning multiple ministries and secretariats; coordination burden is real but modest given the TA-focused nature of the project and the Comisionado's cross-cutting mandate. No new permanent body required.",
    "dim2_regulatory": 2,
    "dim2_note": "Guatemala's open-government legal framework (Decree 57-2008) is partial; full inter-institutional data-sharing requires secondary regulations not yet enacted; the absence of a comprehensive data protection law adds a compliance gap for the citizen-participation components.",
    "dim3_technical": 2,
    "dim3_note": "Primarily advisory and capacity-building; requires connecting GAE's digital governance tools to existing public administration information systems and the Guatecompras/SAT interface — moderate integration needs, no new national infrastructure layer required.",
    "dim4_political": 2,
    "dim4_note": "Governance reform and transparency tools can generate political friction in Guatemala's low-trust institutional environment (CPI 25/100); however, the Arévalo government's explicit pro-digital-governance agenda and Estonia's neutral technical image lower short-term political exposure.",
    "dim5_investment": 1,
    "dim5_note": "€2M EU grant committed and financing agreement signed September 2025; budget is fully secured for the 42-month implementation period with no identified funding gap.",
    "compositeScore": 9,
    "interactionType": "Complementary",
    "linkedProjectIds": [
      "GTM1",
      "GTM3"
    ],
    "interactionNote": "Digital Governance Enhancement provides the e-government architecture, open-data standards, and inter-institutional data-sharing layer that G1's MSME digital services and G3's customs/VUPE interoperability both depend on for reliable back-end government data; acting as an enabling GovTech layer it reinforces rather than competes with the trade-facing projects.",
    "overallRisk": "Medium"
  },
  {
    "country": "GTM",
    "projectId": "GTM3",
    "projectName": "PDCC Guatemala National Node — Central American Digital Trade Interoperability Platform (EU Global Gateway Regional Flagship; SIECA-managed)",
    "projectType": "Global Gateway regional flagship — PDCC / regional digital trade interoperability platform",
    "leadDonor": "EU (INTPA) + IDB (co-financing, RG-T4217) — USD 9M EU contribution Phase 1, administered via IDB; SIECA as regional executing agency",
    "implementingAgency": "SAT Customs Administration (Intendencia de Aduanas) + MINECO/VUPE + MAGA/VISAR — as national node within SIECA regional governance framework",
    "gtmiTier": "B",
    "startDate": "11/01/2023",
    "endDate": "12/01/2027",
    "dim1_institutional": 2,
    "dim1_note": "Guatemala's national node requires coordination among SAT, MAGA/VISAR, MINECO/VUPE, and Migration within SIECA's regional governance framework, which absorbs most coordination overhead; adaptation to SAT's legacy customs IT systems is the main pending operational challenge.",
    "dim2_regulatory": 2,
    "dim2_note": "CAUCA IV and existing phytosanitary frameworks cover core PDCC functions, while PDCC 2.0 requires COMIECO-level harmonisation of technical standards and national updates for electronic data-sharing, with SAT's SATData modernisation partially reducing the marginal regulatory adjustment burden.",
    "dim3_technical": 3,
    "dim3_note": "Guatemala's node requires integration of SAT's customs IT, VUPE's single foreign trade window, MAGA/VISAR's phytosanitary certificate database, and Migration records with the SIECA regional hub across 24 currently operational platform functionalities; the September 2025 PDCC–Algeciras Port Community System interoperability launch adds an EU-side integration layer requiring pre-arrival data exchange with European port authorities.",
    "dim4_political": 1,
    "dim4_note": "Trade facilitation is broadly technocratic and supported across the political spectrum in Guatemala, Central America's largest exporter; projected GDP gains of 0.20–0.39% and export growth of 1.67–3.28% generate distributable benefits with few clear domestic losers.",
    "dim5_investment": 1,
    "dim5_note": "Core EU funding (USD 9M, Phase 1) committed and PDCC live since November 2023; PDCC 2.0 co-financed by IDB (RG-T4217) with Guatemala's national node adaptation costs borne within the regional programme — no significant funding gap for the current implementation phase.",
    "compositeScore": 9,
    "interactionType": "Sequentially Dependent",
    "linkedProjectIds": [
      "GTM1",
      "GTM2"
    ],
    "interactionNote": "G3 is complementary to G1's trade-digitalisation component and depends on G2's RENAP-based digital identity and interoperability framework to authenticate trusted traders; if G2's DPI layer is delayed, PDCC must fall back on weaker identification mechanisms, reducing traceability and customs risk-profiling quality.",
    "overallRisk": "Medium"
  },
  {
    "country": "SLV",
    "projectId": "SLV1",
    "projectName": "Programa para el Desarrollo de la Infraestructura de Datos de El Salvador (IDB ES-L1168)",
    "projectType": "State Data Infrastructure & Digital Skills",
    "leadDonor": "IDB",
    "implementingAgency": "Secretaría de Innovación de la Presidencia (across 57 government institutions)",
    "gtmiTier": "B",
    "startDate": "01/01/2024",
    "endDate": "01/12/2029",
    "dim1_institutional": 3,
    "dim1_note": "The program touches 57 government institutions and trains over 11,000 staff. Even with the Secretaría de Innovación in charge, coordinating that many ministries at once is the main challenge.",
    "dim2_regulatory": 2,
    "dim2_note": "The Data Protection Law (Decreto 144) came into force in November 2024, but the implementing rules are not ready yet and the cybersecurity agency (ACE) is still being set up.",
    "dim3_technical": 3,
    "dim3_note": "Builds a new state data centre, moves services to the cloud, and connects existing government systems. That is a lot of new infrastructure to plug together.",
    "dim4_political": 3,
    "dim4_note": "It is one of the president's flagship digital projects. High visibility at home and international observers are watching closely because it centralizes state data.",
    "dim5_investment": 3,
    "dim5_note": "The $60M IDB loan is approved (25-year repayment, 5.5-year grace period). Training and citizen-services expansion may need extra funding later.",
    "compositeScore": 13,
    "interactionType": "Sequentially Dependent",
    "linkedProjectIds": [
      "SLV3"
    ],
    "interactionNote": "The data centre depends on the BELLA cable extension (ES3) to actually deliver citizen services at scale beyond San Salvador. Without that connectivity backbone, the data centre serves a narrow urban audience.",
    "overallRisk": "High"
  },
  {
    "country": "SLV",
    "projectId": "SLV2",
    "projectName": "EU–El Salvador Bilateral Partnership: Multiannual Indicative Programme 2021-2027 + Annual Action Plans 2024/2025 (Team Europe, Global Gateway-aligned)",
    "projectType": "EU Bilateral Cooperation (digital transition, governance, civil society)",
    "leadDonor": "European Union (DG INTPA) + Team Europe (Member States, European DFIs)",
    "implementingAgency": "EU Delegation San Salvador + Ministerio de Relaciones Exteriores + sectoral counterparts (SIGET, MINED, MINSAL, Sec. Innovación, Tribunal de Cuentas, civil society partners)",
    "gtmiTier": "B",
    "startDate": "01/01/2021",
    "endDate": "01/12/2027",
    "dim1_institutional": 2,
    "dim1_note": "Covers many sectors, coordinated through the Foreign Ministry and partner institutions. Workload is medium because most of it is technical assistance, not big infrastructure.",
    "dim2_regulatory": 3,
    "dim2_note": "Several components depend on laws that are still being built: the implementing rules for the Data Protection Law (Decreto 144/2024), the new AI/cybersecurity rules, civil digital registration norms, and rule-of-law conditions tied to the EU's funding.",
    "dim3_technical": 2,
    "dim3_note": "Mixed: connectivity and digital registration parts need to plug into national systems; technical assistance and civil society parts do not. Medium overall.",
    "dim4_political": 3,
    "dim4_note": "The EU only funds projects that meet rule-of-law standards. Reports from the IACHR (2023) and Human Rights Watch (2025) show a difficult rights environment, which puts a ceiling on how visible the partnership can be.",
    "dim5_investment": 3,
    "dim5_note": "About €49.5M in bilateral grants for 2021-2024 plus €22M planned for 2025-2027, with regional Global Gateway and blended finance on top. Many instruments and partners — medium fund complexity.",
    "compositeScore": 12,
    "interactionType": "Governance-Conflicting",
    "linkedProjectIds": [
      "SLV1"
    ],
    "interactionNote": "The EU and Team Europe require rule-of-law standards and transparency conditions, but ES1 centralizes state data under the executive. The two can run side by side, but visible co-funding or shared platforms would put both sides in an uncomfortable position.",
    "overallRisk": "High"
  },
  {
    "country": "SLV",
    "projectId": "SLV3",
    "projectName": "EU-LAC Digital Alliance — BELLA Submarine Cable Extension to Central America + Digital Connectivity for El Salvador (Global Gateway flagship)",
    "projectType": "Digital Connectivity Infrastructure (Global Gateway flagship)",
    "leadDonor": "European Union + Team Europe (via GÉANT / RedCLARA consortium)",
    "implementingAgency": "SIGET (telecom regulator) + RAICES (national research/education network) — regionally coordinated by RedCLARA and GÉANT under the Global Gateway / EU-LAC Digital Alliance",
    "gtmiTier": "B",
    "startDate": "01/01/2024",
    "endDate": "01/12/2028",
    "dim1_institutional": 3,
    "dim1_note": "Mostly SIGET, the national research network (RAICES), and a few connectivity providers. Coordination is technical, not cross-ministerial. Workload is medium.",
    "dim2_regulatory": 2,
    "dim2_note": "Depends on spectrum policy, telecom licensing rules, and how the universal-service fund is used. The legal base is there, but specific rules for the new connectivity model still need work.",
    "dim3_technical": 3,
    "dim3_note": "Heavy infrastructure: submarine cable terrestrial extension, landing-station strengthening, 20 Gbps operational capacity, plus connectivity to public schools and health centres. Foundational layer for the country's whole digital agenda.",
    "dim4_political": 2,
    "dim4_note": "Connectivity is politically popular across the spectrum and has low contestation. The biggest political risk is procurement delays, not opposition.",
    "dim5_investment": 2,
    "dim5_note": "Funded through Global Gateway / EU-LAC Digital Alliance flagship envelopes, plus member-state co-financing through GÉANT. Multiple regional instruments make disbursement medium-complex. 30M$",
    "compositeScore": 12,
    "interactionType": "Complementary",
    "linkedProjectIds": [
      "SLV2"
    ],
    "interactionNote": "BELLA is the connectivity backbone that the EU's broader bilateral partnership (ES2) needs to deliver digital services to schools, health centres, and public administration. Running ES2 and ES3 together reinforces both — they are designed to fit together inside Team Europe.",
    "overallRisk": "Medium"
  }
] as Project[];

const defaultSummaries: Record<CountryCode, string> = {
  GTM: "Guatemala's GG-TDEI, Estonia eGA digital governance, and PDCC national node converge on SIP and MINECO/VUPE. Institutional competition over SIP's limited capacity is the dominant sequencing risk; the absence of a comprehensive data protection law is the primary regulatory blocker.",
  HND: "Honduras concentrates EU funding around forest traceability (SALH), institutional strengthening, and PDCC. SALH depends sequentially on the Cooperation Facility to build ICF capacity; high political sensitivity around anti-corruption tools is the main coordination risk.",
  SLV: "El Salvador's $60M IDB data infrastructure programme and BELLA cable extension form a sequentially dependent backbone, but the EU's MIP partnership imposes governance and rule-of-law conditions that conflict with centralised state data control — visible co-funding is constrained.",
};

interface State {
  projects: Project[];
  summaries: Record<string, CountrySummary>;
  sources: ProjectSource[];
  selectedCountry: CountryCode | null;
  hoveredCountry: CountryCode | null;
  setSelectedCountry: (c: CountryCode | null) => void;
  setHoveredCountry: (c: CountryCode | null) => void;
  setProjects: (p: Project[]) => void;
  removeProject: (projectId: string) => void;
  updateSummary: (c: CountryCode, summary: string) => void;
  addSources: (s: ProjectSource[]) => void;
}

const seededSummaries: Record<string, CountrySummary> = Object.fromEntries(
  Object.entries(defaultSummaries).map(([code, summary]) => [
    code,
    { code, summary, updatedAt: Date.now() },
  ])
);

export const useProjectStore = create<State>()(
  persist(
    (set) => ({
      projects: seed,
      summaries: seededSummaries,
      sources: [],
      selectedCountry: null,
      hoveredCountry: null,
      setSelectedCountry: (c) => set({ selectedCountry: c }),
      setHoveredCountry: (c) => set({ hoveredCountry: c }),
      setProjects: (p) => set({ projects: p }),
      removeProject: (projectId) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.projectId !== projectId),
          sources: s.sources.filter((src) => src.projectId !== projectId),
        })),
      updateSummary: (c, summary) =>
        set((s) => ({
          summaries: {
            ...s.summaries,
            [c]: { code: c, summary, updatedAt: Date.now() },
          },
        })),
      addSources: (incoming) =>
        set((s) => {
          const ids = new Set(incoming.map((x) => x.projectId));
          return {
            sources: [
              ...s.sources.filter((x) => !ids.has(x.projectId)),
              ...incoming,
            ],
          };
        }),
    }),
    {
      name: "dpi-dashboard-v5",
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as object),
        sources: (persisted as State)?.sources ?? [],
      }),
    }
  )
);

export function projectsByCountry(projects: Project[], c: CountryCode) {
  return projects.filter((p) => p.country === c);
}

/** Distinct country codes present in the imported project set. */
export function countriesInUse(projects: Project[]): CountryCode[] {
  return Array.from(new Set(projects.map((p) => p.country))).sort();
}

/** Group imported countries by their (sub)region for sidebar/compare views. */
export function countriesByRegion(
  projects: Project[]
): Array<{ region: string; codes: CountryCode[] }> {
  const groups: Record<string, CountryCode[]> = {};
  for (const code of countriesInUse(projects)) {
    const meta = getCountryMeta(code);
    const region = meta?.subregion || meta?.region || "Other";
    (groups[region] ||= []).push(code);
  }
  return Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([region, codes]) => ({ region, codes }));
}

// Composite scale is 5–15.
// Country-level risk = dominant project risk profile.
// Most frequent label wins. Unique 3-way ties (e.g. 1 Low + 1 Medium + 1 High)
// resolve to Medium; all other ties resolve to the higher risk.
export function countryStats(projects: Project[], c: CountryCode) {
  const list = projectsByCountry(projects, c);
  const avg =
    list.length === 0
      ? 0
      : list.reduce((a, p) => a + p.compositeScore, 0) / list.length;
  const tierCount: Record<string, number> = {};
  for (const p of list) tierCount[p.gtmiTier] = (tierCount[p.gtmiTier] ?? 0) + 1;
  const gtmiTier =
    Object.entries(tierCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const riskCounts: Record<RiskLevel, number> = { Low: 0, Medium: 0, High: 0 };
  for (const p of list) riskCounts[p.overallRisk]++;
  const maxCount = Math.max(riskCounts.Low, riskCounts.Medium, riskCounts.High);
  const maxes = (Object.entries(riskCounts) as [RiskLevel, number][])
    .filter(([, c]) => c === maxCount)
    .map(([r]) => r);
  let overallRisk: RiskLevel;
  if (maxes.length === 1) {
    overallRisk = maxes[0];
  } else if (maxes.length === 3) {
    overallRisk = "Medium";
  } else {
    overallRisk = maxes.includes("High")
      ? "High"
      : maxes.includes("Medium")
        ? "Medium"
        : "Low";
  }
  const interactionCounts: Record<string, number> = {};
  for (const p of list)
    interactionCounts[p.interactionType] =
      (interactionCounts[p.interactionType] ?? 0) + 1;
  const dominantInteraction =
    Object.entries(interactionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  return {
    count: list.length,
    avgScore: avg,
    gtmiTier,
    overallRisk,
    riskCounts,
    dominantInteraction,
  };
}

export function riskColorVar(r: RiskLevel) {
  return r === "High"
    ? "var(--color-risk-high)"
    : r === "Medium"
      ? "var(--color-risk-medium)"
      : "var(--color-risk-low)";
}

/** Per-country accent color. Deterministic for any ISO3 code. */
export function countryColorVar(c: CountryCode) {
  return countryAccent(c);
}
