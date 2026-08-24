/**
 * UN M49 country codes — the identifier system UN Comtrade uses.
 * Curated list of countries that matter for Indian export intelligence:
 * major destinations, major competitors, "World" aggregate.
 *
 * Format: [M49 numeric code, ISO-3 code, human name]
 */

export interface Country {
  m49: number;
  iso3: string;
  name: string;
}

// Reporter codes we care about (India + major destinations for Indian exports)
export const COUNTRIES: Country[] = [
  { m49: 0, iso3: "WLD", name: "World" }, // Aggregate — partner=0 means "all"
  { m49: 356, iso3: "IND", name: "India" },

  // Top destinations for Indian exports
  { m49: 842, iso3: "USA", name: "United States" },
  { m49: 784, iso3: "ARE", name: "United Arab Emirates" },
  { m49: 156, iso3: "CHN", name: "China" },
  { m49: 826, iso3: "GBR", name: "United Kingdom" },
  { m49: 276, iso3: "DEU", name: "Germany" },
  { m49: 528, iso3: "NLD", name: "Netherlands" },
  { m49: 50,  iso3: "BGD", name: "Bangladesh" },
  { m49: 702, iso3: "SGP", name: "Singapore" },
  { m49: 344, iso3: "HKG", name: "Hong Kong" },
  { m49: 56,  iso3: "BEL", name: "Belgium" },
  { m49: 682, iso3: "SAU", name: "Saudi Arabia" },
  { m49: 380, iso3: "ITA", name: "Italy" },
  { m49: 250, iso3: "FRA", name: "France" },
  { m49: 158, iso3: "TWN", name: "Taiwan" },
  { m49: 392, iso3: "JPN", name: "Japan" },
  { m49: 36,  iso3: "AUS", name: "Australia" },
  { m49: 124, iso3: "CAN", name: "Canada" },
  { m49: 764, iso3: "THA", name: "Thailand" },
  { m49: 458, iso3: "MYS", name: "Malaysia" },
  { m49: 704, iso3: "VNM", name: "Vietnam" },
  { m49: 360, iso3: "IDN", name: "Indonesia" },
  { m49: 620, iso3: "PRT", name: "Portugal" },
  { m49: 724, iso3: "ESP", name: "Spain" },
  { m49: 792, iso3: "TUR", name: "Turkey" },
  { m49: 76,  iso3: "BRA", name: "Brazil" },
  { m49: 484, iso3: "MEX", name: "Mexico" },
  { m49: 710, iso3: "ZAF", name: "South Africa" },
  { m49: 400, iso3: "JOR", name: "Jordan" },
  { m49: 512, iso3: "OMN", name: "Oman" },
  { m49: 634, iso3: "QAT", name: "Qatar" },
  { m49: 414, iso3: "KWT", name: "Kuwait" },
  { m49: 51,  iso3: "ARM", name: "Armenia" },
  { m49: 410, iso3: "KOR", name: "South Korea" },
  { m49: 100, iso3: "BGR", name: "Bulgaria" },
  { m49: 616, iso3: "POL", name: "Poland" },
  { m49: 203, iso3: "CZE", name: "Czechia" },
  { m49: 372, iso3: "IRL", name: "Ireland" },
  { m49: 208, iso3: "DNK", name: "Denmark" },
  { m49: 752, iso3: "SWE", name: "Sweden" },
  { m49: 604, iso3: "PER", name: "Peru" },
  { m49: 152, iso3: "CHL", name: "Chile" },
  { m49: 32,  iso3: "ARG", name: "Argentina" },
  { m49: 218, iso3: "ECU", name: "Ecuador" },
  { m49: 170, iso3: "COL", name: "Colombia" },
  { m49: 566, iso3: "NGA", name: "Nigeria" },
  { m49: 404, iso3: "KEN", name: "Kenya" },
  { m49: 231, iso3: "ETH", name: "Ethiopia" },
  { m49: 818, iso3: "EGY", name: "Egypt" },
  // ── DGCIS destinations ────────────────────────────────────────────────────
  // Added for India's own export statistics, which report ~184 destinations.
  // Against the curated list above, 138 of them had nowhere to land and a
  // third of India's export value by destination was being dropped on the
  // floor. These are the ones carrying real volume.
  //
  // CAVEAT, AND IT MATTERS: presence here means we can attribute TRADE DATA to
  // the destination. It does NOT mean the landed-cost stack covers it — duty
  // comes from WITS_REPORTERS in tariff/destination.ts, which is a separate
  // and smaller list. A country here but not there will show what India ships
  // it and nothing about what a buyer pays to land it.
  { m49: 368, iso3: "IRQ", name: "Iraq" },
  { m49: 64,  iso3: "BTN", name: "Bhutan" },
  { m49: 800, iso3: "UGA", name: "Uganda" },
  { m49: 834, iso3: "TZA", name: "Tanzania" },
  { m49: 524, iso3: "NPL", name: "Nepal" },
  { m49: 12,  iso3: "DZA", name: "Algeria" },
  { m49: 462, iso3: "MDV", name: "Maldives" },
  { m49: 434, iso3: "LBY", name: "Libya" },
  { m49: 887, iso3: "YEM", name: "Yemen" },
  { m49: 144, iso3: "LKA", name: "Sri Lanka" },
  { m49: 686, iso3: "SEN", name: "Senegal" },
  { m49: 180, iso3: "COD", name: "DR Congo" },
  { m49: 504, iso3: "MAR", name: "Morocco" },
  { m49: 608, iso3: "PHL", name: "Philippines" },
  { m49: 643, iso3: "RUS", name: "Russia" },
  { m49: 376, iso3: "ISR", name: "Israel" },
  { m49: 466, iso3: "MLI", name: "Mali" },
  { m49: 729, iso3: "SDN", name: "Sudan" },
  { m49: 894, iso3: "ZMB", name: "Zambia" },
  { m49: 300, iso3: "GRC", name: "Greece" },
  { m49: 430, iso3: "LBR", name: "Liberia" },
  { m49: 204, iso3: "BEN", name: "Benin" },
  { m49: 694, iso3: "SLE", name: "Sierra Leone" },
  { m49: 554, iso3: "NZL", name: "New Zealand" },
  { m49: 706, iso3: "SOM", name: "Somalia" },
  { m49: 270, iso3: "GMB", name: "Gambia" },
  { m49: 48,  iso3: "BHR", name: "Bahrain" },
  { m49: 288, iso3: "GHA", name: "Ghana" },
  { m49: 499, iso3: "MNE", name: "Montenegro" },
  { m49: 120, iso3: "CMR", name: "Cameroon" },
  { m49: 690, iso3: "SYC", name: "Seychelles" },
  { m49: 508, iso3: "MOZ", name: "Mozambique" },
  { m49: 642, iso3: "ROU", name: "Romania" },
  { m49: 324, iso3: "GIN", name: "Guinea" },
  { m49: 862, iso3: "VEN", name: "Venezuela" },
  { m49: 384, iso3: "CIV", name: "Cote d'Ivoire" },
  { m49: 328, iso3: "GUY", name: "Guyana" },
  { m49: 262, iso3: "DJI", name: "Djibouti" },
  { m49: 212, iso3: "DMA", name: "Dominica" },
  { m49: 348, iso3: "HUN", name: "Hungary" },
  { m49: 450, iso3: "MDG", name: "Madagascar" },
  { m49: 768, iso3: "TGO", name: "Togo" },
  { m49: 578, iso3: "NOR", name: "Norway" },
];

// Fast lookup by ISO3 or M49
const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso3, c]));
const BY_M49 = new Map(COUNTRIES.map((c) => [c.m49, c]));

export function findByIso(iso3: string): Country | undefined {
  return BY_ISO.get(iso3.toUpperCase());
}

export function findByM49(m49: number): Country | undefined {
  return BY_M49.get(m49);
}

/** Resolve a country identifier (ISO3, M49 number, or country name) to a Country. */
export function resolveCountry(id: string | number): Country | undefined {
  if (typeof id === "number") return findByM49(id);
  const s = id.trim();
  // Try ISO3 first
  const iso = findByIso(s);
  if (iso) return iso;
  // Try M49 number
  const n = Number(s);
  if (!isNaN(n)) return findByM49(n);
  // Fallback: case-insensitive name match
  const lower = s.toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === lower);
}
