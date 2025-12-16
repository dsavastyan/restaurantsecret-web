export function formatMenuCapturedAt(value?: string | null): string {
  if (!value) return "";

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "";

  const formatted = new Date(parsed).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return formatted.replace(/\s*г\.?$/i, "").trim();
}
