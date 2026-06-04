// Global ISO 3166 country catalog + alias resolution.
// Backed by `world-countries`. Use this instead of any hardcoded country list.

import raw from "world-countries";

export interface CountryMeta {
  cca3: string;
  cca2: string;
  ccn3: string; // ISO numeric (used by world-atlas topojson)
  name: string;
  official: string;
  region: string; // e.g. "Americas"
  subregion: string; // e.g. "Central America"
  altSpellings: string[];
  latlng: [number, number]; // [lat, lng] centroid
}

export const ALL_COUNTRIES: Record<string, CountryMeta> = {};
const NAME_INDEX: Record<string, string> = {}; // normalizedName -> cca3
const NUM_INDEX: Record<string, string> = {}; // ccn3 -> cca3

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripPrefixes(s: string): string {
  // "republic of kenya" -> "kenya", "kingdom of spain" -> "spain", "the gambia" -> "gambia"
  return s
    .replace(
      /^(the |republic of |kingdom of |state of |federal republic of |islamic republic of |people s republic of |democratic republic of |united republic of |commonwealth of |principality of |grand duchy of |sultanate of )+/i,
      ""
    )
    .trim();
}

for (const c of raw as any[]) {
  const meta: CountryMeta = {
    cca3: c.cca3,
    cca2: c.cca2,
    ccn3: c.ccn3,
    name: c.name.common,
    official: c.name.official,
    region: c.region || "Other",
    subregion: c.subregion || c.region || "Other",
    altSpellings: c.altSpellings || [],
  };
  ALL_COUNTRIES[c.cca3] = meta;
  if (c.ccn3) NUM_INDEX[c.ccn3] = c.cca3;

  const keys = new Set<string>();
  keys.add(c.cca2);
  keys.add(c.cca3);
  keys.add(c.name.common);
  keys.add(c.name.official);
  for (const a of c.altSpellings || []) keys.add(a);
  // Native names
  for (const v of Object.values(c.name.native || {}) as any[]) {
    if (v?.common) keys.add(v.common);
    if (v?.official) keys.add(v.official);
  }
  for (const k of keys) {
    if (!k) continue;
    const n = norm(String(k));
    if (n) NAME_INDEX[n] = c.cca3;
    const stripped = stripPrefixes(n);
    if (stripped && stripped !== n) NAME_INDEX[stripped] = c.cca3;
  }
}

// Common aliases / shorthand not always in altSpellings.
const ALIASES: Record<string, string> = {
  usa: "USA",
  us: "USA",
  "u s a": "USA",
  "u s": "USA",
  america: "USA",
  "united states": "USA",
  uk: "GBR",
  "u k": "GBR",
  britain: "GBR",
  "great britain": "GBR",
  england: "GBR",
  uae: "ARE",
  emirates: "ARE",
  drc: "COD",
  "dr congo": "COD",
  "congo kinshasa": "COD",
  "congo brazzaville": "COG",
  "south korea": "KOR",
  korea: "KOR",
  "north korea": "PRK",
  russia: "RUS",
  iran: "IRN",
  syria: "SYR",
  laos: "LAO",
  vietnam: "VNM",
  brunei: "BRN",
  taiwan: "TWN",
  vatican: "VAT",
  "ivory coast": "CIV",
  "cape verde": "CPV",
  "east timor": "TLS",
  swaziland: "SWZ",
  burma: "MMR",
  macedonia: "MKD",
  czech: "CZE",
  "czech republic": "CZE",
  holland: "NLD",
  "the netherlands": "NLD",
  palestine: "PSE",
};

/**
 * Resolve any free-form country string to a canonical ISO 3166-1 alpha-3 code.
 * Returns null if the input does not correspond to a real country.
 */
export function normalizeCountry(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (ALL_COUNTRIES[upper]) return upper; // already cca3

  const n = norm(trimmed);
  if (ALIASES[n]) return ALIASES[n];
  if (NAME_INDEX[n]) return NAME_INDEX[n];

  const stripped = stripPrefixes(n);
  if (ALIASES[stripped]) return ALIASES[stripped];
  if (NAME_INDEX[stripped]) return NAME_INDEX[stripped];

  // alpha-2 lookup
  if (trimmed.length === 2) {
    const hit = Object.values(ALL_COUNTRIES).find((c) => c.cca2 === upper);
    if (hit) return hit.cca3;
  }

  return null;
}

export function isoNumericToIso3(num: string | number): string | null {
  const k = String(num).padStart(3, "0");
  return NUM_INDEX[k] ?? null;
}

export function getCountryMeta(code: string): CountryMeta | null {
  return ALL_COUNTRIES[code] ?? null;
}

/**
 * Deterministic, theme-friendly accent color for any country.
 * Hue derived from the cca3 hash; saturation/lightness match the app palette.
 */
export function countryAccent(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `oklch(0.65 0.16 ${hue})`;
}
