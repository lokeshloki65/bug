// ==========================================
// GEMINI API KEY CONFIGURATION
// Add up to 3 API keys for automatic rotation
// If all 3 expire, the system will ask for a new key
// ==========================================

export const GEMINI_API_KEYS = [
  "YOUR_GEMINI_API_KEY_1",   // Primary key - replace with your key
  "YOUR_GEMINI_API_KEY_2",   // Secondary key - replace with your key
  "YOUR_GEMINI_API_KEY_3",   // Tertiary key - replace with your key
];

// This will be set at runtime if user enters a manual key
export let manualApiKey = null;
export function setManualApiKey(key) { manualApiKey = key; }
