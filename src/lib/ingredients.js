// Ingredient extraction and matching for the restaurant menu filter.
//
// Restaurants supply a dish's ingredients as one free-text field
// (`dish_item.composition_text` in D1), comma-separated in practice:
//
//   "Яйцо куриное, стейк Бавет, огурцы маринованные, хлеб тартин, соль"
//
// We split that into tokens on the client, so the filter works for every
// restaurant already in the database with no backend change. If a normalized
// ingredient list ever ships from the API (see the `ingredient` /
// `dish_item_ingredient` migration), `readIngredientList` picks it up
// automatically and the parsing path stops being used.

const SPLIT_RE = /[,;•·|/\n]+/
const MIN_TOKEN_LENGTH = 3
const MAX_TOKEN_LENGTH = 40

// Normalize for comparison: case- and ё-insensitive, single-spaced, no
// trailing punctuation. Both the stored tokens and the search haystack go
// through this, so matching is consistent.
export function normalizeIngredient(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:—–-]+|[\s.,;:—–-]+$/g, '')
    .trim()
}

// The raw composition string for a dish, whichever key the payload uses.
function readCompositionText(dish) {
  return (
    dish?.ingredients ??
    dish?.composition ??
    dish?.composition_text ??
    dish?.description ??
    ''
  )
}

// A server-provided normalized list, if the API ever sends one.
function readIngredientList(dish) {
  const list = dish?.ingredientsList ?? dish?.ingredients_list
  if (!Array.isArray(list)) return null
  const cleaned = list.map(normalizeIngredient).filter(Boolean)
  return cleaned.length ? cleaned : null
}

function isUsableToken(token) {
  if (token.length < MIN_TOKEN_LENGTH || token.length > MAX_TOKEN_LENGTH) return false
  // Drops portion/quantity fragments like "320 г", "8 шт", "1/2 лимона".
  if (/\d/.test(token)) return false
  return true
}

// Distinct ingredient tokens for one dish.
export function extractIngredients(dish) {
  const provided = readIngredientList(dish)
  if (provided) return Array.from(new Set(provided))

  const text = readCompositionText(dish)
  if (!text) return []

  const tokens = String(text)
    .split(SPLIT_RE)
    .map(normalizeIngredient)
    .filter(isUsableToken)

  return Array.from(new Set(tokens))
}

// True when at least one dish in the menu actually has a composition filled
// in. The filter control stays hidden otherwise — an empty filter is worse
// than no filter.
export function menuHasCompositions(dishes) {
  if (!Array.isArray(dishes)) return false
  return dishes.some((dish) => extractIngredients(dish).length > 0)
}

const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value)

// Every ingredient in the menu with how many dishes use it, most common first
// so the useful ones sit at the top of the picker.
export function buildIngredientOptions(dishes) {
  if (!Array.isArray(dishes)) return []

  const counts = new Map()
  for (const dish of dishes) {
    for (const token of extractIngredients(dish)) {
      counts.set(token, (counts.get(token) || 0) + 1)
    }
  }

  return Array.from(counts, ([value, count]) => ({ value, count, label: capitalize(value) }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ru'))
}

// Matching is substring-based against the dish's whole composition rather than
// exact token equality, so selecting "масло оливковое" also catches
// "масло оливковое с трюфелем", and "перец" catches "перец чили". That errs
// toward matching more, which is the safe direction for the exclude mode
// people reach for when avoiding an allergen or a disliked ingredient.
function dishContainsAny(dish, selected) {
  const provided = readIngredientList(dish)
  const haystack = provided
    ? provided.join(', ')
    : normalizeIngredient(readCompositionText(dish))

  if (!haystack) return false
  return selected.some((token) => token && haystack.includes(token))
}

// mode: 'exclude' hides dishes containing any selected ingredient (default),
// 'include' keeps only dishes containing at least one of them.
export function dishMatchesIngredients(dish, selected, mode = 'exclude') {
  if (!Array.isArray(selected) || selected.length === 0) return true

  const hit = dishContainsAny(dish, selected)
  return mode === 'include' ? hit : !hit
}
