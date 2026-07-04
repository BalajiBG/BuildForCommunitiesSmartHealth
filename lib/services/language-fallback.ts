/**
 * Language fallback detection service.
 *
 * Determines if AI-generated text is in English when the user
 * requested a non-English language (e.g., Hindi). Uses a heuristic
 * based on the presence of Devanagari script characters.
 *
 * Validates: Requirements 10.5
 */

/**
 * Detects if text appears to be in English (i.e., fallback occurred)
 * when the user expected Hindi output.
 *
 * Heuristic: If fewer than 10% of alphabetic characters are Devanagari,
 * we consider the response to have fallen back to English.
 *
 * @param text - The AI-generated text to analyze
 * @returns true if the text appears to be in English (fallback), false otherwise
 */
export function detectLanguageFallback(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  // Count Devanagari characters (Unicode range: \u0900-\u097F)
  const devanagariRegex = /[\u0900-\u097F]/g;
  const devanagariMatches = text.match(devanagariRegex);
  const devanagariCount = devanagariMatches?.length ?? 0;

  // Count total alphabetic characters (Latin + Devanagari)
  const latinRegex = /[a-zA-Z]/g;
  const latinMatches = text.match(latinRegex);
  const latinCount = latinMatches?.length ?? 0;

  const totalAlphabetic = devanagariCount + latinCount;

  // If there's no meaningful text to analyze, no fallback
  if (totalAlphabetic < 5) {
    return false;
  }

  // If less than 10% Devanagari, it's likely English fallback
  return devanagariCount / totalAlphabetic < 0.1;
}
