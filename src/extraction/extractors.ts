import type { ExtractionContext, ExtractedDocument, RawField } from "./types";
import { SCHEMA_REGISTRY } from "./schema-registry";

const lineValue = (text: string, labels: string[]): string | undefined => {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`${escaped}\\s*[:\\-]\\s*([^\\n\\r]+)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
};

const regexField = (text: string, regex: RegExp): string | undefined => text.match(regex)?.[1]?.trim();

function field(field: string, value: string | undefined, confidence = 0.94): RawField | null {
  return value ? { field, value, confidence, page: 1, rawText: value } : null;
}

export function extractDocument(context: ExtractionContext): ExtractedDocument {
  const schema = SCHEMA_REGISTRY.get(context.documentType);
  const fields: Array<RawField | null> = [];
  const text = context.text;

  switch (context.documentType) {
    case "IDENTITY_CNIC":
    case "IDENTITY_NICOP":
      fields.push(
        field("name", lineValue(text, ["Name", "Cardholder Name"])),
        field("father_name", lineValue(text, ["Father Name"]), 0.91),
        field("identity_number", lineValue(text, ["Identity Number", "CNIC", "CNIC/NICOP"])),
        field("date_of_birth", lineValue(text, ["Date of Birth"]), 0.92),
        field("date_of_expiry", lineValue(text, ["Date of Expiry"]), 0.92),
        field("country_of_residence", lineValue(text, ["Country of Residence", "Country of Stay"]), 0.9),
        field("passport_number", lineValue(text, ["Passport Number", "Passport No"]), 0.9),
        field("present_address", lineValue(text, ["Present Address"]), 0.84),
        field("permanent_address", lineValue(text, ["Permanent Address"]), 0.84),
      );
      break;
    case "FARD_CURRENT_OWNERSHIP":
      fields.push(
        field("district", lineValue(text, ["District"])),
        field("tehsil", lineValue(text, ["Tehsil"])),
        field("mauza", lineValue(text, ["Mauza", "Mauza/Village"])),
        field("khewat", regexField(text, /Khewat\s*(?:No)?\s*[:#]?\s*([\w/-]+)/i)),
        field("khatoni", regexField(text, /Khatoni\s*(?:No)?\s*[:#]?\s*([\w/-]+)/i)),
        field("khasra", regexField(text, /Khasra\s*(?:No)?\s*[:#]?\s*([\w/-]+)/i)),
        field("total_area", regexField(text, /(?:Total Land|Total Area|Area)\s*[:#]?\s*([^\n\r]+)/i), 0.9),
        field("owners", regexField(text, /(?:OWNERSHIP DETAILS|Owner Name(?:\s*&\s*Share)?)\s*[:\-]?\s*([\s\S]+?)(?:REMARKS|Encumbrances|Issued By|$)/i), 0.85),
        field("issue_date", lineValue(text, ["Date of Issue", "Issue Date", "Date"]), 0.88),
        field("remarks", regexField(text, /(?:REMARKS(?:\s*\/\s*REDLINES)?|Encumbrances\s*\/\s*Remarks Column)\s*[:\-]?\s*([\s\S]+?)(?:Issued By|Date of Issue|$)/i), 0.86),
      );
      break;
    case "MUTATION_SALE":
      fields.push(
        field("mutation_number", regexField(text, /Mutation\s*(?:No|Number)\s*[:#]?\s*([\w/-]+)/i)),
        field("mutation_type", lineValue(text, ["Type of Mutation", "Mutation Type"])),
        field("seller", lineValue(text, ["Transferor (Seller)", "Seller", "Transferor"])),
        field("buyer", lineValue(text, ["Transferee (Buyer)", "Buyer", "Transferee"])),
        field("khasra", regexField(text, /Khasra\s*(?:No)?\s*[:#]?\s*([\w/-]+)/i)),
        field("area", lineValue(text, ["Total Area Mutated", "Area"]), 0.9),
        field("consideration", lineValue(text, ["Sale Consideration Amount", "Consideration"]), 0.9),
        field("attestation_date", lineValue(text, ["Date of Attestation", "Attestation Date"]), 0.9),
        field("status", lineValue(text, ["Status"]), 0.9),
      );
      break;
    case "MUTATION_MORTGAGE":
      fields.push(
        field("mutation_number", regexField(text, /Mutation\s*(?:No)?\s*[:#]?\s*([\w/-]+)/i)),
        field("mortgagor", lineValue(text, ["Mortgagor (Borrower)", "Mortgagor"])),
        field("mortgagee", lineValue(text, ["Mortgagee (Lender/Bank)", "Mortgagee"])),
        field("khasra", regexField(text, /Khasra\s*(?:No)?\s*[:#]?\s*([\w/-]+)/i)),
        field("area", lineValue(text, ["Land Mortgaged", "Area"]), 0.9),
        field("loan_amount", lineValue(text, ["Loan Amount Secured"]), 0.9),
        field("restriction", regexField(text, /REMARKS\s*:\s*["“]?([\s\S]+?)["”]?(?:Sanction Date|$)/i), 0.94),
        field("active_mortgage", /cannot sell|cannot transfer|until redemption/i.test(text) ? "true" : undefined, 0.98),
      );
      break;
    case "GENERAL_POWER_OF_ATTORNEY":
      fields.push(
        field("principal", regexField(text, /I,\s*([^,\n]+?)(?:\s+s\/o|,\s*CNIC)/i)),
        field("attorney", regexField(text, /Attorney\s*:\s*([^\n\r]+)/i)),
        field("principal_identity_number", regexField(text, /I,[\s\S]{0,150}?CNIC\s*:\s*([\d-]+)/i)),
        field("property_reference", regexField(text, /(Khasra\s*(?:No\.?)?\s*[\w/-]+)/i)),
        field("share", regexField(text, /(\d+\/\d+\s+share)/i), 0.9),
        field("powers", regexField(text, /POWERS GRANTED\s*:\s*([\s\S]+?)(?:Attestation|Sub-Registrar|$)/i), 0.88),
        field("registration_reference", regexField(text, /Sub-Registrar Registration No\s*:\s*([^\n\r]+)/i), 0.9),
      );
      break;
    case "NON_ENCUMBRANCE_CERTIFICATE":
      fields.push(
        field("certificate_number", lineValue(text, ["Certificate Serial No"])),
        field("search_period_start", regexField(text, /period\s+from\s+(\d{2}-\d{2}-\d{4})/i)),
        field("search_period_end", regexField(text, /period\s+from\s+\d{2}-\d{2}-\d{4}\s+to\s+(\d{2}-\d{2}-\d{4})/i)),
        field("property_reference", lineValue(text, ["Property Description"])),
        field("area", lineValue(text, ["Area"]), 0.9),
        field("result", regexField(text, /RESULT OF SEARCH\s*:\s*([\s\S]+?)(?:Sub-Registrar|$)/i), 0.93),
      );
      break;
    case "SALE_DEED_TEMPLATE":
      fields.push(
        field("template_detected", /\[(vendor name|plot no|amount in figures)\]/i.test(text) ? "true" : undefined, 0.99),
        field("document_state", /\[(vendor name|plot no|amount in figures)\]/i.test(text) ? "blank_template" : undefined, 0.99),
      );
      break;
    default:
      break;
  }

  const clean = fields.filter((item): item is RawField => item !== null);
  const warnings: string[] = [];
  if (!schema) warnings.push(`No extraction schema registered for ${context.documentType}.`);
  else {
    for (const critical of schema.criticalFields) {
      if (!clean.some((item) => item.field === critical)) warnings.push(`Missing critical field: ${critical}`);
    }
  }

  return {
    documentId: context.documentId,
    documentType: context.documentType,
    jurisdiction: context.jurisdiction,
    schemaVersion: schema?.version ?? "0.0.0",
    fields: clean,
    warnings,
  };
}
