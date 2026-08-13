/**
 * LLM-based structured extractor.
 *
 * After OCR extracts raw text, this asks Gemini to intelligently identify
 * key fields (parties, amounts, addresses, dates, etc.) with
 * document-type-aware prompts.
 *
 * Post-processing: every LLM response is validated for CNIC integrity.
 * Fabricated CNICs are stripped, altered CNICs are corrected against OCR,
 * and dropped CNICs are surfaced for user review.
 */

import { GoogleGenAI } from "@google/genai";
import { applyCnicValidation } from "./cnic-validator";
import { cacheGet, cacheSet } from "./llm-cache";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-pro-latest"];

export type SmartFields = {
  parties?: any;
  financials?: any;
  property?: any;
  dates?: any;
  legal?: any;
  clauses?: any;
  summary?: string;
  extractionEngine?: string;
  extractionModel?: string;
  extractionError?: string;
  _cnicValidation?: {
    verified: number;
    hallucinated: number;
    altered: number;
    droppedByLlm: number;
    summary: string;
  };
};

const CORE_RULES = `You are an expert legal-document analyser specialising in Pakistani property, tenancy and identity documents. Your job is to extract structured fields from the OCR text below and return STRICT JSON.

CORE PRINCIPLE: Extract everything you can clearly see. Be thorough and helpful. Only apply strict caution to CNICs specifically (see rule 2).

RULES:

1. EXTRACT EVERYTHING VISIBLE: If a name, amount, date, address, or clause is written in the text, include it. Do not skip visible information because you are unsure about ONE sub-detail.

2. CNIC SAFETY (CRITICAL): CNICs are unique identifiers where a wrong digit means a wrong person - potentially causing legal or financial harm.
   - Only include a CNIC if it appears EXACTLY (character-for-character) in the source OCR text.
   - If a party's CNIC is not visible, OMIT ONLY THE cnic sub-field. Still return the party's name, role, address, and any other visible details.
   - Never "correct", "guess", or "clean up" CNIC digits. Never invent one to fill the schema.

3. PARTIES: List every person/party mentioned. A landlord with a name but no CNIC is still a landlord - return them with the cnic field omitted. Include witnesses, guarantors, co-signers in the witnesses or additional_parties arrays. Do not drop anyone.

4. AMOUNTS: Extract numeric value (no commas) plus currency code. If the amount is visible in the document, include it.

5. DATES: Use ISO YYYY-MM-DD format. Distinguish DOB (date of birth on a CNIC) from execution/signing dates. If a date is visible in the document, include it.

6. ADDRESSES: If an address is written, include it. Full or partial is fine.

7. HANDWRITTEN or URDU DOCS: Use context clues to identify roles. Common role indicators include: S/o, D/o, W/o for son/daughter/wife of; malik or malkiat for owner; mustajir or kirayadar for tenant; baye or vendor for seller; mushtari or vendee for buyer. When a role is truly unclear, put the party in additional_parties with role "unknown" - but still include their name and other visible details.

8. OMIT ONLY WHEN TRULY ABSENT: If a field is genuinely not present in the text, omit it. But err on the side of extraction - if information IS in the text, include it.

9. Return ONLY the JSON object. No markdown fences, no commentary.

`;

const SCHEMAS: Record<string, string> = {

  TENANCY_AGREEMENT: `This is a TENANCY AGREEMENT (rental contract). Extract:
{
  "parties": {
    "landlord": { "name": "...", "cnic": "XXXXX-XXXXXXX-X", "phone": "...", "address": "..." },
    "tenant":   { "name": "...", "cnic": "...", "phone": "...", "address": "..." },
    "witnesses": [{ "name": "...", "cnic": "..." }],
    "additional_parties": [{ "role": "co-tenant/guarantor/other", "name": "...", "cnic": "..." }]
  },
  "financials": {
    "monthly_rent":     { "amount": 35000, "currency": "PKR" },
    "security_deposit": { "amount": 70000, "currency": "PKR" },
    "advance_rent":     { "amount": 0,     "currency": "PKR" },
    "maintenance_charges": { "amount": 0, "currency": "PKR", "note": "who pays" },
    "utility_charges": "who pays electricity/gas/water (tenant/landlord/shared)"
  },
  "property": {
    "address": "Full one-line address as written",
    "type": "House / Flat / Shop / Office / etc.",
    "area": "e.g. 5 marla or 1200 sq ft",
    "furnishing": "furnished / semi-furnished / unfurnished",
    "purpose": "residential / commercial / mixed"
  },
  "dates": {
    "start_date": "YYYY-MM-DD (if the start date field is blank but execution_date and duration_months are known, calculate it: start_date = execution_date)",
    "end_date": "YYYY-MM-DD (if blank but execution_date and duration are known, calculate: end_date = execution_date + duration_months)",
    "execution_date": "YYYY-MM-DD (the date the agreement was signed/executed, often in the header or preamble)",
    "duration_months": 11,
    "dates_inferred": "true if start/end dates were calculated from execution_date + duration rather than explicitly written"
  },
  "clauses": {
    "rent_payment_period": "e.g. 1st to 10th of each month",
    "rent_escalation": "e.g. 10% increase after 1 year",
    "renewal_terms": "e.g. renewable by mutual agreement",
    "notice_period_days": 30,
    "deposit_refund_terms": "e.g. refundable without interest on vacation",
    "termination_penalties": "e.g. one month rent forfeit"
  },
  "legal": {
    "applicable_law": "e.g. Sindh Rented Premises Ordinance 1979",
    "stamp_paper_value": "e.g. Rs 100",
    "jurisdiction_city": "e.g. Karachi"
  },
  "summary": "One-sentence plain-English summary"
}`,

  REGISTERED_SALE_DEED: `This is a REGISTERED SALE DEED (final property transfer, registered with Sub-Registrar). Extract:
{
  "parties": {
    "seller": { "name": "...", "father_name": "...", "cnic": "...", "address": "..." },
    "buyer":  { "name": "...", "father_name": "...", "cnic": "...", "address": "..." },
    "witnesses": [{ "name": "...", "cnic": "...", "address": "..." }],
    "additional_parties": []
  },
  "financials": {
    "total_price":      { "amount": 5000000, "currency": "PKR", "in_words": "..." },
    "stamp_duty":       { "amount": 0, "currency": "PKR", "percentage": "e.g. 3%" },
    "registration_fee": { "amount": 0, "currency": "PKR" },
    "cvt":              { "amount": 0, "currency": "PKR", "percentage": "e.g. 2%" }
  },
  "property": {
    "address": "Full one-line address",
    "type": "Plot / House / Flat / Commercial / Agricultural / etc.",
    "area": "e.g. 10 marla, 1 kanal, 240 sq yd",
    "plot_number": "...",
    "khasra_number": "...",
    "khewat_number": "...",
    "khatooni_number": "...",
    "boundaries": { "north": "...", "south": "...", "east": "...", "west": "..." }
  },
  "dates": {
    "execution_date": "YYYY-MM-DD",
    "registration_date": "YYYY-MM-DD"
  },
  "legal": {
    "sub_registrar_office": "e.g. Cantt Lahore",
    "registration_number": "e.g. Book-I Volume 42 Page 156 Serial 2847",
    "prior_mutation_number": "if referenced",
    "jurisdiction_district": "e.g. Lahore"
  },
  "summary": "One-sentence summary of the transfer"
}`,

  AGREEMENT_TO_SELL: `This is a BAYANA / AGREEMENT TO SELL (token/earnest money promise before final Sale Deed). Extract:
{
  "parties": {
    "seller": { "name": "...", "father_name": "...", "cnic": "...", "address": "..." },
    "buyer":  { "name": "...", "father_name": "...", "cnic": "...", "address": "..." },
    "witnesses": [{ "name": "...", "cnic": "..." }],
    "additional_parties": []
  },
  "financials": {
    "total_price":  { "amount": 45000000, "currency": "PKR", "in_words": "..." },
    "token_amount": { "amount": 5000000,  "currency": "PKR", "payment_method": "cash/cheque/transfer" },
    "balance_due":  { "amount": 0, "currency": "PKR" }
  },
  "property": {
    "address": "Full one-line address",
    "type": "Plot / House / Flat / Commercial / etc.",
    "area": "e.g. 1 Kanal, 10 Marla, 240 sq yd",
    "plot_number": "...",
    "boundaries": { "north": "...", "south": "...", "east": "...", "west": "..." }
  },
  "dates": {
    "execution_date": "YYYY-MM-DD",
    "balance_due_date": "YYYY-MM-DD"
  },
  "clauses": {
    "backing_out_penalty_by_buyer": "e.g. token forfeit",
    "backing_out_penalty_by_seller": "e.g. return double the token",
    "sale_deed_registration_deadline": "e.g. by 30 September 2026",
    "possession_transfer": "when possession will pass"
  },
  "legal": {
    "stamp_paper_value": "e.g. Rs 100",
    "jurisdiction_city": "..."
  },
  "summary": "One-sentence plain-English summary"
}`,

  IDENTITY_CNIC: `This is a CNIC (Pakistani Computerised National Identity Card). Extract:
{
  "parties": {
    "holder": { "name": "...", "father_name": "...", "cnic": "XXXXX-XXXXXXX-X", "gender": "M/F" }
  },
  "dates": {
    "dob": "YYYY-MM-DD",
    "issue_date": "YYYY-MM-DD",
    "expiry_date": "YYYY-MM-DD"
  },
  "property": {
    "address": "Address as printed on card"
  },
  "legal": {
    "card_type": "CNIC / NICOP / POC / SNIC"
  },
  "summary": "One-sentence description of the CNIC holder"
}`,

  FARD_CURRENT_OWNERSHIP: `This is a FARD (land ownership record from Punjab Land Records or equivalent). Extract:
{
  "parties": {
    "owner": { "name": "...", "father_name": "...", "cnic": "...", "share": "e.g. 1/2 or 100%" },
    "co_owners": [{ "name": "...", "cnic": "...", "share": "..." }],
    "additional_parties": []
  },
  "property": {
    "address": "Full location (mauza, tehsil, district)",
    "mauza_village": "...",
    "khasra_number": "...",
    "khewat_number": "...",
    "khatooni_number": "...",
    "total_area": "e.g. 10 marla or 1 kanal",
    "land_type": "residential / agricultural / commercial",
    "irrigation": "if agricultural: nehri/barani/chahi"
  },
  "dates": {
    "fard_issue_date": "YYYY-MM-DD",
    "last_mutation_date": "YYYY-MM-DD"
  },
  "legal": {
    "fard_number": "...",
    "purpose": "e.g. Bara-e-Baye / general",
    "issuing_authority": "e.g. Patwari Halqa / Arazi Record Center / Tehsildar",
    "prior_mutations": ["Mutation No. 4521 dated 08-06-2018"]
  },
  "summary": "One-sentence summary of who owns what"
}`,

  MUTATION_SALE: `This is a MUTATION (Inteqal) record for a SALE transfer of land. Extract:
{
  "parties": {
    "transferor": { "name": "...", "father_name": "...", "cnic": "...", "share": "..." },
    "transferee": { "name": "...", "father_name": "...", "cnic": "...", "share": "..." },
    "witnesses": [{ "name": "...", "cnic": "..." }],
    "additional_parties": []
  },
  "financials": {
    "sale_consideration": { "amount": 0, "currency": "PKR" }
  },
  "property": {
    "mauza_village": "...",
    "khasra_number": "...",
    "khewat_number": "...",
    "area_transferred": "e.g. 5 marla"
  },
  "dates": {
    "mutation_date": "YYYY-MM-DD",
    "attested_date": "YYYY-MM-DD"
  },
  "legal": {
    "mutation_number": "...",
    "attesting_officer": "e.g. Tehsildar / Naib Tehsildar",
    "patwari_halqa": "..."
  },
  "summary": "One-sentence summary"
}`,

  MUTATION_MORTGAGE: `This is a MUTATION (Inteqal Rahn) for a MORTGAGE of land. Extract:
{
  "parties": {
    "mortgagor": { "name": "...", "cnic": "...", "share": "..." },
    "mortgagee": { "name": "...", "cnic": "...", "share": "..." },
    "additional_parties": []
  },
  "financials": {
    "mortgage_amount": { "amount": 0, "currency": "PKR" },
    "interest_rate": "if any"
  },
  "property": {
    "mauza_village": "...",
    "khasra_number": "...",
    "khewat_number": "...",
    "area_mortgaged": "..."
  },
  "dates": {
    "mortgage_date": "YYYY-MM-DD",
    "redemption_date": "YYYY-MM-DD"
  },
  "legal": {
    "mutation_number": "...",
    "attesting_officer": "..."
  },
  "summary": "One-sentence summary"
}`,

  MUTATION_GIFT: `This is a MUTATION (Inteqal Hiba) for a GIFT of land. Extract:
{
  "parties": {
    "donor": { "name": "...", "cnic": "..." },
    "donee": { "name": "...", "cnic": "...", "relationship_to_donor": "e.g. son, daughter, wife" },
    "witnesses": [{ "name": "...", "cnic": "..." }],
    "additional_parties": []
  },
  "property": {
    "mauza_village": "...",
    "khasra_number": "...",
    "area_gifted": "..."
  },
  "dates": {
    "gift_date": "YYYY-MM-DD"
  },
  "legal": {
    "mutation_number": "...",
    "attesting_officer": "..."
  },
  "summary": "One-sentence summary"
}`,

  MUTATION_INHERITANCE: `This is a MUTATION (Inteqal Wirasat) recording INHERITANCE. Extract:
{
  "parties": {
    "deceased": { "name": "...", "cnic": "...", "date_of_death": "YYYY-MM-DD" },
    "heirs": [{ "name": "...", "cnic": "...", "relationship": "son/daughter/wife/etc", "share": "..." }],
    "additional_parties": []
  },
  "property": {
    "mauza_village": "...",
    "khasra_number": "...",
    "total_area": "..."
  },
  "dates": {
    "mutation_date": "YYYY-MM-DD",
    "date_of_death": "YYYY-MM-DD"
  },
  "legal": {
    "mutation_number": "...",
    "attesting_officer": "...",
    "shariat_certificate_referenced": true
  },
  "summary": "One-sentence summary"
}`,

  GENERAL_POWER_OF_ATTORNEY: `This is a GENERAL POWER OF ATTORNEY (Mukhtar-e-Aam). Extract:
{
  "parties": {
    "principal": { "name": "...", "father_name": "...", "cnic": "...", "address": "..." },
    "attorney": { "name": "...", "father_name": "...", "cnic": "...", "relationship_to_principal": "e.g. son / brother / lawyer", "address": "..." },
    "witnesses": [{ "name": "...", "cnic": "..." }],
    "additional_parties": []
  },
  "property": {
    "address": "if PoA is specific to a property"
  },
  "dates": {
    "execution_date": "YYYY-MM-DD",
    "expiry_date": "YYYY-MM-DD"
  },
  "clauses": {
    "powers_granted": ["e.g. to sell property", "e.g. to receive rent"],
    "scope": "GENERAL / SPECIFIC / LIMITED",
    "revocable": true,
    "attestation": "Notary / Sub-Registrar / Consulate"
  },
  "legal": {
    "registration_number": "if registered",
    "stamp_paper_value": "..."
  },
  "summary": "One-sentence summary of the powers granted"
}`,

  NON_ENCUMBRANCE_CERTIFICATE: `This is a NON-ENCUMBRANCE CERTIFICATE (NEC) confirming a property is free of legal charges. Extract:
{
  "parties": {
    "owner_on_record": { "name": "...", "cnic": "..." },
    "requesting_party": { "name": "...", "cnic": "..." },
    "additional_parties": []
  },
  "property": {
    "address": "Full one-line address",
    "khasra_number": "...",
    "khewat_number": "...",
    "area": "..."
  },
  "dates": {
    "certificate_date": "YYYY-MM-DD",
    "period_covered_from": "YYYY-MM-DD",
    "period_covered_to": "YYYY-MM-DD"
  },
  "legal": {
    "certificate_number": "...",
    "issuing_authority": "e.g. Sub-Registrar Office XYZ",
    "encumbrances_found": ["list each briefly; if 'nil' or 'free from encumbrances', use empty array"]
  },
  "summary": "One-sentence summary of what the NEC certifies"
}`,

  GIFT_DEED: `This is a GIFT DEED (Hiba-nama). Extract:
{
  "parties": {
    "donor": { "name": "...", "father_name": "...", "cnic": "...", "address": "..." },
    "donee": { "name": "...", "father_name": "...", "cnic": "...", "relationship_to_donor": "e.g. son / daughter / wife", "address": "..." },
    "witnesses": [{ "name": "...", "cnic": "..." }],
    "additional_parties": []
  },
  "property": {
    "address": "Full one-line address",
    "type": "Plot / House / Flat / Land",
    "area": "...",
    "plot_number": "...",
    "khasra_number": "..."
  },
  "dates": {
    "execution_date": "YYYY-MM-DD",
    "possession_date": "YYYY-MM-DD"
  },
  "clauses": {
    "possession_delivered": true,
    "acceptance_by_donee": true,
    "conditions": "any conditions or 'unconditional'"
  },
  "legal": {
    "registration_number": "...",
    "sub_registrar_office": "...",
    "stamp_paper_value": "..."
  },
  "summary": "One-sentence summary"
}`,

  RELINQUISHMENT_DEED: `This is a RELINQUISHMENT DEED (Dastbardari-nama). Extract:
{
  "parties": {
    "relinquisher": { "name": "...", "cnic": "...", "relationship_to_deceased": "..." },
    "beneficiary": { "name": "...", "cnic": "...", "relationship_to_relinquisher": "..." },
    "witnesses": [{ "name": "...", "cnic": "..." }],
    "additional_parties": []
  },
  "financials": {
    "consideration": { "amount": 0, "currency": "PKR", "note": "if any" }
  },
  "property": {
    "address": "...",
    "share_being_relinquished": "e.g. 1/4 share"
  },
  "dates": {
    "execution_date": "YYYY-MM-DD"
  },
  "legal": {
    "registration_number": "...",
    "sub_registrar_office": "..."
  },
  "summary": "One-sentence summary"
}`,

  CANCELLATION_DEED: `This is a CANCELLATION DEED. Extract:
{
  "parties": {
    "party_1": { "name": "...", "cnic": "..." },
    "party_2": { "name": "...", "cnic": "..." },
    "additional_parties": []
  },
  "property": {
    "address": "if property-related"
  },
  "dates": {
    "cancellation_date": "YYYY-MM-DD",
    "original_deed_date": "YYYY-MM-DD"
  },
  "legal": {
    "original_deed_reference": "e.g. Sale Deed No X dated Y",
    "reason_for_cancellation": "as stated",
    "registration_number": "..."
  },
  "summary": "One-sentence summary"
}`,

  FAMILY_REGISTRATION_CERTIFICATE: `This is a FAMILY REGISTRATION CERTIFICATE (FRC) from NADRA. Extract:
{
  "parties": {
    "family_head": { "name": "...", "cnic": "..." },
    "members": [{ "name": "...", "cnic": "...", "relationship": "spouse/son/daughter", "dob": "YYYY-MM-DD" }],
    "additional_parties": []
  },
  "property": {
    "address": "Family address"
  },
  "dates": {
    "issue_date": "YYYY-MM-DD"
  },
  "legal": {
    "frc_number": "...",
    "issuing_office": "..."
  },
  "summary": "One-sentence summary of family composition"
}`,

  DEFAULT: `This document type does not have a specific schema. Extract whatever clearly-labelled fields are present:
{
  "parties": {
    "additional_parties": [{ "role": "detected role or 'unknown'", "name": "...", "cnic": "...", "address": "..." }]
  },
  "financials": {
    "amounts_mentioned": [{ "label": "...", "amount": 0, "currency": "PKR" }]
  },
  "property": {
    "address": "if property-related",
    "identifiers": ["any khasra/khewat/plot numbers"]
  },
  "dates": {
    "dates_mentioned": [{ "label": "...", "date": "YYYY-MM-DD" }]
  },
  "legal": {
    "document_reference_numbers": ["..."],
    "issuing_authority": "..."
  },
  "summary": "One-sentence description"
}`,
};

function buildPrompt(documentType: string, text: string): string {
  const schema = SCHEMAS[documentType] || SCHEMAS.DEFAULT;
  return CORE_RULES + schema + `\n\nOCR TEXT TO ANALYSE:\n---\n` + text + `\n---\n\nReturn ONLY the JSON object.`;
}

function stripCodeFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

export async function extractSmartFields(
  documentType: string,
  ocrText: string,
): Promise<SmartFields> {
  if (!genAI) {
    return { extractionError: "GEMINI_API_KEY not configured" };
  }
  if (!ocrText || ocrText.trim().length < 50) {
    return { extractionError: "OCR text too short for extraction" };
  }

  // Cache check - key is (documentType, ocrText)
  const cached = cacheGet<SmartFields>("extract", documentType, ocrText);
  if (cached) {
    console.log("[llm-extractor] " + documentType + " (cache HIT)");
    return cached;
  }

  const prompt = buildPrompt(documentType, ocrText);
  const MAX_RETRIES = 2;
  let lastError: any = null;

  for (const modelName of MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await genAI.models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const raw = response.text || "";
        const cleaned = stripCodeFences(raw);

        let parsed: SmartFields;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          console.warn(`[llm-extractor] ${modelName} returned non-JSON for ${documentType}. First 200 chars:`, cleaned.slice(0, 200));
          break;
        }

        parsed.extractionEngine = "gemini";
        parsed.extractionModel = modelName;

        parsed = applyCnicValidation(parsed, ocrText);

        // Store in cache before returning
        cacheSet("extract", parsed, documentType, ocrText);

        const v = parsed._cnicValidation;
        const vSummary = v ? ` | CNICs: ${v.summary}` : "";
        console.log(
          `[llm-extractor] ${documentType} (${modelName}): ` +
          `parties=${Object.keys(parsed.parties || {}).length}, ` +
          `financials=${Object.keys(parsed.financials || {}).length}, ` +
          `hasAddress=${Boolean(parsed.property?.address)}, ` +
          `dates=${Object.keys(parsed.dates || {}).length}` +
          vSummary
        );

        return parsed;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        const isRetryable =
          status === 503 || status === 429 ||
          err?.message?.includes("503") || err?.message?.includes("429") ||
          err?.message?.includes("overloaded") || err?.message?.includes("UNAVAILABLE");

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
          console.warn(`[llm-extractor] ${modelName} got ${status} for ${documentType}; retrying in ${Math.round(delay)}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        console.warn(`[llm-extractor] ${modelName} failed for ${documentType}: ${err?.message || err}. Trying next model...`);
        break;
      }
    }
  }

  console.error(`[llm-extractor] All models exhausted for ${documentType}:`, lastError?.message || lastError);
  return {
    extractionError: lastError?.message || "All LLM models failed",
    extractionEngine: "gemini",
  };
}
