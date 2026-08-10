/**
 * Agreement to Sell (Bayana) specific extractor.
 * Called by extractors.ts when documentType is AGREEMENT_TO_SELL.
 *
 * Extracts the fields most relevant to bayana due-diligence:
 * seller, buyer, total sale price, token/bayana paid, balance owed,
 * balance-due date, property described.
 */

import type { RawField } from "./types";

function makeField(field: string, value: string, confidence = 0.85): RawField | null {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return { field, value: cleaned, confidence, page: 1, rawText: cleaned };
}

function labelValue(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`${escaped}\\s*[:\\-]?\\s*([^\\n\\r]+)`, "i");
    const m = text.match(rx);
    if (m && m[1] && m[1].trim().length > 1) return m[1].trim();
  }
  return undefined;
}

export function extractBayanaFields(text: string): RawField[] {
  const out: (RawField | null)[] = [];

  const sellerLine = labelValue(text, [
    "Seller",
    "Vendor",
    "Transferor",
    "First Party",
    "Party of the First Part",
  ]);
  if (sellerLine) out.push(makeField("seller", sellerLine, 0.85));

  const buyerLine = labelValue(text, [
    "Buyer",
    "Vendee",
    "Purchaser",
    "Transferee",
    "Second Party",
    "Party of the Second Part",
  ]);
  if (buyerLine) out.push(makeField("buyer", buyerLine, 0.85));

  // Total sale consideration
  const totalPatterns: RegExp[] = [
    /(?:total\s+sale\s+consideration|sale\s+consideration|total\s+consideration|sale\s+price|agreed\s+sale\s+price)[\s\S]{0,40}?(?:pkr|rs\.?|₨)\s*([\d,]+)/i,
    /(?:pkr|rs\.?|₨)\s*([\d,]+)[\s\S]{0,25}?(?:total\s+sale|as\s+total\s+consideration)/i,
  ];
  for (const rx of totalPatterns) {
    const m = text.match(rx);
    if (m && m[1]) {
      out.push(makeField("total_consideration", `PKR ${m[1]}`, 0.9));
      break;
    }
  }

  // Token / Bayana / Earnest money
  const tokenPatterns: RegExp[] = [
    /(?:token\s+money|token\s+amount|bayana|earnest\s+money|advance\s+token|بیعانہ)[\s\S]{0,40}?(?:pkr|rs\.?|₨)\s*([\d,]+)/i,
    /(?:pkr|rs\.?|₨)\s*([\d,]+)[\s\S]{0,25}?(?:as\s+bayana|as\s+token|as\s+earnest)/i,
  ];
  for (const rx of tokenPatterns) {
    const m = text.match(rx);
    if (m && m[1]) {
      out.push(makeField("token_amount", `PKR ${m[1]}`, 0.9));
      break;
    }
  }

  // Balance amount
  const balancePatterns: RegExp[] = [
    /(?:balance\s+amount|balance\s+due|remaining\s+amount|balance\s+payable)[\s\S]{0,40}?(?:pkr|rs\.?|₨)\s*([\d,]+)/i,
    /(?:pkr|rs\.?|₨)\s*([\d,]+)[\s\S]{0,25}?(?:as\s+balance|remaining\s+balance)/i,
  ];
  for (const rx of balancePatterns) {
    const m = text.match(rx);
    if (m && m[1]) {
      out.push(makeField("balance_amount", `PKR ${m[1]}`, 0.85));
      break;
    }
  }

  // Balance due date
  const dueDateMatch = text.match(
    /(?:balance\s+(?:shall\s+be\s+|to\s+be\s+)?(?:paid|payable)|on\s+or\s+before)[\s\S]{0,80}?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  );
  if (dueDateMatch && dueDateMatch[1]) {
    out.push(makeField("balance_due_date", dueDateMatch[1], 0.85));
  }

  // Property description
  const propertyMatch = text.match(
    /(?:property\s+described|subject\s+property|property\s+being\s+sold|following\s+property)[:\s]+(.{15,250}?)(?=[.]|\n\n|\bmeasuring\b|\bbounded\b)/i,
  );
  if (propertyMatch && propertyMatch[1]) {
    out.push(makeField("property_reference", propertyMatch[1].trim(), 0.75));
  }

  // Sale registration deadline (often 30/60/90 days from bayana)
  const deadlineMatch = text.match(
    /(?:within|not\s+later\s+than)\s+(\d+)\s+(days?|months?)\s+(?:from\s+the\s+date|of\s+this\s+agreement)/i,
  );
  if (deadlineMatch) {
    out.push(
      makeField(
        "registration_deadline",
        `${deadlineMatch[1]} ${deadlineMatch[2].toLowerCase()}`,
        0.8,
      ),
    );
  }

  return out.filter((x): x is RawField => x !== null);
}