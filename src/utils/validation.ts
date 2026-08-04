export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validates a Pakistani CNIC number.
 * Format expected: 12345-1234567-1 or 13 consecutive digits.
 */
export function validateCNIC(cnic: string): ValidationResult {
  if (!cnic) {
    return { isValid: false, message: 'CNIC number is missing.' };
  }

  // Clean whitespace
  const cleanCnic = cnic.trim();
  
  // Regex for Pakistani CNIC: 5 digits, hyphen, 7 digits, hyphen, 1 digit
  const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
  const rawDigitsRegex = /^\d{13}$/;

  if (cnicRegex.test(cleanCnic) || rawDigitsRegex.test(cleanCnic)) {
    return { isValid: true, message: 'CNIC format is valid.' };
  }

  return { 
    isValid: false, 
    message: 'Invalid CNIC format. Expected format: 12345-1234567-1.' 
  };
}

/**
 * Validates stamp paper value against transaction thresholds.
 */
export function validateStampPaper(declaredValue: number, propertyValue: number): ValidationResult {
  if (!declaredValue || isNaN(declaredValue)) {
    return { isValid: false, message: 'Stamp paper value could not be determined.' };
  }

  // Standard minimum stamp duty requirement checks (e.g., benchmarked ratio checks)
  const minimumExpectedDuty = propertyValue * 0.01; // Example 1% baseline rule

  if (declaredValue < minimumExpectedDuty) {
    return { 
      isValid: false, 
      message: `Stamp paper value (PKR ${declaredValue.toLocaleString()}) appears below standard provincial threshold requirements.` 
    };
  }

  return { isValid: true, message: 'Stamp paper valuation is compliant.' };
}