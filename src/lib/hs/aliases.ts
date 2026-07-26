/**
 * Vernacular and vocabulary bridge for HS search.
 *
 * Two gaps this closes, both observed in testing:
 *
 * 1. VOCABULARY. HS descriptions are legal-formal. A manufacturer says "brass
 *    door handles"; the nomenclature says "mountings, fittings and similar
 *    articles, of base metal". No shared word, so keyword search finds nothing
 *    useful — it returned "Knives; with handles of base metal".
 *
 * 2. LANGUAGE. HS text is English only. A Hindi or Marathi product name has no
 *    lexical overlap at all, so search returned zero candidates for Devanagari
 *    input — the exact users the multilingual promise is aimed at.
 *
 * Entries map a term the user might actually type to the words the nomenclature
 * uses. Expansions are scored below the user's own words (see ALIAS_WEIGHT), so
 * they broaden recall without drowning out a literal match.
 *
 * Deliberately curated rather than exhaustive: aimed at India's real export
 * categories. Add to it when a lookup visibly fails — that is the signal.
 */

/**
 * Multi-word entries, matched against adjacent token pairs before single words.
 *
 * These exist because HS classifies many goods by FUNCTION, not material, and a
 * single-word match pulls the wrong way. "brass door handles" on word matches
 * alone lands in chapter 74 (raw copper alloy) because "brass" is literally in
 * those descriptions — when the correct home is 8302, builders' fittings.
 * A phrase is more specific evidence than either word, so it scores higher.
 */
export const PHRASE_ALIASES: Record<string, string[]> = {
  "door handle": ["mounting", "fitting", "door", "builder"],
  "door fitting": ["mounting", "fitting", "door", "builder"],
  "door hardware": ["mounting", "fitting", "door", "builder"],
  "cabinet handle": ["mounting", "fitting", "furniture"],
  "furniture fitting": ["mounting", "fitting", "furniture"],
  "furniture hardware": ["mounting", "fitting", "furniture"],
  "builder hardware": ["mounting", "fitting", "builder", "door"],
  "door lock": ["lock", "padlock", "door", "base", "metal"],
  "hand tool": ["hand", "tool"],
  "power tool": ["tool", "electro", "mechanical", "motor"],
  "auto part": ["vehicle", "part", "accessory"],
  "auto component": ["vehicle", "part", "accessory"],
  "spare part": ["part", "accessory"],
  "kitchen ware": ["kitchen", "tableware", "household"],
  "table ware": ["tableware", "kitchen", "household"],
  "cotton yarn": ["cotton", "yarn"],
  "leather bag": ["handbag", "case", "container", "leather"],
  "leather goods": ["leather", "case", "container", "article"],
  "precision component": ["machine", "part", "tool"],
  "machined component": ["machine", "part", "tool"],
  "essential oil": ["essential", "oil", "resinoid"],
  "basmati rice": ["rice", "cereal"],
};

/** Weight for a matched phrase — above a single-word alias, below a literal term. */
export const PHRASE_WEIGHT = 0.85;

/** Map of user term → nomenclature terms it should also match. */
export const ALIASES: Record<string, string[]> = {
  // ── Devanagari (Hindi / Marathi) ──────────────────────────────────────────
  "चमड़ा": ["leather"],
  "चमड़े": ["leather"],
  "कपड़ा": ["textile", "fabric", "woven"],
  "कपड़े": ["textile", "fabric", "apparel"],
  "बैग": ["bag", "case", "container", "handbag"],
  "थैला": ["bag", "sack", "container"],
  "जूता": ["footwear", "shoe"],
  "जूते": ["footwear", "shoe"],
  "हल्दी": ["turmeric", "curcuma", "spice"],
  "चावल": ["rice", "cereal"],
  "गेहूं": ["wheat", "cereal"],
  "मसाला": ["spice"],
  "मसाले": ["spice"],
  "चाय": ["tea"],
  "कॉफी": ["coffee"],
  "कपास": ["cotton"],
  "रेशम": ["silk"],
  "ऊन": ["wool"],
  "लकड़ी": ["wood", "timber"],
  "पीतल": ["copper", "zinc", "brass", "base", "metal"],
  "तांबा": ["copper"],
  "लोहा": ["iron", "steel"],
  "स्टील": ["steel", "iron"],
  "एल्युमिनियम": ["aluminium"],
  "प्लास्टिक": ["plastic", "polymer"],
  "रबर": ["rubber"],
  "कागज": ["paper"],
  "दवा": ["medicament", "pharmaceutical", "medicine"],
  "दवाई": ["medicament", "pharmaceutical"],
  "गहने": ["jewellery", "jewelry", "precious"],
  "आभूषण": ["jewellery", "jewelry", "precious"],
  "फर्नीचर": ["furniture", "seat"],
  "खिलौना": ["toy"],
  "खिलौने": ["toy"],
  "मशीन": ["machinery", "machine", "apparatus"],
  "चीनी": ["sugar"],
  "आम": ["mango"],
  "प्याज": ["onion"],
  "हस्तशिल्प": ["handicraft", "ornamental", "statuette"],
  "बर्तन": ["tableware", "kitchenware", "household"],
  "साड़ी": ["apparel", "textile", "woven"],

  // ── Romanised Hindi ───────────────────────────────────────────────────────
  chamda: ["leather"],
  kapda: ["textile", "fabric"],
  haldi: ["turmeric", "curcuma", "spice"],
  chawal: ["rice", "cereal"],
  masala: ["spice"],
  masale: ["spice"],
  peetal: ["copper", "zinc", "brass", "base", "metal"],
  loha: ["iron", "steel"],
  lakdi: ["wood", "timber"],
  bartan: ["tableware", "kitchenware", "household"],
  jeera: ["cumin", "spice"],
  dhania: ["coriander", "spice"],
  mirch: ["pepper", "chilli", "capsicum", "spice"],
  elaichi: ["cardamom", "spice"],
  saree: ["apparel", "textile", "woven"],
  sari: ["apparel", "textile", "woven"],

  // ── Materials: what people say vs what HS says ────────────────────────────
  brass: ["copper", "zinc", "base", "metal", "alloy"],
  bronze: ["copper", "tin", "base", "metal", "alloy"],
  gunmetal: ["copper", "alloy", "base", "metal"],
  ms: ["iron", "steel"],
  "mild-steel": ["iron", "steel"],
  ss: ["stainless", "steel"],
  stainless: ["stainless", "steel"],
  gi: ["galvanised", "iron", "steel", "zinc"],
  aluminum: ["aluminium"],
  alloy: ["alloy", "base", "metal"],
  fibre: ["fibre", "fiber", "textile"],
  fiber: ["fibre", "fiber", "textile"],
  leatherette: ["composition", "leather", "plastic"],
  jute: ["jute", "textile", "bast"],
  granite: ["granite", "stone", "monumental"],
  marble: ["marble", "stone", "travertine"],

  // ── Function words: fittings, hardware, fasteners ─────────────────────────
  handle: ["mounting", "fitting", "hardware"],
  handles: ["mounting", "fitting", "hardware"],
  knob: ["mounting", "fitting", "hardware"],
  hinge: ["mounting", "fitting", "hinge", "hardware"],
  hinges: ["mounting", "fitting", "hinge"],
  latch: ["mounting", "fitting", "lock", "clasp"],
  bolt: ["screw", "bolt", "fastener", "nut"],
  screw: ["screw", "bolt", "fastener"],
  nut: ["nut", "bolt", "fastener"],
  washer: ["washer", "fastener"],
  bracket: ["mounting", "fitting", "support"],
  fitting: ["mounting", "fitting"],
  fittings: ["mounting", "fitting"],
  hardware: ["mounting", "fitting", "base", "metal"],
  tap: ["tap", "cock", "valve"],
  faucet: ["tap", "cock", "valve"],
  valve: ["valve", "cock", "tap"],
  lock: ["lock", "padlock", "clasp"],

  // ── Apparel & textiles ────────────────────────────────────────────────────
  tshirt: ["shirt", "vest", "singlet", "knitted"],
  "t-shirt": ["shirt", "vest", "singlet", "knitted"],
  garment: ["apparel", "clothing"],
  garments: ["apparel", "clothing"],
  readymade: ["apparel", "clothing", "made"],
  hosiery: ["knitted", "crocheted", "sock", "stocking"],
  towel: ["towel", "toilet", "kitchen", "linen"],
  bedsheet: ["bed", "linen", "furnishing"],
  bedsheets: ["bed", "linen", "furnishing"],
  carpet: ["carpet", "floor", "covering"],
  rug: ["carpet", "floor", "covering"],

  // ── Engineering / auto ────────────────────────────────────────────────────
  cnc: ["machine", "machinery", "tool", "part"],
  machined: ["machine", "part", "tool"],
  "auto-parts": ["vehicle", "part", "accessory"],
  automobile: ["vehicle", "motor"],
  automotive: ["vehicle", "motor", "part"],
  bearing: ["bearing", "ball", "roller"],
  pump: ["pump", "liquid"],
  motor: ["motor", "engine", "electric"],
  forging: ["forged", "iron", "steel", "article"],
  casting: ["cast", "iron", "steel", "article"],

  // ── Agri & food ───────────────────────────────────────────────────────────
  basmati: ["rice", "cereal"],
  spices: ["spice"],
  pulses: ["leguminous", "dried", "vegetable"],
  lentil: ["leguminous", "dried", "vegetable"],
  groundnut: ["ground", "nut", "oil", "seed"],
  peanut: ["ground", "nut", "oil", "seed"],
  oilseed: ["oil", "seed"],
  shrimp: ["shrimp", "prawn", "crustacean"],
  prawn: ["shrimp", "prawn", "crustacean"],
  seafood: ["fish", "crustacean", "mollusc"],

  // ── Pharma / chemicals ────────────────────────────────────────────────────
  pharma: ["medicament", "pharmaceutical"],
  pharmaceutical: ["medicament", "pharmaceutical"],
  medicine: ["medicament", "pharmaceutical"],
  api: ["chemical", "organic", "compound"],
  dye: ["colouring", "dye", "pigment"],
  dyes: ["colouring", "dye", "pigment"],

  // ── Jewellery / handicraft ────────────────────────────────────────────────
  jewellery: ["jewellery", "precious", "metal"],
  jewelry: ["jewellery", "precious", "metal"],
  imitation: ["imitation", "jewellery"],
  idol: ["statuette", "ornament"],
  statue: ["statuette", "ornament"],
  handicraft: ["handicraft", "ornamental", "statuette", "wood"],
};

/**
 * Weight applied to terms introduced by an alias rather than typed by the user.
 * Below 1 so a literal description match still wins, high enough that a
 * vernacular-only query still finds the right family.
 */
export const ALIAS_WEIGHT = 0.55;

/** Look up expansions for a single already-lowercased token. */
export function aliasesFor(token: string): string[] | undefined {
  return ALIASES[token];
}

/** Look up expansions for an adjacent pair of tokens, e.g. "door handle". */
export function phraseAliasesFor(a: string, b: string): string[] | undefined {
  return PHRASE_ALIASES[`${a} ${b}`];
}
