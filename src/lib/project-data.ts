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
import { defaultSources } from "./default-sources";

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
  /** Dimensions whose score came from user-answered proxy questions, not document evidence. */
  proxyDimensions?: string[];
}

export const DIMENSION_LABELS: Record<string, string> = {
  dim1_institutional: "D1 Institutional",
  dim2_regulatory: "D2 Regulatory",
  dim3_technical: "D3 Technical",
  dim4_political: "D4 Political",
  dim5_investment: "D5 Investment",
};

export function projectHasProxy(p: Project): boolean {
  return !!p.proxyDimensions && p.proxyDimensions.length > 0;
}

export interface CountryProxyInfo {
  hasProxy: boolean;
  entries: Array<{ projectId: string; projectName: string; dimensions: string[] }>;
}

export function countryProxyInfo(projects: Project[], code: CountryCode): CountryProxyInfo {
  const entries = projects
    .filter((p) => p.country === code && projectHasProxy(p))
    .map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
      dimensions: p.proxyDimensions ?? [],
    }));
  return { hasProxy: entries.length > 0, entries };
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
    "dim5_investment": 1,
    "dim5_note": "€39.4M total declared (2023 AAP €23.4M + Living Forests/IICA €16M). Both financing agreements signed Mar and Jun 2024; ~0% funding gap. Supports D5 score 1 (secure).",
    "compositeScore": 12,
    "interactionType": "Sequentially Dependent",
    "linkedProjectIds": ["HND2", "HND3"],
    "interactionNote": "SALH digital system depends on HND2 (Cooperation Facility) to build ICF institutional capacity. SALH also feeds into HND3 (PDCC) as timber export compliance data will ultimately link to regional trade interoperability.",
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
    "dim5_note": "€11M committed and contracted under the 2021 AAP. Fully financed TA budget with no funding gap for the current phase. Supports D5 score 1 (secure).",
    "compositeScore": 11,
    "interactionType": "Complementary",
    "linkedProjectIds": ["HND1", "HND3"],
    "interactionNote": "Acts as institutional enabler for HND1: without stronger ICF and SEFIN capacity, SALH will stall. Also reinforces HND3 (PDCC) by improving regulatory readiness for digital trade facilitation and customs reform.",
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
    "startDate": "12/01/2022",
    "endDate": "11/01/2027",
    "dim1_institutional": 2,
    "dim1_note": "Honduras node requires coordination between Customs (DGA), Agriculture (SAG/SENASA), and Migration — manageable as a national sub-component of a SIECA-governed regional system, but adaptation to national system legacy is needed.",
    "dim2_regulatory": 2,
    "dim2_note": "Existing customs and phytosanitary legislation covers core functions. PDCC 2.0 expansion requires harmonisation of technical regulations at regional level (COMIECO agreements) and some national regulatory updates for data-sharing.",
    "dim3_technical": 3,
    "dim3_note": "Honduras must connect its national customs IT system, single foreign trade window, and migration database to the regional SIECA node. 2025 PDCC–Algeciras Port PCS interoperability adds a further EU-side integration layer.",
    "dim4_political": 1,
    "dim4_note": "Low political sensitivity: trade facilitation is technocratic in nature. Honduras benefits from reduced trade costs (projected -3.2%). No major vested interests threatened, though illegal timber exporters may resist traceability links.",
    "dim5_investment": 1,
    "dim5_note": "EU contribution committed and PDCC live since Dec 2023; PDCC 2.0 co-financing IDB board-approved (RG-T4217). No funding gap. Supports D5 score 1 (secure).",
    "compositeScore": 9,
    "interactionType": "Complementary",
    "linkedProjectIds": ["HND1", "HND2"],
    "interactionNote": "PDCC complements HND1 by providing the regional export interoperability layer that SALH-certified timber will eventually feed into. Complementary to HND2 as customs modernisation and regulatory harmonisation both improve platform adoption.",
    "overallRisk": "Medium"
  },
  {
    "country": "GTM",
    "projectId": "GTM1",
    "projectName": "EU Global Gateway: Digital Inclusive Transition Initiative (GG-TDEI) — MSME Competitiveness and Trade Digitalisation",
    "projectType": "Global Gateway Team Europe digital economy initiative — MSME platform and trade digitalisation",
    "leadDonor": "EU (INTPA) / Team Europe — Germany (GIZ), Spain (COFIDES), Sweden (Swisscontact), IDB Lab, ITC. Five separate signed funding agreements totaling €73.32M: daBio TraDe €3.7M (GIZ), Conecta por Guatemala €48.5M (COFIDES), Desarrollo Económico Inclusivo €3.87M (Swisscontact), Wayfree Expansión €5M (IDB Lab), trade facilitation €12.25M (ITC).",
    "implementingAgency": "Ministry of Economy (MINECO) — the only Guatemalan government counterpart named in EU documentation, and only for the ITC trade-facilitation component (€12.25M). The other four components partner directly with private/financial-sector beneficiaries (FEDECOVERA cooperative, microfinance institutions, municipalities) with no government ministry named.",
    "gtmiTier": "B",
    "startDate": "06/01/2025",
    "endDate": "11/01/2029",
    "dim1_institutional": 1,
    "dim1_note": "Only one national counterpart (MINECO) is documented across all five components, and only for one of them. No inter-ministerial coordination requirement is described in either the EEAS press release or the EU's factsheet.",
    "dim2_regulatory": 2,
    "dim2_note": "The ITC trade-facilitation component requires developing a \"marco habilitante\" (enabling regulatory framework) to transition to an online single-window trade/investment system — secondary-level regulatory work, executable by executive action. No primary/congressional legislation requirement documented.",
    "dim3_technical": 2,
    "dim3_note": "Components build on existing infrastructure: GIZ's established INATrace tool, existing fintech/mobile-payment rails, expansion of the existing Wayfree connectivity network. The ITC component integrates MINECO's trade/investment services into an online single-window system — integration with 1–2 existing core systems, no new backbone.",
    "dim4_political": 2,
    "dim4_note": "EU EUDR-style traceability requirements in the daBio TraDe component increase compliance costs for exporters in priority value chains, which implies identifiable groups may face a relative disadvantage from the new burden.",
    "dim5_investment": 1,
    "dim5_note": "€73.32M total across 5 components. All five components have signed, dated financing agreements (GIZ/BMZ; COFIDES/FONPRODE-AECID; Swisscontact/Swedish Embassy; IDB Lab; ITC/Team Europe). No funding gap documented. Supports D5 score 1 (secure).",
    "compositeScore": 8,
    "interactionType": "Complementary",
    "linkedProjectIds": ["GTM2", "GTM3"],
    "interactionNote": "GTM1's trade-facilitation component (single-window enablement at MINECO) and GTM3's PDCC node (regional customs interoperability via MINECO/VUPE) both touch Guatemala's trade-digitalisation work at MINECO/VUPE and appear mutually reinforcing — a specific, named institutional overlap. GTM1's relationship to GTM2 is looser: both are concurrent Global Gateway digital-sector investments in Guatemala under the same country strategy, but run through entirely distinct agencies (MINECO vs. GAE) with no documented technical or institutional dependency between them.",
    "overallRisk": "Medium"
  },
  {
    "country": "GTM",
    "projectId": "GTM2",
    "projectName": "Digital Governance Enhancement in Guatemala (EU–Estonia eGA / Global Gateway)",
    "projectType": "Digital Public Administration & GovTech Enablers (Global Gateway)",
    "leadDonor": "EU (INTPA) — €2M grant; Team Europe (Estonia, e-Governance Academy/eGA)",
    "implementingAgency": "Comisión Presidencial de Gobierno Abierto y Electrónico (GAE)",
    "gtmiTier": "B",
    "startDate": "10/01/2025",
    "endDate": "03/01/2029",
    "dim1_institutional": 3,
    "dim1_note": "GAE is composed of representatives from at least five government bodies — Ministerio de Gobernación, SEGEPLAN, Ministerio de Relaciones Exteriores, Ministerio de Finanzas Públicas, and the Comisión Nacional Contra la Corrupción — per GAE's own 2024 relaunch coverage.",
    "dim2_regulatory": 2,
    "dim2_note": "One of the project's four stated outputs is a \"digital governance strategy + legal framework recommendations\" — regulatory development is a core deliverable, implying existing gaps. Project is advisory/TA in nature (recommendations, not direct legislation).",
    "dim3_technical": 1,
    "dim3_note": "Per eGA's own project page, this 42-month phase's four outputs are a digitalisation landscape review, a strategy/legal-framework recommendation, interoperability research, and capacity-building workshops — research and advisory work, not platform deployment.",
    "dim4_political": 3,
    "dim4_note": "Guatemala's CPI is 25/100 (2024, Transparency International) and the project sits in the transparency/governance domain (GAE includes the Comisión Nacional Contra la Corrupción; project explicitly framed around anti-corruption by both parties at signing).",
    "dim5_investment": 1,
    "dim5_note": "€2M EU grant, financing agreement signed 24 Sept 2025, full 42-month period funded — confirmed/secured, no funding gap documented. Supports D5 score 1 (secure).",
    "compositeScore": 10,
    "interactionType": "Complementary",
    "linkedProjectIds": ["GTM1", "GTM3"],
    "interactionNote": "GTM2's own primary source (eGA project page) describes this phase as research and strategy recommendations only, not platform delivery; there is no sourced basis for claims that GTM1 or GTM3 technically depend on a GTM2 deliverable. GTM1, GTM2, and GTM3 share a real, looser basis for Complementary classification — all three are concurrent EU Global Gateway digital-sector investments in Guatemala under the same country strategy, run through entirely distinct agencies (MINECO / GAE / SAT-VUPE-MAGA), with non-overlapping outputs. Classified Complementary on shared-policy-objective basis only — not on any specific technical handoff.",
    "overallRisk": "Medium"
  },
  {
    "country": "GTM",
    "projectId": "GTM3",
    "projectName": "PDCC Guatemala National Node — Central American Digital Trade Interoperability Platform (EU Global Gateway Regional Flagship; SIECA-managed)",
    "projectType": "Global Gateway regional flagship — PDCC / regional digital trade interoperability platform",
    "leadDonor": "EU (€8M original cooperation agreement, per EEAS 2016) + IDB co-financing (PDCC 2.0 expansion, RG-T4217, COMIECO-approved Dec 2022); administered via IDB, executed by SIECA as regional executing agency.",
    "implementingAgency": "SAT (Superintendencia de Administración Tributaria / Customs) + VUPE (Ventanilla Única para las Exportaciones, under MINECO) + Ministerio de Agricultura (MAGA) + Dirección General de Migración — confirmed via a documented 2023 Guatemala interinstitutional coordination meeting; national node operates within SIECA's regional governance framework.",
    "gtmiTier": "B",
    "startDate": "12/01/2022",
    "endDate": "12/01/2027",
    "dim1_institutional": 3,
    "dim1_note": "Guatemala's node requires coordination among at least four national agencies (SAT, VUPE, MAGA, Dirección General de Migración) plus SIECA's regional secretariat, confirmed via a documented interinstitutional coordination meeting.",
    "dim2_regulatory": 2,
    "dim2_note": "CAUCA IV and existing phytosanitary frameworks cover core PDCC functions; PDCC 2.0 requires COMIECO-level harmonisation of technical standards rather than new primary legislation.",
    "dim3_technical": 3,
    "dim3_note": "Requires integration of SAT's customs IT, VUPE's single window, MAGA's phytosanitary database, and Migration records with the SIECA regional hub; 24 of 71 planned regional functionalities are currently operational.",
    "dim4_political": 1,
    "dim4_note": "Available documentation frames PDCC as technocratic trade facilitation and regional interoperability; no vested-interest opposition was identified in sources reviewed for the Guatemala node specifically.",
    "dim5_investment": 1,
    "dim5_note": "EU-funded (€8M original cooperation, per EEAS), administered by IDB, executed by SIECA; PDCC 2.0 expansion co-financed by IDB (RG-T4217, COMIECO-approved Dec 2022). No funding gap documented for the Guatemala node. Supports D5 score 1 (secure).",
    "compositeScore": 10,
    "interactionType": "Complementary",
    "linkedProjectIds": ["GTM1", "GTM2"],
    "interactionNote": "GTM3's customs/VUPE interoperability work overlaps with GTM1's MINECO-based trade-facilitation/single-window component; both feed Guatemala's trade-digitalisation work at MINECO/VUPE and appear mutually reinforcing — a specific, named institutional overlap. GTM3's relationship to GTM2 is looser: both are concurrent Global Gateway digital-sector investments in Guatemala under the same country strategy, but run through entirely distinct agencies (SAT/VUPE/MAGA vs. GAE) with no documented technical dependency between them. The previously claimed dependency on GTM2's RENAP-based digital identity layer does not appear in either project's primary sources and is removed.",
    "overallRisk": "Medium"
  },
  {
    "country": "SLV",
    "projectId": "SLV1",
    "projectName": "Technical Assistance for the Digital Civil Registry System of El Salvador (EU-LAC Digital Alliance)",
    "projectType": "Digital Civil Registration & Identity Infrastructure (EU Technical Assistance)",
    "leadDonor": "EU (INTPA) / EU-LAC Digital Alliance (Global Gateway framework, EUR 172M total envelope)",
    "implementingAgency": "Altair Asesores (EU TA contractor) + Registro Nacional de Personas Naturales (RNPN) + Secretaria de Innovacion de la Presidencia",
    "gtmiTier": "B",
    "startDate": "03/01/2026",
    "endDate": "03/01/2029",
    "dim1_institutional": 2,
    "dim1_note": "Implementation is managed by Altair Asesores as EU TA contractor, working with RNPN and the Secretaria de Innovacion de la Presidencia. Coordination burden is moderate: two key national counterparts with a clear lead institution (RNPN) and EU Delegation oversight. No broad cross-ministerial coordination is required.",
    "dim2_regulatory": 2,
    "dim2_note": "RNPN operates under an established legal mandate and the REVFA civil records system already exists. Full digital interoperability and cross-border e-signature recognition require secondary legislation updates and full implementation of the Data Protection Law (Decreto 144/2024), whose implementing rules remain pending. Legal framework is largely in place but not yet complete.",
    "dim3_technical": 2,
    "dim3_note": "Primarily technical assistance for digitalisation and interoperability of the REVFA system, integration with the simple.sv government platform, and alignment with EU digital identity and e-signature standards. RNPN has already digitised 18 million historical records, so remaining work focuses on system consolidation and cross-border interoperability rather than new infrastructure build-out.",
    "dim4_political": 3,
    "dim4_note": "The May 2024 leak of 5.1 million Salvadorans personal data (including facial images) on the dark web raises the stakes for any centralised civil registry project. The Bukele government's track record of using data infrastructure for executive control adds scrutiny from civil society and IACHR. EU funding provides accountability safeguards but also creates international visibility and conditionality exposure.",
    "dim5_investment": 1,
    "dim5_note": "TA contract (~€1M) funded within the EU-LAC Digital Alliance €172M envelope; fully committed, no capital expenditure or sovereign debt. Supports D5 score 1 (secure).",
    "compositeScore": 10,
    "interactionType": "Complementary",
    "linkedProjectIds": ["SLV2", "SLV3"],
    "interactionNote": "SLV1 directly implements the civil digital registration component identified as a regulatory dependency in SLV2 (EU bilateral MIP), making the two complementary rather than conflicting. SLV3's BELLA connectivity backbone enables online civil registry services to reach citizens and institutions outside San Salvador. Together the three projects form an integrated EU digital governance and identity stack for El Salvador.",
    "overallRisk": "Medium"
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
    "dim5_note": "€49.5M bilateral grants committed 2021–24 plus €22M planned 2025–27 (not confirmed) and blended finance on top. ~31% of the declared envelope unconfirmed plus uncommitted private co-financing. Supports D5 score 3 (at risk).",
    "compositeScore": 13,
    "interactionType": "Governance-Conflicting",
    "linkedProjectIds": ["SLV1"],
    "interactionNote": "The EU and Team Europe require rule-of-law standards and transparency conditions, but SLV1 centralizes state data under the executive. The two can run side by side, but visible co-funding or shared platforms would put both sides in an uncomfortable position.",
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
    "dim5_investment": 3,
    "dim5_note": "EC contribution €13M over 48 months; RedCLARA to raise at least €15M more from governments, private companies and banks, not yet committed (~€28M total, ~46% gap). Supports D5 score 3 (at risk).",
    "compositeScore": 13,
    "interactionType": "Complementary",
    "linkedProjectIds": ["SLV2"],
    "interactionNote": "BELLA is the connectivity backbone that the EU's broader bilateral partnership (SLV2) needs to deliver digital services to schools, health centres, and public administration. Running SLV2 and SLV3 together reinforces both — they are designed to fit together inside Team Europe.",
    "overallRisk": "Medium"
  }
] as Project[];

const defaultSummaries: Record<CountryCode, string> = {
  GTM: "Guatemala's three Global Gateway digital investments — GG-TDEI (GTM1), the Estonia eGA governance project (GTM2), and the PDCC national node (GTM3) — are all classified Complementary. They share a common EU country strategy but operate through entirely distinct agencies: MINECO, GAE, and SAT/VUPE/MAGA respectively. The dominant coordination risk is the absence of any cross-portfolio oversight mechanism, not direct institutional competition. GTM1 and GTM3 share the clearest functional link through MINECO/VUPE's trade-digitalisation work.",
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
      sources: defaultSources,
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
      name: "dpi-dashboard-v7",
      skipHydration: true,
      merge: (persisted, current) => {
        const p = persisted as State;
        const seedIds = new Set(current.projects.map((pr) => pr.projectId));
        // Seed data always wins for built-in projects; preserve user-added ones.
        const userProjects = (p.projects ?? []).filter((pr) => !seedIds.has(pr.projectId));
        return {
          ...current,
          ...p,
          projects: [...current.projects, ...userProjects],
          sources: p.sources?.length ? p.sources : defaultSources,
        };
      },
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
