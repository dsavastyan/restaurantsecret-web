// Helpers for normalizing nutritional values that come from heterogeneous API
// payloads. Many partner APIs use different keys, hence the large lookup lists
// below.
const VALUE_KEYS = ['value', 'amount', 'quantity', 'qty', 'number', 'grams', 'grammage', 'val', 'content']
const LABEL_KEYS = ['key', 'code', 'name', 'title', 'label', 'type', 'slug', 'short', 'abbr']

const KCAL_PATHS = [
  'kcal',
  'calories',
  'cal',
  'energy',
  'energy_kcal',
  'energyKcal',
  'energy.kcal',
  'energy.calories',
  'energy.value',
  'calories_kcal',
  'caloriesKcal',
  'calories_100g',
  'kcal_100g',
  'nutrition.kcal',
  'nutrition.calories',
  'nutrition.energy',
  'nutrients.kcal',
  'nutrients.calories',
  'macros.kcal',
  'macros.calories',
  'macro.kcal',
  'macro.calories',
  'macronutrients.kcal',
  'macronutrients.calories'
]

const PROTEIN_PATHS = [
  'protein',
  'proteins',
  'protein_g',
  'proteins_g',
  'nutrition.protein',
  'nutrition.proteins',
  'nutrition.protein_g',
  'nutrition.proteins_g',
  'nutrients.protein',
  'nutrients.proteins',
  'macros.protein',
  'macros.proteins',
  'macro.protein',
  'macro.proteins',
  'macronutrients.protein',
  'macronutrients.proteins'
]

const FAT_PATHS = [
  'fat',
  'fats',
  'fat_g',
  'fats_g',
  'nutrition.fat',
  'nutrition.fats',
  'nutrition.fat_g',
  'nutrition.fats_g',
  'nutrients.fat',
  'nutrients.fats',
  'macros.fat',
  'macros.fats',
  'macro.fat',
  'macro.fats',
  'macronutrients.fat',
  'macronutrients.fats'
]

const CARB_PATHS = [
  'carbs',
  'carbohydrates',
  'carb',
  'carbs_g',
  'carbohydrates_g',
  'nutrition.carbs',
  'nutrition.carb',
  'nutrition.carbohydrates',
  'nutrition.carbs_g',
  'nutrition.carbohydrates_g',
  'nutrients.carbs',
  'nutrients.carb',
  'nutrients.carbohydrates',
  'macros.carbs',
  'macros.carb',
  'macro.carbs',
  'macro.carb',
  'macronutrients.carbs',
  'macronutrients.carbohydrates'
]

const WEIGHT_PATHS = [
  'weight',
  'weight_g',
  'weightGrams',
  'portion.weight',
  'portion_weight',
  'serving.weight',
  'serving_weight',
  'net_weight',
  'nutrition.weight',
  'nutrition.weight_g'
]

const PRICE_PATHS = [
  'price',
  'price_rub',
  'priceRub',
  'price.value',
  'price.amount',
  'price.current',
  'prices.current',
  'prices.value',
  'prices.amount',
  'cost',
  'cost.value',
  'cost.amount',
  'cost.current'
]

const KCAL_TOKENS = ['kcal', 'kkal', 'cal', 'кал', 'ккал', 'энерг']
const PROTEIN_TOKENS = ['protein', 'prote', 'белк', 'б']
const FAT_TOKENS = ['fat', 'жир', 'ж']
const CARB_TOKENS = ['carb', 'углев', 'угл']

const NUTRITION_ARRAY_KEYS = [
  'nutrients',
  'nutrition',
  'nutrition.nutrients',
  'nutrition.items',
  'nutrition.values',
  'nutrition.list',
  'nutritionFacts',
  'nutrition_facts',
  'nutritionFacts.items',
  'nutrition_facts.items',
  'macro',
  'macros',
  'macro.items',
  'macros.items',
  'macronutrients',
  'macro_nutrients',
  'macroNutrients',
  'macro_nutrition',
  'additionalNutrition'
]

// Safe getter for nested values using dot-separated paths.
function getByPath(obj, path) {
  if (!obj) return undefined
  const segments = path.split('.')
  let current = obj
  for (const segment of segments) {
    if (current == null) return undefined
    current = current[segment]
  }
  return current
}

// Attempt to coerce any primitive or object-ish value into a finite number.
export function parseNumber(value, depth = 0) {
  if (value == null) return NaN
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').replace(/\s+/g, '')
    const match = normalized.match(/^-?\d+(?:\.\d+)?$/)
    return match ? Number(match[0]) : NaN
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseNumber(item, depth + 1)
      if (Number.isFinite(parsed)) return parsed
    }
    return NaN
  }
  if (typeof value === 'object' && depth < 4) {
    for (const key of VALUE_KEYS) {
      if (key in value) {
        const nested = parseNumber(value[key], depth + 1)
        if (Number.isFinite(nested)) return nested
      }
    }
  }
  return NaN
}

// Iterate over a list of possible paths and return the first numeric value.
function readNumber(obj, paths) {
  for (const path of paths) {
    const raw = getByPath(obj, path)
    const num = parseNumber(raw)
    if (Number.isFinite(num)) return num
  }
  return NaN
}

// Some APIs deliver nutrition as arrays (label + value). This helper inspects
// those structures and returns a parsed number when the label matches one of the
// provided tokens.
function readFromNutritionArrays(obj, tokens) {
  const loweredTokens = tokens.map((token) => token.toLowerCase())
  for (const key of NUTRITION_ARRAY_KEYS) {
    const value = getByPath(obj, key)
    const arr = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : null
    if (!arr) continue
    for (const item of arr) {
      if (item == null) continue
      if (typeof item === 'string') {
        const normalizedLabel = item.toLowerCase()
        if (!loweredTokens.some((token) => normalizedLabel.includes(token))) continue
        const parsed = parseNumber(item)
        if (Number.isFinite(parsed)) return parsed
        continue
      }
      if (typeof item === 'number') continue
      if (typeof item !== 'object') continue
      const label = LABEL_KEYS.map((labelKey) => item[labelKey]).find((val) => val != null)
      if (!label) continue
      const normalizedLabel = String(label).toLowerCase()
      if (!loweredTokens.some((token) => normalizedLabel.includes(token))) continue
      const parsed = parseNumber(item)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return NaN
}

// Combine direct lookups and array scanning to extract a specific macro value.
function readNutritionValue(dish, directPaths, tokens) {
  const direct = readNumber(dish, directPaths)
  if (Number.isFinite(direct)) return direct
  const fromArrays = readFromNutritionArrays(dish, tokens)
  if (Number.isFinite(fromArrays)) return fromArrays
  return NaN
}

// Enrich a dish object with normalized nutrition fields and the category it
// belongs to.
function normalizeDish(dish = {}, categoryName) {
  return {
    ...dish,
    category: categoryName,
    kcal: readNutritionValue(dish, KCAL_PATHS, KCAL_TOKENS),
    protein: readNutritionValue(dish, PROTEIN_PATHS, PROTEIN_TOKENS),
    fat: readNutritionValue(dish, FAT_PATHS, FAT_TOKENS),
    carbs: readNutritionValue(dish, CARB_PATHS, CARB_TOKENS),
    weight: readNumber(dish, WEIGHT_PATHS),
    price: readNumber(dish, PRICE_PATHS)
  }
}

// Flatten all menu categories into a single list of normalized dishes.
export function flattenMenuDishes(menu) {
  if (!menu?.categories) return []
  const result = []
  for (const category of menu.categories) {
    if (!category?.dishes) continue
    for (const dish of category.dishes) {
      result.push(normalizeDish(dish, category?.name))
    }
  }
  return result
}

// Present numbers rounded to the nearest integer or fallback to an em dash.
export function formatNumeric(value) {
  return Number.isFinite(value) ? Math.round(value) : '—'
}

// Convenience helper for readability at call sites.
export function hasFiniteNumber(value) {
  return Number.isFinite(value)
}

