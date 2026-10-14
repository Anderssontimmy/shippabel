// The AI is allowed to answer with basic HTML for the long store description, and people who
// never wrote a line of HTML then see "<b>Track</b> your workouts" in a text box. Store text
// is plain text, so turn the formatting tags into what they mean. Text without those tags
// (including "a < b" or "R&D") is returned untouched.
const FORMATTING_TAG = /<\/?(?:b|strong|i|em|u|br|p|div|span|ul|ol|li|h[1-6]|font)\b[^>]*>/i;

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

export const toPlainText = (text: string): string => {
  if (!FORMATTING_TAG.test(text)) return text;
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|ul|ol|h[1-6])>/gi, "\n\n")
    .replace(/<(?:ul|ol)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/?(?:b|strong|i|em|u|p|div|span|ul|ol|li|h[1-6]|font)\b[^>]*>/gi, "")
    .replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
