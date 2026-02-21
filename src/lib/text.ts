export function formatDescription(text: unknown, fallback = "") {
  if (typeof text !== "string") return fallback;
  const normalized = text.trim();
  if (!normalized) return fallback;
  if (normalized.toLowerCase() === "nan") return fallback;
  return normalized;
}

export function getRussianPluralWord(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const value = Math.abs(Number(count)) % 100;
  const lastDigit = value % 10;

  if (value >= 11 && value <= 14) return many;
  if (lastDigit === 1) return one;
  if (lastDigit >= 2 && lastDigit <= 4) return few;
  return many;
}

const RU_STOP_WORDS = new Set([
  "и",
  "в",
  "во",
  "на",
  "с",
  "со",
  "к",
  "ко",
  "по",
  "за",
  "из",
  "под",
  "над",
  "для",
  "от",
  "до",
  "о",
  "об",
  "обо",
  "у",
  "а",
  "но",
  "или",
]);

const RU_ADJECTIVE_ENDINGS = [
  "ого",
  "его",
  "ому",
  "ему",
  "ыми",
  "ими",
  "ый",
  "ий",
  "ой",
  "ое",
  "ее",
  "ая",
  "яя",
  "ую",
  "юю",
  "ых",
  "их",
  "ым",
  "им",
  "ом",
  "ем",
];

const RU_COMMON_ENDINGS = [
  "ами",
  "ями",
  "ях",
  "ах",
  "ам",
  "ям",
  "ов",
  "ев",
  "ом",
  "ем",
  "ой",
  "ей",
  "ия",
  "ие",
  "ию",
  "иям",
  "иях",
  "а",
  "я",
  "ы",
  "и",
  "у",
  "ю",
  "е",
  "о",
];

function normalizeSearchText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearchText(text: string): string[] {
  if (!text) return [];
  return normalizeSearchText(text)
    .split(" ")
    .map((v) => v.trim())
    .filter((v) => v.length >= 2 && !RU_STOP_WORDS.has(v));
}

function stripEnding(token: string, endings: string[], minStem = 4): string {
  for (const ending of endings) {
    if (!token.endsWith(ending)) continue;
    const stem = token.slice(0, -ending.length);
    if (stem.length >= minStem) return stem;
  }
  return token;
}

function stemRussianToken(token: string): string {
  if (!/^[а-я]+$/iu.test(token)) return token;

  const fromAdjective = stripEnding(token, RU_ADJECTIVE_ENDINGS, 4);
  if (fromAdjective !== token) return fromAdjective;

  const fromCommon = stripEnding(token, RU_COMMON_ENDINGS, 4);
  if (fromCommon !== token) return fromCommon;

  if (/[аеёиоуыэюя]$/iu.test(token) && token.length >= 5) {
    return token.slice(0, -1);
  }

  return token;
}

function almostEqualByPrefix(a: string, b: string): boolean {
  const minLen = Math.min(a.length, b.length);
  if (minLen < 5) return false;

  let prefix = 0;
  while (prefix < minLen && a[prefix] === b[prefix]) {
    prefix += 1;
  }
  return prefix >= minLen - 1;
}

function tokenMatches(queryToken: string, targetToken: string): boolean {
  if (!queryToken || !targetToken) return false;
  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) return true;

  const queryStem = stemRussianToken(queryToken);
  const targetStem = stemRussianToken(targetToken);

  if (queryStem === targetStem) return true;
  if (targetStem.includes(queryStem) || queryStem.includes(targetStem)) return true;
  if (almostEqualByPrefix(queryStem, targetStem)) return true;

  return false;
}

/**
 * Flexible search matcher for dish names:
 * - ignores word order
 * - tolerates common Russian inflections
 * - tolerates 1-char ending differences (e.g. "капучина" -> "капучино")
 */
export function matchesSearchQuery(candidate: unknown, query: unknown): boolean {
  const candidateText = typeof candidate === "string" ? candidate : "";
  const queryText = typeof query === "string" ? query : "";
  const normalizedQuery = normalizeSearchText(queryText);

  const qTokens = tokenizeSearchText(queryText);
  if (!qTokens.length) {
    if (!normalizedQuery) return true;
    return normalizeSearchText(candidateText).includes(normalizedQuery);
  }

  const cTokens = tokenizeSearchText(candidateText);
  if (!cTokens.length) return false;

  return qTokens.every((qToken) => cTokens.some((cToken) => tokenMatches(qToken, cToken)));
}
