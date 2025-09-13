/**
 * Utility functions for handling emojis in text
 */

/**
 * Removes all emojis from a given text string
 * @param {string} text - The text to remove emojis from
 * @returns {string} - Text with emojis removed
 */
export const removeEmojis = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // First, remove HTML entity encoded emojis (like &#x1f499; or &#x2728;)
  let cleaned = text.replace(/&#x[0-9a-fA-F]+;/g, '');
  
  // Also remove decimal HTML entities for emojis (like &#128153;)
  cleaned = cleaned.replace(/&#[0-9]+;/g, (match) => {
    const code = parseInt(match.slice(2, -1));
    // Check if it's in emoji Unicode ranges
    if ((code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
        (code >= 0x1F300 && code <= 0x1F5FF) || // Misc Symbols and Pictographs
        (code >= 0x1F680 && code <= 0x1F6FF) || // Transport and Map
        (code >= 0x1F1E0 && code <= 0x1F1FF) || // Regional Indicator Symbols
        (code >= 0x2600 && code <= 0x26FF) ||   // Miscellaneous Symbols
        (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats
        (code >= 0x1F900 && code <= 0x1F9FF) || // Supplemental Symbols and Pictographs
        (code >= 0x1FA70 && code <= 0x1FAFF)) { // Symbols and Pictographs Extended-A
      return '';
    }
    return match; // Keep non-emoji HTML entities
  });

  // Then remove direct Unicode emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu;

  return cleaned.replace(emojiRegex, '').trim();
};

/**
 * Removes emojis and cleans up extra whitespace
 * @param {string} text - The text to clean
 * @returns {string} - Cleaned text with emojis removed and normalized whitespace
 */
export const cleanText = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Remove emojis first
  let cleaned = removeEmojis(text);
  
  // Clean up extra whitespace (multiple spaces, tabs, newlines)
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

/**
 * Checks if text contains emojis
 * @param {string} text - The text to check
 * @returns {boolean} - True if text contains emojis
 */
export const hasEmojis = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Check for HTML entity encoded emojis first
  const htmlEntityEmojiRegex = /&#x[0-9a-fA-F]+;/g;
  if (htmlEntityEmojiRegex.test(text)) {
    return true;
  }

  // Check for decimal HTML entities that might be emojis
  const decimalEntityRegex = /&#[0-9]+;/g;
  const decimalMatches = text.match(decimalEntityRegex);
  if (decimalMatches) {
    for (const match of decimalMatches) {
      const code = parseInt(match.slice(2, -1));
      if ((code >= 0x1F600 && code <= 0x1F64F) || // Emoticons
          (code >= 0x1F300 && code <= 0x1F5FF) || // Misc Symbols and Pictographs
          (code >= 0x1F680 && code <= 0x1F6FF) || // Transport and Map
          (code >= 0x1F1E0 && code <= 0x1F1FF) || // Regional Indicator Symbols
          (code >= 0x2600 && code <= 0x26FF) ||   // Miscellaneous Symbols
          (code >= 0x2700 && code <= 0x27BF) ||   // Dingbats
          (code >= 0x1F900 && code <= 0x1F9FF) || // Supplemental Symbols and Pictographs
          (code >= 0x1FA70 && code <= 0x1FAFF)) { // Symbols and Pictographs Extended-A
        return true;
      }
    }
  }

  // Check for direct Unicode emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu;
  
  return emojiRegex.test(text);
};
