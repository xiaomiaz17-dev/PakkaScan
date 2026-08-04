import { validateCNIC, validateStampPaper } from '../validation';
import { redactCNIC, redactPhone, redactEmail, redactSensitiveText } from '../redaction';

describe('PakkaScan Compliance & Redaction Utility Tests', () => {
  
  test('validateCNIC checks correct and incorrect formats', () => {
    // Valid formats
    expect(validateCNIC('42101-1234567-1').isValid).toBe(true);
    expect(validateCNIC('4210112345671').isValid).toBe(true);

    // Invalid formats
    expect(validateCNIC('42101-123456-1').isValid).toBe(false);
    expect(validateCNIC('abc-1234567-1').isValid).toBe(false);
    expect(validateCNIC('').isValid).toBe(false);
  });

  test('validateStampPaper checks duty thresholds correctly', () => {
    // Property value: 10,000,000 -> Expected min 1% = 100,000
    expect(validateStampPaper(120000, 10000000).isValid).toBe(true);
    expect(validateStampPaper(50000, 10000000).isValid).toBe(false);
  });

  test('redactCNIC masks sensitive CNICs correctly', () => {
    const input = 'Seller CNIC is 42101-1234567-1 and buyer is 4220176543219.';
    const output = redactCNIC(input);
    expect(output).toContain('#####-#######-#');
    expect(output).toContain('#############');
    expect(output).not.toContain('42101-1234567-1');
  });

  test('redactPhone masks phone numbers correctly', () => {
    const input = 'Call agent at 03001234567 or +923219876543.';
    const output = redactPhone(input);
    expect(output).toContain('03#########');
    expect(output).not.toContain('03001234567');
  });

  test('redactEmail masks email addresses correctly', () => {
    const input = 'Contact support@pakkascan.co.uk for details.';
    const output = redactEmail(input);
    expect(output).toContain('[REDACTED_EMAIL]');
    expect(output).not.toContain('support@pakkascan.co.uk');
  });

  test('redactSensitiveText combines all redaction steps', () => {
    const input = 'User 42101-1234567-1, phone 03001234567, email test@example.com';
    const output = redactSensitiveText(input);
    expect(output).not.toContain('42101-1234567-1');
    expect(output).not.toContain('03001234567');
    expect(output).not.toContain('test@example.com');
  });

});