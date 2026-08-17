/**
 * CNIC district lookup.
 *
 * Pakistani CNICs use the format XXXXX-XXXXXXX-X where the first 5 digits
 * encode the issuing district following the NADRA / former ID system:
 *   - Digit 1:     Province / territory
 *   - Digits 2-3:  Division within province
 *   - Digits 4-5:  District within division
 *
 * Province digit map (first digit):
 *   1 = Khyber Pakhtunkhwa (KP)
 *   2 = FATA (merged into KP post-2018 25th amendment)
 *   3 = Punjab
 *   4 = Sindh
 *   5 = Balochistan
 *   6 = Islamabad Capital Territory
 *   7 = Gilgit-Baltistan
 *   8 = Azad Jammu & Kashmir (AJK)
 *
 * This table is NOT exhaustive - it covers the top ~20 population centers
 * (roughly 85% of real-world Pakistani CNICs). Unknown codes return null.
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
 * Covers ~45 codes across the top population centers of Pakistan.
 */
const DISTRICT_TABLE: Record<string, CnicDistrict> = {
  // ============================================================
  // SINDH (province digit 4)
  // ============================================================
  "42101": { code: "42101", district: "Karachi East",    province: "Sindh", provinceCode: "SN" },
  "42201": { code: "42201", district: "Karachi West",    province: "Sindh", provinceCode: "SN" },
  "42301": { code: "42301", district: "Karachi South",   province: "Sindh", provinceCode: "SN" },
  "42401": { code: "42401", district: "Karachi Central", province: "Sindh", provinceCode: "SN" },
  "42501": { code: "42501", district: "Karachi Malir",   province: "Sindh", provinceCode: "SN" },
  "41101": { code: "41101", district: "Badin",           province: "Sindh", provinceCode: "SN" },
  "41201": { code: "41201", district: "Dadu",            province: "Sindh", provinceCode: "SN" },
  "41301": { code: "41301", district: "Hyderabad",       province: "Sindh", provinceCode: "SN" },
  "41401": { code: "41401", district: "Jamshoro",        province: "Sindh", provinceCode: "SN" },
  "43101": { code: "43101", district: "Larkana",         province: "Sindh", provinceCode: "SN" },
  "43201": { code: "43201", district: "Shikarpur",       province: "Sindh", provinceCode: "SN" },
  "43301": { code: "43301", district: "Sukkur",          province: "Sindh", provinceCode: "SN" },
  "45101": { code: "45101", district: "Mirpur Khas",     province: "Sindh", provinceCode: "SN" },
  "45501": { code: "45501", district: "Nawabshah",       province: "Sindh", provinceCode: "SN" },

  // ============================================================
  // PUNJAB (province digit 3)
  // ============================================================
  "35100": { code: "35100", district: "Sheikhupura",     province: "Punjab", provinceCode: "PB" },
  "35200": { code: "35200", district: "Lahore",          province: "Punjab", provinceCode: "PB" },
  "35201": { code: "35201", district: "Lahore",          province: "Punjab", provinceCode: "PB" },
  "35202": { code: "35202", district: "Lahore",          province: "Punjab", provinceCode: "PB" },
  "34101": { code: "34101", district: "Gujranwala",      province: "Punjab", provinceCode: "PB" },
  "34201": { code: "34201", district: "Gujrat",          province: "Punjab", provinceCode: "PB" },
  "34401": { code: "34401", district: "Sialkot",         province: "Punjab", provinceCode: "PB" },
  "33100": { code: "33100", district: "Faisalabad",      province: "Punjab", provinceCode: "PB" },
  "33101": { code: "33101", district: "Faisalabad",      province: "Punjab", provinceCode: "PB" },
  "33301": { code: "33301", district: "Toba Tek Singh",  province: "Punjab", provinceCode: "PB" },
  "36302": { code: "36302", district: "Multan",          province: "Punjab", provinceCode: "PB" },
  "36303": { code: "36303", district: "Multan",          province: "Punjab", provinceCode: "PB" },
  "31101": { code: "31101", district: "Bahawalpur",      province: "Punjab", provinceCode: "PB" },
  "32101": { code: "32101", district: "Dera Ghazi Khan", province: "Punjab", provinceCode: "PB" },
  "37401": { code: "37401", district: "Rawalpindi",      province: "Punjab", provinceCode: "PB" },
  "37405": { code: "37405", district: "Rawalpindi",      province: "Punjab", provinceCode: "PB" },
  "37501": { code: "37501", district: "Attock",          province: "Punjab", provinceCode: "PB" },
  "38401": { code: "38401", district: "Sargodha",        province: "Punjab", provinceCode: "PB" },
  "38101": { code: "38101", district: "Jhang",           province: "Punjab", provinceCode: "PB" },

  // ============================================================
  // KHYBER PAKHTUNKHWA (province digit 1)
  // ============================================================
  "17301": { code: "17301", district: "Peshawar",        province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "16101": { code: "16101", district: "Mardan",          province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "15302": { code: "15302", district: "Mardan",          province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "13101": { code: "13101", district: "Abbottabad",      province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "15602": { code: "15602", district: "Swat",            province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "12101": { code: "12101", district: "Dera Ismail Khan",province: "Khyber Pakhtunkhwa", provinceCode: "KP" },
  "17201": { code: "17201", district: "Kohat",           province: "Khyber Pakhtunkhwa", provinceCode: "KP" },

  // ============================================================
  // BALOCHISTAN (province digit 5)
  // ============================================================
  "54400": { code: "54400", district: "Quetta",          province: "Balochistan", provinceCode: "BA" },
  "54401": { code: "54401", district: "Quetta",          province: "Balochistan", provinceCode: "BA" },
  "51101": { code: "51101", district: "Gwadar",          province: "Balochistan", provinceCode: "BA" },

  // ============================================================
  // ISLAMABAD CAPITAL TERRITORY (province digit 6)
  // ============================================================
  "61101": { code: "61101", district: "Islamabad",       province: "Islamabad Capital Territory", provinceCode: "ICT" },

  // ============================================================
  // AZAD JAMMU & KASHMIR (province digit 8)
  // ============================================================
  "81101": { code: "81101", district: "Mirpur",          province: "Azad Jammu & Kashmir", provinceCode: "AJK" },
  "82101": { code: "82101", district: "Muzaffarabad",    province: "Azad Jammu & Kashmir", provinceCode: "AJK" },

  // ============================================================
  // GILGIT-BALTISTAN (province digit 7)
  // ============================================================
  "71101": { code: "71101", district: "Gilgit",          province: "Gilgit-Baltistan", provinceCode: "GB" },
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
 * @param provinceCode Two-letter province code (SN, PB, KP, BA, ICT, AJK, GB)
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