/**
 * Parses an imperial height string (e.g. "6'1\"", "5-11", "6ft 3in", "6'2")
 * and converts it to metric centimeters (e.g. "185 cm").
 */
export function convertHeightToMetric(heightStr: string): string {
  if (!heightStr) return '';
  heightStr = heightStr.trim().toLowerCase();

  // Already metric check (e.g., "185 cm" or "1.85 m")
  if (heightStr.endsWith('cm')) {
    const val = parseInt(heightStr);
    return isNaN(val) ? '' : `${val} cm`;
  }
  if (heightStr.endsWith('m') || heightStr.includes('meter')) {
    const val = parseFloat(heightStr);
    if (!isNaN(val)) {
      return `${Math.round(val * 100)} cm`;
    }
  }

  // standard "6'1\"" or "6'1" or "6-1" or "6ft 1in" pattern
  const regex = /(\d+)\s*(?:'|ft|foot|-)\s*(\d+)?\s*(?:"|in|inch)?/;
  const match = heightStr.match(regex);
  if (match) {
    const feet = parseInt(match[1]);
    const inches = match[2] ? parseInt(match[2]) : 0;
    if (!isNaN(feet)) {
      const totalInches = feet * 12 + inches;
      const cm = Math.round(totalInches * 2.54);
      return `${cm} cm`;
    }
  }

  // Fallback: if it's just a number of inches
  const inchesOnlyVal = parseInt(heightStr);
  if (!isNaN(inchesOnlyVal) && inchesOnlyVal > 30 && inchesOnlyVal < 100) {
    return `${Math.round(inchesOnlyVal * 2.54)} cm`;
  }

  return '';
}

/**
 * Converts a metric height string (e.g. "185 cm" or "1.85 m")
 * to imperial feet and inches format (e.g. "6'1\"").
 */
export function convertHeightToImperial(heightStr: string): string {
  if (!heightStr) return '';
  heightStr = heightStr.trim().toLowerCase();

  // If already imperial, return sanitized
  if (heightStr.includes("'") || heightStr.includes('ft') || heightStr.includes('-')) {
    const regex = /(\d+)\s*(?:'|ft|foot|-)\s*(\d+)?\s*(?:"|in|inch)?/;
    const match = heightStr.match(regex);
    if (match) {
      const feet = parseInt(match[1]);
      const inches = match[2] ? parseInt(match[2]) : 0;
      return `${feet}'${inches}"`;
    }
  }

  let cm = 0;
  if (heightStr.endsWith('cm')) {
    cm = parseFloat(heightStr);
  } else if (heightStr.endsWith('m') || heightStr.includes('meter')) {
    cm = parseFloat(heightStr) * 100;
  } else {
    cm = parseFloat(heightStr); // Assume raw cm
  }

  if (isNaN(cm) || cm <= 0) return '';

  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);

  // Handle rounding edge case (e.g. 11.6 inches -> 12 inches -> add 1 foot)
  if (inches === 12) {
    return `${feet + 1}'0"`;
  }

  return `${feet}'${inches}"`;
}

/**
 * Parses weight string/number (e.g., "195 lbs", "195", "90 kg")
 * and converts to metric kilograms (e.g. "88 kg").
 */
export function convertWeightToMetric(weight: string | number): string {
  if (weight === undefined || weight === null) return '';
  const weightStr = weight.toString().trim().toLowerCase();
  if (!weightStr) return '';

  // Already metric check
  if (weightStr.endsWith('kg') || weightStr.endsWith('kilos')) {
    const val = parseInt(weightStr);
    return isNaN(val) ? '' : `${val} kg`;
  }

  const numericVal = parseFloat(weightStr);
  if (isNaN(numericVal)) return '';

  // Assume lbs if not specified, or if ends with lbs/lb
  const kg = Math.round(numericVal * 0.45359237);
  return `${kg} kg`;
}

/**
 * Converts a weight string/number (e.g., "90 kg", "90")
 * to imperial pounds (e.g. "198 lbs").
 */
export function convertWeightToImperial(weight: string | number): string {
  if (weight === undefined || weight === null) return '';
  const weightStr = weight.toString().trim().toLowerCase();
  if (!weightStr) return '';

  // Already imperial check
  if (weightStr.endsWith('lbs') || weightStr.endsWith('lb')) {
    const val = parseInt(weightStr);
    return isNaN(val) ? '' : `${val} lbs`;
  }

  let kg = parseFloat(weightStr);
  if (isNaN(kg) || kg <= 0) return '';

  const lbs = Math.round(kg / 0.45359237);
  return `${lbs} lbs`;
}
