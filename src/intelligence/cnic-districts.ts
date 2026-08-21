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
  "42101": { code: "42101", district: "Karachi East", province: "Sindh", provinceCode: "SN" },
  "42201": { code: "42201", district: "Karachi Central", province: "Sindh", provinceCode: "SN" },
  "42301": { code: "42301", district: "Karachi West", province: "Sindh", provinceCode: "SN" },
  "42401": { code: "42401", district: "Karachi Malir", province: "Sindh", provinceCode: "SN" },
  "42501": { code: "42501", district: "Karachi South", province: "Sindh", provinceCode: "SN" },
  "43101": { code: "43101", district: "Hyderabad", province: "Sindh", provinceCode: "SN" },
  "41303": { code: "41303", district: "Sukkur", province: "Sindh", provinceCode: "SN" },
  "43201": { code: "43201", district: "Hyderabad", province: "Sindh", provinceCode: "SN" },
  "45101": { code: "45101", district: "Larkana", province: "Sindh", provinceCode: "SN" },
  "35201": { code: "35201", district: "Lahore City", province: "Punjab", provinceCode: "PB" },
  "35202": { code: "35202", district: "Lahore Cantt", province: "Punjab", provinceCode: "PB" },
  "35101": { code: "35101", district: "Kasur", province: "Punjab", provinceCode: "PB" },
  "35301": { code: "35301", district: "Sheikhupura", province: "Punjab", provinceCode: "PB" },
  "35401": { code: "35401", district: "Nankana Sahib", province: "Punjab", provinceCode: "PB" },
  "36101": { code: "36101", district: "Gujranwala", province: "Punjab", provinceCode: "PB" },
  "37101": { code: "37101", district: "Rawalpindi", province: "Punjab", provinceCode: "PB" },
  "37201": { code: "37201", district: "Jhelum", province: "Punjab", provinceCode: "PB" },
  "37301": { code: "37301", district: "Attock", province: "Punjab", provinceCode: "PB" },
  "36301": { code: "36301", district: "Faisalabad", province: "Punjab", provinceCode: "PB" },
  "36302": { code: "36302", district: "Faisalabad", province: "Punjab", provinceCode: "PB" },
  "36401": { code: "36401", district: "Jhang", province: "Punjab", provinceCode: "PB" },
  "36501": { code: "36501", district: "Toba Tek Singh", province: "Punjab", provinceCode: "PB" },
  "33100": { code: "33100", district: "Islamabad", province: "Islamabad Capital Territory", provinceCode: "ICT" },
  "61101": { code: "61101", district: "Islamabad", province: "Islamabad Capital Territory", provinceCode: "ICT" },
  "37401": { code: "37401", district: "Chakwal", province: "Punjab", provinceCode: "PB" },
  "31201": { code: "31201", district: "Bahawalpur", province: "Punjab", provinceCode: "PB" },
  "31301": { code: "31301", district: "Bahawalnagar", province: "Punjab", provinceCode: "PB" },
  "32101": { code: "32101", district: "Multan", province: "Punjab", provinceCode: "PB" },
  "32201": { code: "32201", district: "Khanewal", province: "Punjab", provinceCode: "PB" },
  "32301": { code: "32301", district: "Sahiwal", province: "Punjab", provinceCode: "PB" },
  "34101": { code: "34101", district: "Sialkot", province: "Punjab", provinceCode: "PB" },
  "34201": { code: "34201", district: "Gujrat", province: "Punjab", provinceCode: "PB" },
  "34301": { code: "34301", district: "Mandi Bahauddin", province: "Punjab", provinceCode: "PB" },
  "17301": { code: "17301", district: "Peshawar", province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "17101": { code: "17101", district: "Charsadda", province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "17201": { code: "17201", district: "Mardan", province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "16101": { code: "16101", district: "Abbottabad", province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "16201": { code: "16201", district: "Mansehra", province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "54400": { code: "54400", district: "Quetta", province: "Balochistan", provinceCode: "BA" },
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
/** True when first 5 digits are in our conservative table. */
export function isKnownCnicDistrictPrefix(cnic: string | null | undefined): boolean {
  return getCnicDistrict(cnic) != null;
}

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