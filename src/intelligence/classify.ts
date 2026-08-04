import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export interface AnalysisResult {
  score: number;
  posture: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_PROCEED';
  decision: 'PROCEED' | 'REJECT' | 'NEEDS_REVIEW';
  documentType: string;
  confidence: number;
  jurisdiction: string;
  flags: string[];
  extractedData?: Record<string, any>;
}

export async function evaluateTenancyDocument(extractedText: string): Promise<AnalysisResult> {
  let score = 100;
  const flags: string[] = [];

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Analyze this legal document text (in English/Urdu) and return a JSON object with boolean fields indicating key clauses:
{
  "hasStampPaperHeader": boolean,
  "hasTenancyDuration": boolean,
  "hasRentPaymentTerms": boolean,
  "hasRentEscalationOrRenewal": boolean,
  "hasSecurityDeposit": boolean,
  "hasLandlordAndTenantCnic": boolean,
  "jurisdiction": "SINDH" | "PUNJAB" | "KPK" | "BALOCHISTAN" | "OTHER"
}

Document Text:
${extractedText.slice(0, 8000)}`;

    const res = await model.generateContent(prompt);
    const parsed = JSON.parse(res.response.text());

    if (!parsed.hasStampPaperHeader) {
      score -= 20;
      flags.push('Missing explicit Stamp Paper header or vendor license details.');
    }
    if (!parsed.hasTenancyDuration) {
      score -= 15;
      flags.push('Tenancy duration/fixed period is not clearly specified.');
    }
    if (!parsed.hasRentPaymentTerms) {
      score -= 25;
      flags.push('Monthly rent payment terms are missing or unclear.');
    }
    if (!parsed.hasRentEscalationOrRenewal) {
      score -= 10;
      flags.push('Annual rent increase/renewal terms are unspecified.');
    }
    if (!parsed.hasSecurityDeposit) {
      score -= 10;
      flags.push('Security deposit amount or refund terms not explicitly declared.');
    }
    if (!parsed.hasLandlordAndTenantCnic) {
      score -= 15;
      flags.push('Landlord or Tenant CNIC numbers are missing.');
    }

    score = Math.max(score, 0);

    let posture: 'PROCEED' | 'PROCEED_WITH_CAUTION' | 'DO_NOT_PROCEED' = 'PROCEED';
    let decision: 'PROCEED' | 'REJECT' | 'NEEDS_REVIEW' = 'PROCEED';

    if (score < 60) {
      posture = 'DO_NOT_PROCEED';
      decision = 'REJECT';
    } else if (score < 90 || flags.length > 0) {
      posture = 'PROCEED_WITH_CAUTION';
      decision = 'PROCEED';
    }

    return {
      score,
      posture,
      decision,
      documentType: 'TENANCY_AGREEMENT',
      confidence: 0.95,
      jurisdiction: parsed.jurisdiction || 'SINDH',
      flags,
      extractedData: parsed,
    };
  } catch (err) {
    console.error('[classify] JSON structured evaluation failed, fallback applied', err);
    return {
      score: 75,
      posture: 'PROCEED_WITH_CAUTION',
      decision: 'PROCEED',
      documentType: 'TENANCY_AGREEMENT',
      confidence: 0.85,
      jurisdiction: 'SINDH',
      flags: ['AI automated analysis degraded; manual verification recommended.'],
    };
  }
}
