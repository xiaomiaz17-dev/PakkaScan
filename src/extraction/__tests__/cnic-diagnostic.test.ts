import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runOcr } from '../../intelligence/ocr-router';
import { extractSmartFields } from '../../intelligence/llm-extractor';
import { extractSaleDeedFields } from '../sale-deed-extractor';

describe('CNIC Diagnostic Pipeline Run', () => {

  test('Trace CNIC extraction end-to-end', async () => {
    const downloadDir = join(process.env.USERPROFILE || '', 'Downloads');
    
    // Find the tenancy file
    const files = readdirSync(downloadDir);
    const tenancyFile = files.find(f => f.includes('AGREEMENT OF TENANCY') && f.endsWith('.pdf'));
    
    if (!tenancyFile) {
      console.error('\n❌ Could not find the tenancy PDF in your Downloads folder.');
      console.error('Expected filename to contain "AGREEMENT OF TENANCY" and end with ".pdf"\n');
      expect(tenancyFile).toBeDefined();
      return;
    }

    const filePath = join(downloadDir, tenancyFile);
    console.log(`\n🔍 Found Source File: "${tenancyFile}"`);
    console.log(`📂 Path: ${filePath}`);

    // Read file
    const buf = readFileSync(filePath);

    // 1. RUN OCR
    console.log('\n--- [STAGE 1] Running OCR ---');
    const ocrResult = await runOcr([{ buf, mimeType: 'application/pdf' }]);
    console.log(`OCR Engine Used: ${ocrResult.engineUsed}`);
    console.log(`OCR Language: ${ocrResult.language}`);
    console.log(`OCR Chars Extracted: ${ocrResult.text.length}`);

    // Check if the CNIC base "8471213" or "0503779" exists in raw text
    const text = ocrResult.text;
    console.log('\n--- [STAGE 2] Checking Raw OCR Text ---');
    
    // Search for occurrences of target patterns
    const searchPatterns = [/8471213/g, /0503779/g, /9974286/g];
    let foundAny = false;
    
    for (const pattern of searchPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        foundAny = true;
        const index = match.index;
        const start = Math.max(0, index - 40);
        const end = Math.min(text.length, index + 50);
        const snippet = text.slice(start, end).replace(/\s+/g, ' ');
        console.log(`💡 Found pattern "${pattern.source}" in OCR raw text:`);
        console.log(`   Snippet: "... ${snippet} ..."`);
      }
    }

    if (!foundAny) {
      console.log('⚠️ Could not find specific CNIC patterns in raw OCR text.');
      console.log('Printing first 1000 characters of OCR text instead:');
      console.log(text.slice(0, 1000));
    }

    // 2. RUN REGEX EXTRACTOR
    console.log('\n--- [STAGE 3] Running Regex Extractor ---');
    // Tenancy doesn't have a standalone deterministic parser like Sale Deed, 
    // but we check if any standard CNIC regex matches in the document
    const cnicRegex = /\b\d{5}-\d{7}-\d\b/g;
    const regexCnics = text.match(cnicRegex) || [];
    console.log(`Regex found CNICs: ${JSON.stringify(regexCnics)}`);

    // 3. RUN LLM EXTRACTOR
    console.log('\n--- [STAGE 4] Running LLM Extractor (Gemini) ---');
    try {
      const smartFields = await extractSmartFields('TENANCY_AGREEMENT', text);
      console.log('LLM Raw Output Fields extracted:');
      console.log(`Landlord Name: "${smartFields.parties?.landlord?.name}"`);
      console.log(`Landlord CNIC: "${smartFields.parties?.landlord?.cnic}" (confidence: ${smartFields.parties?.landlord?.confidence})`);
      console.log(`Tenant Name:   "${smartFields.parties?.tenant?.name}"`);
      console.log(`Tenant CNIC:   "${smartFields.parties?.tenant?.cnic}" (confidence: ${smartFields.parties?.tenant?.confidence})`);
      console.log(`Extraction Model Used: ${smartFields.extractionModel}`);
    } catch (err: any) {
      console.error('❌ LLM Extraction failed:', err?.message || err);
    }

    console.log('\n----------------------------------------\n');
    expect(ocrResult.text.length).toBeGreaterThan(50);
  }, 30000); // 30s timeout for OCR + Gemini

});
