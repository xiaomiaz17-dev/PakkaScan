const ONES: Record<string, number> = {
  zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
  ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,
  seventeen:17,eighteen:18,nineteen:19,
};
const TENS: Record<string, number> = { twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90 };

export function wordsToAmount(s: string): number | null {
  const t = String(s || "").toLowerCase().replace(/[^a-z\s-]/g, " ").replace(/-/g, " ").split(/\s+/).filter(Boolean);
  let total = 0, cur = 0;
  for (const w of t) {
    if (ONES[w] != null) cur += ONES[w];
    else if (TENS[w] != null) cur += TENS[w];
    else if (w === "hundred") cur = (cur || 1) * 100;
    else if (w === "thousand") { total += (cur || 1) * 1000; cur = 0; }
    else if (w === "lakh" || w === "lac") { total += (cur || 1) * 100000; cur = 0; }
    else if (w === "million") { total += (cur || 1) * 1000000; cur = 0; }
  }
  total += cur;
  return total >= 1000 ? total : null;
}

export function inferRentFromText(text: string): number | null {
  const blob = String(text || "").replace(/\s+/g, " ");
  const wordHit = blob.match(/rupees?\s+([a-z\s-]{6,80}?)\s+thousand/i) || blob.match(/\((rupees?\s+[^)]{6,80})\)/i);
  const fromWords = wordHit ? wordsToAmount(wordHit[1] + " thousand") : wordsToAmount((blob.match(/twenty[\s-]+eight[\s-]+thousand/i) || [""])[0]);
  const nums = [...blob.matchAll(/Rs\.?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,7})/gi)].map((m) => Number(String(m[1]).replace(/,/g, "")));
  const nearRent = [...blob.matchAll(/monthly\s+rent[\s\S]{0,80}Rs\.?\s*([0-9,]+)/gi)].map((m) => Number(String(m[1]).replace(/,/g, "")));
  const candidates = [...nearRent, ...nums.filter((n) => n >= 5000 && n <= 500000)];
  if (fromWords && candidates.includes(fromWords)) return fromWords;
  if (fromWords && fromWords >= 5000) return fromWords;
  if (nearRent[0] && nearRent[0] >= 5000) return nearRent[0];
  return null;
}

export function stripIdentityNoise(text: string): string {
  return String(text || "")
    .split(/\n+/)
    .filter((line) => !/\b\d{5}-\d{7}-\d\b/.test(line) && !/NADRA|NATIONAL IDENTITY|Date of Birth|HO\/W CHAI/i.test(line))
    .join("\n");
}