/**
 * Registered Sale Deed specific extractor.
 * Called by extractors.ts when documentType is REGISTERED_SALE_DEED.
 *
 * Sale Deeds are the most legally significant property document in Pakistan.
 * Extracts fields required for due diligence: parties, consideration, property
 * identification, registration details, witnesses, stamp duty, and any
 * cross-references to prior mutations.
 *
 * Handles English, Urdu (بائع, مشتری, قیمت), and Roman-Urdu variants.
 * Handles Punjab (VENDOR:/VENDEE: blocks), Sindh (FIRST PARTY/SECOND PARTY),
 * and KPK minimal formats.
 */

import type { RawField } from "./types";

function makeField(field: string, value: string, confidence = 0.85): RawField | null {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return { field, value: cleaned, confidence, page: 1, rawText: cleaned };
}

/**
 * Look up a labelled value on the same line.
 * Handles English labels and common Urdu / Roman-Urdu equivalents.
 */
function labelValue(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`${escaped}\\s*[:\\-]?\\s*([^\\n\\r]+)`, "i");
    const m = text.match(rx);
    if (m && m[1] && m[1].trim().length > 1) return m[1].trim();
  }
  return undefined;
}

export function extractSaleDeedFields(text: string): RawField[] {
  const out: (RawField | null)[] = [];

  // ============================================================
  // PARTIES: Vendor (Seller) and Vendee (Buyer)
  //
  // Three document layouts exist in Pakistani sale deeds:
  //
  // Punjab layout:
  //   VENDOR:
  //   Muhammad Ahmad Khan s/o Late Malik Bashir Khan
  //
  // Sindh layout:
  //   FIRST PARTY (VENDOR / بائع):
  //   Syed Kamran Hussain Rizvi s/o Late Syed Nasir Hussain
  //
  // KPK minimal:
  //   Vendor: Gul Muhammad Khan s/o Ajmal Khan
  //
  // Strategy: try most-specific pattern first. Section-block patterns
  // (label on own line, name on next line) are tried before inline patterns
  // to avoid matching "Vendee" mid-sentence in recital clauses like
  // "the Vendor has agreed to sell and the Vendee has agreed to purchase".
  // ============================================================

  // --- SELLER ---

  const vendorPatterns: RegExp[] = [
    // Punjab: "VENDOR:\n  Name s/o ..."
    /(?:^|\n)\s*(?:VENDOR|SELLER|TRANSFEROR)\s*[:\-]\s*\r?\n\s*(?:Mr\.?|Mrs\.?|Ms\.?|Syed|Mst\.?|Malik|Ch\.?|Chaudhry|Sheikh|Khan|Khawaja|Mian|Haji|Dr\.?|Advocate)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|\s+d\/o|\s+w\/o|,\s*CNIC|,\s*[Aa]ged|\r?\n)/m,
    // Sindh: "FIRST PARTY (VENDOR / ...):\n  Name s/o ..."
    /FIRST\s+PARTY[\s\S]{0,80}?[:\-]\s*\r?\n\s*(?:Mr\.?|Mrs\.?|Ms\.?|Syed|Mst\.?|Malik|Ch\.?|Chaudhry|Sheikh|Khan|Khawaja|Mian|Haji|Dr\.?|Advocate)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|\s+d\/o|\s+w\/o|,\s*CNIC|,\s*[Aa]ged|\r?\n)/m,
    // KPK inline: "Vendor: Name s/o ..." — only matches at line start to avoid mid-sentence
    /(?:^|\n)\s*(?:Vendor|Seller|Transferor)\s*[:\-]\s*(?:Mr\.?|Mrs\.?|Ms\.?|Syed|Mst\.?|Malik|Ch\.?|Chaudhry|Sheikh|Khan|Khawaja|Mian|Haji|Dr\.?|Advocate)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|\s+d\/o|\s+w\/o|,\s*CNIC|,\s*[Aa]ged)/m,
  ];

  for (const rx of vendorPatterns) {
    const m = text.match(rx);
    if (m?.[1]) {
      out.push(makeField("seller_name", m[1].trim(), 0.9));
      break;
    }
  }

  // Seller CNIC — search within 300 chars after first vendor/seller label
  const vendorCnicMatch = text.match(
    /(?:VENDOR|SELLER|FIRST\s+PARTY|Vendor|Seller)[\s\S]{0,300}?CNIC[\s#:]*(\d{5}-?\d{7}-?\d)/i
  );
  if (vendorCnicMatch?.[1]) {
    out.push(makeField("seller_cnic", vendorCnicMatch[1], 0.92));
  }

  // Seller father's name — s/o within 150 chars of vendor label
  const vendorFatherMatch = text.match(
    /(?:VENDOR|SELLER|FIRST\s+PARTY|Vendor|Seller)[\s\S]{0,200}?s\/o\s+(?:Mr\.?|Late|Malik|Ch\.?|Chaudhry|Sheikh|Khan|Khawaja|Mian|Haji|Syed)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+r\/o|,|\r?\n|CNIC)/i
  );
  if (vendorFatherMatch?.[1]) {
    out.push(makeField("seller_father_name", vendorFatherMatch[1].trim(), 0.85));
  }

  // --- BUYER ---

  const vendeePatterns: RegExp[] = [
    // Punjab: "VENDEE:\n  Name s/o ..."
    /(?:^|\n)\s*(?:VENDEE|BUYER|PURCHASER|TRANSFEREE)\s*[:\-]\s*\r?\n\s*(?:Mr\.?|Mrs\.?|Ms\.?|Syed|Mst\.?|Malik|Ch\.?|Chaudhry|Sheikh|Khan|Khawaja|Mian|Haji|Dr\.?|Advocate)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|\s+d\/o|\s+w\/o|,\s*CNIC|,\s*[Aa]ged|\r?\n)/m,
    // Sindh: "SECOND PARTY (VENDEE / ...):\n  Name s/o ..."
    /SECOND\s+PARTY[\s\S]{0,80}?[:\-]\s*\r?\n\s*(?:Mr\.?|Mrs\.?|Ms\.?|Syed|Mst\.?|Malik|Ch\.?|Chaudhry|Sheikh|Khan|Khawaja|Mian|Haji|Dr\.?|Advocate)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|\s+d\/o|\s+w\/o|,\s*CNIC|,\s*[Aa]ged|\r?\n)/m,
    // KPK inline: "Vendee: Name s/o ..." — only at line start
    /(?:^|\n)\s*(?:Vendee|Buyer|Purchaser|Transferee)\s*[:\-]\s*(?:Mr\.?|Mrs\.?|Ms\.?|Syed|Mst\.?|Malik|Ch\.?|Chaudhry|Sheikh|Khan|Khawaja|Mian|Haji|Dr\.?|Advocate)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|\s+d\/o|\s+w\/o|,\s*CNIC|,\s*[Aa]ged)/m,
  ];

  for (const rx of vendeePatterns) {
    const m = text.match(rx);
    if (m?.[1]) {
      out.push(makeField("buyer_name", m[1].trim(), 0.9));
      break;
    }
  }

  // Buyer CNIC — search within 300 chars after vendee/buyer label
  const vendeeCnicMatch = text.match(
    /(?:VENDEE|BUYER|PURCHASER|SECOND\s+PARTY|Vendee|Buyer|Purchaser)[\s\S]{0,300}?CNIC[\s#:]*(\d{5}-?\d{7}-?\d)/i
  );
  if (vendeeCnicMatch?.[1]) {
    out.push(makeField("buyer_cnic", vendeeCnicMatch[1], 0.92));
  }

  // Buyer father/husband name — s/o or w/o or d/o within vendee block
  const vendeeFatherMatch = text.match(
    /(?:VENDEE|BUYER|PURCHASER|SECOND\s+PARTY|Vendee|Buyer|Purchaser)[\s\S]{0,200}?(?:s\/o|w\/o|d\/o)\s+(?:Mr\.?|Late|Malik|Ch\.?|Chaudhry|Sheikh|Khan|Khawaja|Mian|Haji|Syed)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+r\/o|,|\r?\n|CNIC)/i
  );
  if (vendeeFatherMatch?.[1]) {
    out.push(makeField("buyer_father_name", vendeeFatherMatch[1].trim(), 0.85));
  }

  // ============================================================
  // FINANCIALS: Consideration, Stamp Duty, Registration Fee
  // ============================================================

  // Total consideration amount
  const considerationPatterns: RegExp[] = [
    /(?:total\s+sale\s+consideration|sale\s+consideration|consideration\s+amount|total\s+consideration|agreed\s+sale\s+consideration|قیمت\s+فروخت|قیمت)[\s\S]{0,80}?(?:PKR|Rs\.?|Rupees?|₨)\s*([\d,]+)/i,
    /(?:PKR|Rs\.?|₨)\s*([\d,]+)[\s\S]{0,40}?(?:as\s+(?:total\s+)?(?:sale\s+)?consideration|as\s+(?:full\s+and\s+final\s+)?payment)/i,
    /total\s+agreed\s+sale\s+consideration\s+is\s+(?:PKR|Rs\.?|₨)\s*([\d,]+)/i,
  ];
  for (const rx of considerationPatterns) {
    const m = text.match(rx);
    if (m?.[1]) {
      out.push(makeField("consideration_amount", `PKR ${m[1]}`, 0.92));
      break;
    }
  }

  // Consideration in words
  const wordsMatch = text.match(
    /Rupees?\s+([A-Za-z][A-Za-z\s]+?)\s+(?:[Oo]nly|\/-|=\/-)/
  );
  if (wordsMatch?.[1]) {
    out.push(makeField("consideration_in_words", wordsMatch[1].trim(), 0.88));
  }

  // Stamp duty
  // Three layouts:
  //   Punjab:  "Stamp Duty (3%): PKR 375,000"
  //   Sindh:   "stamp paper worth PKR 740,000 (Stamp Duty @ 4% Sindh)"
  //   Generic: "Stamp Paper of value Rs. X"
  const stampDutyPatterns: RegExp[] = [
    // Punjab: label then colon then amount
    /stamp\s+duty\s*(?:\([^)]*\))?\s*[:\-]\s*(?:PKR|Rs\.?|₨)\s*([\d,]+)/i,
    // Sindh: amount comes before the label in parentheses
    /stamp\s+paper\s+worth\s+(?:PKR|Rs\.?|₨)\s*([\d,]+)/i,
    // Generic fallback
    /stamp\s+paper\s+(?:of\s+)?value[\s\S]{0,20}?(?:PKR|Rs\.?|₨)\s*([\d,]+)/i,
  ];
  for (const rx of stampDutyPatterns) {
    const m = text.match(rx);
    if (m?.[1]) {
      out.push(makeField("stamp_duty_amount", `PKR ${m[1]}`, 0.90));
      break;
    }
  }

  // Registration fee
  const regFeeMatch = text.match(
    /registration\s+fee[\s\S]{0,50}?(?:PKR|Rs\.?|₨)\s*([\d,]+)/i
  );
  if (regFeeMatch?.[1]) {
    out.push(makeField("registration_fee", `PKR ${regFeeMatch[1]}`, 0.88));
  }

  // ============================================================
  // PROPERTY IDENTIFICATION
  // ============================================================

  // Khasra number
  const khasraMatch = text.match(/Khasra\s*(?:No)?[\s.:#]*([\w/,-]+)/i);
  if (khasraMatch?.[1]) {
    out.push(makeField("property_khasra", khasraMatch[1], 0.9));
  }

  // Khewat number
  const khewatMatch = text.match(/Khewat\s*(?:No)?[\s.:#]*([\w/,-]+)/i);
  if (khewatMatch?.[1]) {
    out.push(makeField("property_khewat", khewatMatch[1], 0.9));
  }

  // Khatooni number
  const khatooniMatch = text.match(/Khato[on]i\s*(?:No)?[\s.:#]*([\w/,-]+)/i);
  if (khatooniMatch?.[1]) {
    out.push(makeField("property_khatooni", khatooniMatch[1], 0.9));
  }

  // Plot number
  const plotMatch = text.match(
    /Plot\s*(?:No)?[\s.:#]*([A-Za-z0-9\-\/]{1,15})(?=\s+(?:Block|Sector|Phase|Street|,|\n))/i
  );
  if (plotMatch?.[1]) {
    out.push(makeField("property_plot_number", plotMatch[1], 0.9));
  }

  // Area (Marla, Kanal, Sq Yards, Sq Ft)
  const areaMatch = text.match(
    /(?:measuring|area|total\s+area|رقبہ|Raqba)[\s\S]{0,20}?(\d+(?:\.\d+)?)\s*(marla|kanal|kanaal|square\s+yards?|sq\.?\s*yd\.?|square\s+feet|sq\.?\s*ft\.?)/i
  );
  if (areaMatch?.[1]) {
    out.push(makeField("property_area", `${areaMatch[1]} ${areaMatch[2].trim()}`, 0.9));
  }

  // Property address
  const addressPatterns: RegExp[] = [
    /(?:property\s+(?:described|situated|located|being\s+sold)\s+(?:at|as)|situated\s+at)[\s\S]{0,20}?[:\-]?\s*([^\n\r]{20,250}?)(?=\.|\n\n|\bmeasuring\b|\bbounded\b)/i,
  ];
  for (const rx of addressPatterns) {
    const m = text.match(rx);
    if (m?.[1]) {
      out.push(makeField("property_address", m[1].trim(), 0.85));
      break;
    }
  }

  // Boundaries
  const boundariesMatch = text.match(
    /(?:boundaries|hudood|حدود)[\s\S]{0,20}?[:\-]\s*((?:north|south|east|west|شمال|جنوب|مشرق|مغرب)[\s\S]{20,400}?)(?=\n\n|\bregistered\b|\bwitness\b)/i
  );
  if (boundariesMatch?.[1]) {
    out.push(makeField("property_boundaries", boundariesMatch[1].replace(/\s+/g, " ").trim(), 0.8));
  }

  // ============================================================
  // REGISTRATION DETAILS
  // ============================================================

  // Registration number
  const regNumberPatterns: RegExp[] = [
    /Registration\s+(?:No|Number)\s*[:\-]?\s*([\w\/\-]+)/i,
    /Book[-\s]*I\s+Volume\s+(\d+)\s+Page\s+(\d+)\s+Serial\s+(\d+)/i,
  ];
  for (const rx of regNumberPatterns) {
    const m = text.match(rx);
    if (m) {
      const value = m.length >= 4 ? `Book-I Volume ${m[1]} Page ${m[2]} Serial ${m[3]}` : m[1];
      out.push(makeField("registration_number", value, 0.92));
      break;
    }
  }

  // Registration date
  const regDateMatch = text.match(
    /(?:date\s+of\s+registration|registration\s+date)\s*[:\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})/i
  );
  if (regDateMatch?.[1]) {
    out.push(makeField("registration_date", regDateMatch[1], 0.9));
  }

  // Sub-Registrar office
  const subRegistrarMatch = text.match(
    /(?:Sub-?Registrar|Office\s+of\s+the\s+Sub-?Registrar)[\s.,:]+([A-Z][A-Za-z\s\-]+?)(?=[,.\n]|District|Tehsil)/i
  );
  if (subRegistrarMatch?.[1]) {
    out.push(makeField("sub_registrar_office", subRegistrarMatch[1].trim(), 0.88));
  }

  // Execution date
  const execDateMatch = text.match(
    /(?:executed\s+on\s+this|Execution\s+Date|Executed\s+on)\s*[:\-]?\s*(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i
  );
  if (execDateMatch?.[1]) {
    out.push(makeField("execution_date", execDateMatch[1], 0.88));
  }

  // ============================================================
  // WITNESSES (Registration Act 1908 §32 requires two)
  // ============================================================

  // Witness 1 name
  const witness1Patterns: RegExp[] = [
    /Witness\s*(?:No\.?)?\s*[1I]\s*[:\-]?\s*\r?\n\s*(?:Mr\.?|Mrs\.?|Ms\.?|Advocate|Syed|Malik|Ch\.?|Sheikh|Khan)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|,|\r?\n|CNIC)/m,
    /Witness\s*(?:No\.?)?\s*[1I]\s*[:\-]\s*(?:Mr\.?|Mrs\.?|Ms\.?|Advocate|Syed|Malik|Ch\.?|Sheikh|Khan)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|,|\r?\n|CNIC)/i,
  ];
  for (const rx of witness1Patterns) {
    const m = text.match(rx);
    if (m?.[1]) {
      out.push(makeField("witness_1_name", m[1].trim(), 0.85));
      break;
    }
  }

  const witness1CnicMatch = text.match(
    /Witness\s*(?:No\.?)?\s*[1I][\s\S]{0,200}?CNIC[\s#:]*(\d{5}-?\d{7}-?\d)/i
  );
  if (witness1CnicMatch?.[1]) {
    out.push(makeField("witness_1_cnic", witness1CnicMatch[1], 0.85));
  }

  // Witness 2 name
  const witness2Patterns: RegExp[] = [
    /Witness\s*(?:No\.?)?\s*(?:2|II)\s*[:\-]?\s*\r?\n\s*(?:Mr\.?|Mrs\.?|Ms\.?|Advocate|Syed|Malik|Ch\.?|Sheikh|Khan)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|,|\r?\n|CNIC)/m,
    /Witness\s*(?:No\.?)?\s*(?:2|II)\s*[:\-]\s*(?:Mr\.?|Mrs\.?|Ms\.?|Advocate|Syed|Malik|Ch\.?|Sheikh|Khan)?\s*([A-Z][A-Za-z\s.]+?)(?=\s+s\/o|,|\r?\n|CNIC)/i,
  ];
  for (const rx of witness2Patterns) {
    const m = text.match(rx);
    if (m?.[1]) {
      out.push(makeField("witness_2_name", m[1].trim(), 0.85));
      break;
    }
  }

  const witness2CnicMatch = text.match(
    /Witness\s*(?:No\.?)?\s*(?:2|II)[\s\S]{0,200}?CNIC[\s#:]*(\d{5}-?\d{7}-?\d)/i
  );
  if (witness2CnicMatch?.[1]) {
    out.push(makeField("witness_2_cnic", witness2CnicMatch[1], 0.85));
  }

  // ============================================================
  // PRIOR MUTATION / CROSS-REFERENCES
  // ============================================================

  // Prior mutation number referenced in the deed
  const mutationMatch = text.match(
    /(?:Mutation|Intiqal|انتقال)\s*(?:No\.?|Number)?\s*[\s.:#]*([\w\/\-]+)/i
  );
  if (mutationMatch?.[1]) {
    out.push(makeField("prior_mutation_number", mutationMatch[1], 0.85));
  }

  // Fard reference
  const fardMatch = text.match(
    /(?:Fard|فرد)\s*(?:No\.?|Number)?\s*[\s.:#]*([\w\/\-]+)/i
  );
  if (fardMatch?.[1]) {
    out.push(makeField("fard_reference", fardMatch[1], 0.82));
  }

  // ============================================================
  // ADDITIONAL LABEL-BASED FIELDS
  // ============================================================

  const tehsil = labelValue(text, ["Tehsil", "تحصیل"]);
  if (tehsil) out.push(makeField("tehsil", tehsil, 0.85));

  const district = labelValue(text, ["District", "ضلع"]);
  if (district) out.push(makeField("district", district, 0.85));

  const province = labelValue(text, ["Province", "صوبہ"]);
  if (province) out.push(makeField("province", province, 0.85));

  const society = labelValue(text, [
    "Housing Scheme",
    "Housing Society",
    "Society",
    "Colony",
    "Phase",
  ]);
  if (society) out.push(makeField("housing_scheme", society, 0.82));

  // ============================================================
  // RETURN
  // ============================================================

  return out.filter((f): f is RawField => f !== null);
}