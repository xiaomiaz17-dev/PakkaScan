import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const OCR_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash'];

export function geminiConfigured(): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}

async function compressImageBuffer(buf: Buffer): Promise<{ base64: string; mimeType: string }> {
  try {
    const resizedBuffer = await sharp(buf)
      .resize({ width: 1600, fit: 'inside', max: true, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      base64: resizedBuffer.toString('base64'),
      mimeType: 'image/jpeg',
    };
  } catch (err) {
    console.warn('[ocr] Sharp compression failed, falling back to original buffer:', err);
    return {
      base64: buf.toString('base64'),
      mimeType: 'image/png',
    };
  }
}

async function normalizeImages(images: any[]) {
  return Promise.all(
    images.map(async (img) => {
      if (img.inlineData) return img;

      let buffer: Buffer | null = null;
      if (Buffer.isBuffer(img.buf)) {
        buffer = img.buf;
      } else if (typeof img.buf === 'string') {
        buffer = Buffer.from(img.buf, 'base64');
      }

      if (buffer) {
        const compressed = await compressImageBuffer(buffer);
        return {
          inlineData: {
            data: compressed.base64,
            mimeType: compressed.mimeType,
          },
        };
      }

      return {
        inlineData: {
          data: img.buf || '',
          mimeType: img.mime || img.mimeType || 'image/png',
        },
      };
    })
  );
}

export async function extractBatchImages(rawImages: any[], maxRetries = 2): Promise<{ text: string }> {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  
  const images = await normalizeImages(rawImages);
  const prompt = `Extract all text (both Urdu and English) from these document pages verbatim. Maintain original layout where possible.`;
  let lastError: any = null;

  for (const modelName of OCR_MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[ocr] Attempting Gemini batch OCR (${modelName}, attempt ${attempt + 1})...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([...images, prompt]);
        const text = (await result.response).text();
        if (text && text.trim().length > 0) {
          console.log(`[ocr] Gemini batch success on ${modelName} (${text.length} chars)`);
          return { text };
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        if (status === 503 || status === 429 || err?.message?.includes('503')) {
          const delay = Math.pow(2, attempt) * 1500 + Math.random() * 500;
          console.warn(`[ocr] ${modelName} returned status ${status}. Retrying in ${Math.round(delay)}ms...`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        break;
      }
    }
  }

  console.warn(`[ocr] Batch OCR failed. Switching to parallel per-page fallback...`);
  const text = await extractPagesParallel(images);
  return { text };
}

export const extractTextWithGeminiBatch = extractBatchImages;

export async function extractTextWithGemini(imageBase64: string, mimeType = 'image/png'): Promise<string> {
  const result = await extractBatchImages([{ inlineData: { data: imageBase64, mimeType } }]);
  return result.text;
}

export async function extractPdfWithGemini(pdfBase64: string): Promise<string> {
  const result = await extractBatchImages([{ inlineData: { data: pdfBase64, mimeType: 'application/pdf' } }]);
  return result.text;
}

async function extractPagesParallel(images: any[]): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
  const prompt = `Extract all text (both Urdu and English) from this document page verbatim.`;

  const pagePromises = images.map(async (img, idx) => {
    try {
      const result = await model.generateContent([img, prompt]);
      const text = (await result.response).text();
      return `--- Page ${idx + 1} ---\n${text}`;
    } catch (err) {
      console.error(`[ocr] Parallel fallback failed for Page ${idx + 1}:`, err);
      return `--- Page ${idx + 1} ---\n[OCR Failed]`;
    }
  });

  const pageResults = await Promise.all(pagePromises);
  return pageResults.join('\n\n');
}
