/**
 * Utility functions for masking sensitive Personally Identifiable Information (PII)
 * such as Pakistani CNICs, phone numbers, and email addresses.
 */

export function redactCNIC(text: string): string {
  // Matches patterns like 12345-1234567-1 or 13 consecutive digits
  const cnicRegex = /\b\d{5}-\d{7}-\d{1}\b/g;
  const rawDigitsRegex = /\b\d{13}\b/g;

  return text
    .replace(cnicRegex, '#####-#######-#')
    .replace(rawDigitsRegex, '#############');
}

export function redactPhone(text: string): string {
  // Matches common Pakistani phone formats like +923001234567 or 03001234567
  const phoneRegex = /(\+92|0)?3\d{9}/g;
  return text.replace(phoneRegex, '03#########');
}

export function redactEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.replace(emailRegex, '[REDACTED_EMAIL]');
}

/**
 * Applies all PII redaction rules in sequence.
 * Order matters: CNIC first (most specific), then phone, then email.
 */
export function redactSensitiveText(text: string): string {
  if (!text) return '';
  let processed = redactCNIC(text);
  processed = redactPhone(processed);
  processed = redactEmail(processed);
  return processed;
}