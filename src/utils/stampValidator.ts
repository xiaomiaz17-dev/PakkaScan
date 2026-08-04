export interface StampCheckResult {
  isValid: boolean;
  expectedMinStampValue: number;
  actualStampValue?: number;
  error?: string;
}

export function validateStampPaper(monthlyRent: number, actualStampValue: number, province: 'Punjab' | 'Sindh' = 'Punjab'): StampCheckResult {
  const annualRent = monthlyRent * 12;
  let expectedMin = 1200; // Baseline default minimum

  if (province === 'Punjab') {
    // Example threshold schedule for Punjab urban lease agreements
    if (annualRent <= 100000) {
      expectedMin = 200;
    } else if (annualRent <= 500000) {
      expectedMin = 1000;
    } else {
      expectedMin = 2000; // Higher tier leases require higher stamp duty
    }
  } else if (province === 'Sindh') {
    // Example threshold schedule for Sindh lease agreements
    if (annualRent <= 200000) {
      expectedMin = 500;
    } else {
      expectedMin = 2500;
    }
  }

  if (actualStampValue < expectedMin) {
    return {
      isValid: false,
      expectedMinStampValue: expectedMin,
      actualStampValue,
      error: `Under-valued stamp paper. For monthly rent of PKR ${monthlyRent.toLocaleString()}, expected minimum stamp value is PKR ${expectedMin}, but found PKR ${actualStampValue}.`
    };
  }

  return {
    isValid: true,
    expectedMinStampValue: expectedMin,
    actualStampValue
  };
}