/**
 * Classical image enhancement before OCR.
 */
export async function enhanceForOcr(buf: Buffer): Promise<{ buffer: Buffer; note: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buf).metadata();
    const width = meta.width || 1200;
    const targetWidth = width < 1200 ? Math.min(1800, Math.round(width * 1.4)) : Math.min(width, 2200);

    const out = await sharp(buf)
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: width >= 1800 })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 0.8 })
      .jpeg({ quality: 92 })
      .toBuffer();

    return { buffer: out, note: "preprocessed: jpeg grayscale+normalize+sharpen" };
  } catch (e) {
    console.warn("[preprocess] sharp failed, using original", e);
    return { buffer: buf, note: "preprocess_skipped" };
  }
}
