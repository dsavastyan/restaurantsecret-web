export function formatDescription(text: unknown, fallback = "") {
  if (typeof text !== "string") return fallback;
  const normalized = text.trim();
  if (!normalized) return fallback;
  if (normalized.toLowerCase() === "nan") return fallback;
  return normalized;
}
