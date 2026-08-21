/**
 * CNIC district lookup.
 *
 * Pakistani CNICs use the format XXXXX-XXXXXXX-X where the first 5 digits
 * encode the issuing district following the NADRA system.
 *
 * This table is INTENTIONALLY conservative - only the 8 codes we can
 * verify against the codebase's existing LLM prompt (llm-extractor.ts).
 * Unknown codes return null (silent gap policy - better than wrong labels).
 *
 * Coverage priorities for future expansion:
 * - Islamabad (61101 vs 38403 conflict - needs verification)
 * - All Punjab districts beyond Lahore/Faisalabad
 * - All Sindh districts beyond Karachi
 * - KP beyond Peshawar
 * - Balochistan, ICT, AJK, GB
 *
 * Pure function, no external dependencies.
 */

export type CnicDistrict = {
  /** The 5-digit district code (e.g. "42501") */
  code: string;
  /** Human-readable district name (e.g. "Karachi South") */
  district: string;
  /** Human-readable province name (e.g. "Sindh") */
  province: string;
  /** Two-letter province code (e.g. "SN") */
  provinceCode: string;
};

/**
 * Static lookup table. Keys are 5-digit codes.
 * Verified against existing LLM prompt (llm-extractor.ts L57-62).
 */
const DISTRICT_TABLE: Record<string, CnicDistrict> = {
  // ============================================================
  // SINDH (province digit 4) - Karachi metro
  // ============================================================
  "42101": { code: "42101", district: "Karachi East",    province: "Sindh",  provinceCode: "SN" },
  "42201": { code: "42201", district: "Karachi Central", province: "Sindh",  provinceCode: "SN" },
  "42301": { code: "42301", district: "Karachi West",    province: "Sindh",  provinceCode: "SN" },
  "42501": { code: "42501", district: "Karachi South",   province: "Sindh",  provinceCode: "SN" },

  // ============================================================
  // PUNJAB (province digit 3) - Lahore + Faisalabad
  // ============================================================
  "35201": { code: "35201", district: "Lahore City",     province: "Punjab", provinceCode: "PB" },
  "35202": { code: "35202", district: "Lahore Cantt",    province: "Punjab", provinceCode: "PB" },
  "36302": { code: "36302", district: "Faisalabad",      province: "Punjab", provinceCode: "PB" },

  // ============================================================
  // KHYBER PAKHTUNKHWA (province digit 1)
  // ============================================================
  "17301": { code: "17301", district: "Peshawar",        province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
};

/**
 * Extract the first 5 digits from a CNIC and look up the district.
 *
 * Accepts CNICs in either format:
 *   - "42501-1469471-9" (with dashes)
 *   - "4250114694719"   (no dashes)
 *
 * @param cnic The CNIC string to look up
 * @returns CnicDistrict if found, null if the code is unknown or input is invalid
 */
export function getCnicDistrict(cnic: string | null | undefined): CnicDistrict | null {
  if (!cnic || typeof cnic !== "string") return null;

  // Strip dashes and whitespace, extract first 5 digits
  const digits = cnic.replace(/[^0-9]/g, "");
  if (digits.length < 5) return null;

  const code = digits.substring(0, 5);
  return DISTRICT_TABLE[code] ?? null;
}

/**
 * Get all known districts for a given province.
 * Useful for validation UIs or debugging.
 *
 * @param provinceCode Two-letter province code (SN, PB, KP)
 * @returns Array of matching CnicDistrict entries
 */
export function getDistrictsByProvince(provinceCode: string): CnicDistrict[] {
  return Object.values(DISTRICT_TABLE).filter(d => d.provinceCode === provinceCode);
}

/**
 * Debug helper: total number of districts in the table.
 * Useful for monitoring coverage as we grow the table.
 */
export function getDistrictTableSize(): number {
  return Object.keys(DISTRICT_TABLE).length;
}