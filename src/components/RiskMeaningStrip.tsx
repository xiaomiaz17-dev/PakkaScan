"use client";

import {
  plainEnglishRiskMeaning,
  plainEnglishRiskMeaningUrdu,
} from "@/lib/risk-plain-english";
import { BilingualBlock } from "@/components/BilingualBlock";

export function RiskMeaningStrip({
  riskScore,
  riskLabel,
  riskFactors,
}: {
  riskScore: number;
  riskLabel: string;
  riskFactors?: Array<{ label: string; points?: number }> | null;
}) {
  const en = plainEnglishRiskMeaning(riskScore, riskLabel, riskFactors);
  const ur = plainEnglishRiskMeaningUrdu(riskScore, riskLabel);

  return (
    <div
      style={{
        marginTop: -8,
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
      <BilingualBlock english={en} urdu={ur} titleEn="In plain words" titleUr="سادہ الفاظ میں" dense />
    </div>
  );
}
