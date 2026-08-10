import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractSaleDeedFields } from '../sale-deed-extractor';

function loadFixture(name: string): string {
  return readFileSync(
    join(process.cwd(), 'fixtures', 'documents', 'sale-deed', name),
    'utf8'
  );
}

function fieldValue(
  fields: ReturnType<typeof extractSaleDeedFields>,
  name: string
): string | undefined {
  return fields.find(f => f.field === name)?.value;
}

function logExtraction(
  label: string,
  fields: ReturnType<typeof extractSaleDeedFields>
) {
  console.log(`\n===== ${label} =====`);
  console.log(`Total fields extracted: ${fields.length}`);
  console.log('---');
  for (const f of fields) {
    console.log(
      `  ${f.field.padEnd(30)} = "${f.value}"  [conf: ${f.confidence}]`
    );
  }
  console.log('===================\n');
}

describe('Sale Deed Extractor - Diagnostic Run', () => {
  test('Sample 01: Punjab typed - shows all extracted fields', () => {
    const text = loadFixture('sample-01-punjab-typed.txt');
    const fields = extractSaleDeedFields(text);
    logExtraction('SAMPLE 01: PUNJAB TYPED', fields);
    expect(fields.length).toBeGreaterThan(0);
  });

  test('Sample 02: Sindh mixed - shows all extracted fields', () => {
    const text = loadFixture('sample-02-sindh-mixed.txt');
    const fields = extractSaleDeedFields(text);
    logExtraction('SAMPLE 02: SINDH MIXED', fields);
    expect(fields.length).toBeGreaterThan(0);
  });

  test('Sample 03: KPK minimal - shows all extracted fields', () => {
    const text = loadFixture('sample-03-kpk-minimal.txt');
    const fields = extractSaleDeedFields(text);
    logExtraction('SAMPLE 03: KPK MINIMAL', fields);
    expect(fields.length).toBeGreaterThan(0);
  });
});

describe('Sale Deed Extractor - Critical Field Validation', () => {

  describe('Sample 01 (Punjab)', () => {
    let fields: ReturnType<typeof extractSaleDeedFields>;

    beforeAll(() => {
      const text = loadFixture('sample-01-punjab-typed.txt');
      fields = extractSaleDeedFields(text);
    });

    test('seller name extracted', () => {
      const value = fieldValue(fields, 'seller_name');
      expect(value, 'seller_name missing').toBeDefined();
      expect(value).toMatch(/Muhammad Ahmad Khan/i);
    });

    test('seller CNIC extracted', () => {
      expect(fieldValue(fields, 'seller_cnic')).toBe('35202-1234567-1');
    });

    test('buyer name extracted', () => {
      const value = fieldValue(fields, 'buyer_name');
      expect(value, 'buyer_name missing').toBeDefined();
      expect(value).toMatch(/Fatima Zubair/i);
    });

    test('buyer CNIC extracted', () => {
      expect(fieldValue(fields, 'buyer_cnic')).toBe('35202-7654321-8');
    });

    test('consideration amount extracted', () => {
      const value = fieldValue(fields, 'consideration_amount');
      expect(value, 'consideration_amount missing').toBeDefined();
      expect(value).toContain('12,500,000');
    });

    test('stamp duty extracted', () => {
      expect(fieldValue(fields, 'stamp_duty_amount')).toContain('375,000');
    });

    test('property khasra extracted', () => {
      expect(fieldValue(fields, 'property_khasra')).toBe('1247/56');
    });

    test('property area extracted', () => {
      expect(fieldValue(fields, 'property_area')).toMatch(/10\s+marla/i);
    });

    test('registration date extracted', () => {
      expect(fieldValue(fields, 'registration_date')).toBe('15-03-2024');
    });

    test('witness 1 extracted', () => {
      expect(fieldValue(fields, 'witness_1_name')).toMatch(/Imran Ali Sheikh/i);
    });

    test('witness 2 extracted', () => {
      expect(fieldValue(fields, 'witness_2_name')).toMatch(/Tariq Mahmood Malik/i);
    });

    test('prior mutation number extracted', () => {
      expect(fieldValue(fields, 'prior_mutation_number')).toBe('4521');
    });
  });

  describe('Sample 02 (Sindh)', () => {
    let fields: ReturnType<typeof extractSaleDeedFields>;

    beforeAll(() => {
      const text = loadFixture('sample-02-sindh-mixed.txt');
      fields = extractSaleDeedFields(text);
    });

    test('seller name extracted despite FIRST PARTY structure', () => {
      const value = fieldValue(fields, 'seller_name');
      expect(value, 'seller_name missing').toBeDefined();
      expect(value).toMatch(/Kamran Hussain Rizvi/i);
    });

    test('buyer name extracted despite SECOND PARTY structure', () => {
      const value = fieldValue(fields, 'buyer_name');
      expect(value, 'buyer_name missing').toBeDefined();
      expect(value).toMatch(/Ayesha Nadeem/i);
    });

    test('consideration extracted', () => {
      expect(fieldValue(fields, 'consideration_amount')).toContain('18,500,000');
    });

    test('Sindh stamp duty extracted from stamp paper worth phrasing', () => {
      expect(fieldValue(fields, 'stamp_duty_amount')).toContain('740,000');
    });

    test('plot number extracted', () => {
      expect(fieldValue(fields, 'property_plot_number')).toBe('78-C');
    });
  });

  describe('Sample 03 (KPK)', () => {
    let fields: ReturnType<typeof extractSaleDeedFields>;

    beforeAll(() => {
      const text = loadFixture('sample-03-kpk-minimal.txt');
      fields = extractSaleDeedFields(text);
    });

    test('seller extracted from minimal doc', () => {
      const value = fieldValue(fields, 'seller_name');
      expect(value, 'seller_name missing').toBeDefined();
      expect(value).toMatch(/Gul Muhammad/i);
    });

    test('buyer extracted', () => {
      const value = fieldValue(fields, 'buyer_name');
      expect(value, 'buyer_name missing').toBeDefined();
      expect(value).toMatch(/Zainab/i);
    });

    test('consideration extracted from Rs format', () => {
      expect(fieldValue(fields, 'consideration_amount')).toContain('3,200,000');
    });

    test('khasra extracted', () => {
      expect(fieldValue(fields, 'property_khasra')).toBe('245/12');
    });

    test('handles missing CNICs gracefully', () => {
      expect(fieldValue(fields, 'witness_1_cnic')).toBeUndefined();
      expect(fieldValue(fields, 'witness_2_cnic')).toBeUndefined();
    });
  });

});
