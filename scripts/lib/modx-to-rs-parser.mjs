function decodeHtmlEntities(value) {
  if (!value) return ''
  return String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function stripHtml(value) {
  if (!value) return ''
  const withBreaks = String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
  return decodeHtmlEntities(withBreaks)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeText(value) {
  return decodeHtmlEntities(String(value ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isDescriptionAuthorCompatible(descriptionValue, authorValue) {
  const description = normalizeText(descriptionValue ?? '')
  const author = normalizeText(authorValue ?? '')
  if (!description || !author) return true
  return description.includes(author)
}

function parseNumber(value) {
  const match = String(value ?? '').replace(/\s+/g, '').match(/-?\d+(?:[.,]\d+)?/)
  if (!match) return 0
  const num = Number(match[0].replace(',', '.'))
  return Number.isFinite(num) ? num : 0
}

function parseYearFromMagazinPath(pathValue) {
  const tokens = String(pathValue ?? '').split(/[^0-9]+/).filter(Boolean)
  for (const token of tokens) {
    if (/^20\d{2}$/.test(token)) return Number(token)
  }
  for (const token of tokens) {
    if (/^\d{4}$/.test(token)) {
      const year = Number(`20${token.slice(0, 2)}`)
      if (year >= 2000 && year <= 2099) return year
    }
  }
  return new Date().getFullYear()
}

function splitParagraphsFromTag(content, tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  const out = []
  let match
  while ((match = regex.exec(content))) {
    const text = stripHtml(match[1])
    if (text) out.push(text)
  }
  return out
}

function parseIngredientItem(text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) {
    return { text: '', amount: null, unit: null, name: '' }
  }
  const amountMatch = clean.match(/^(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s+(.*)$/)
  if (!amountMatch) {
    return { text: clean, amount: null, unit: null, name: clean }
  }
  const amount = Number(amountMatch[1].replace(',', '.'))
  const tail = amountMatch[2].trim()
  const tokens = tail.split(/\s+/)
  const first = tokens[0] ?? ''
  const looksLikeUnit = /^(dkg|kg|g|mg|ml|cl|dl|l|db|ek\.?|tk\.?|kk\.?|cs\.?|tasak|szelet|adag|fej|szal|csipet|evokanal|teaskanal)$/i.test(
    first
  )
  if (!looksLikeUnit) {
    return { text: clean, amount, unit: null, name: tail }
  }
  const name = tokens.slice(1).join(' ').trim() || tail
  return { text: clean, amount, unit: first, name }
}

function parseIngredientGroups(content) {
  const groups = []
  const headingListRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>\s*<ul[^>]*>([\s\S]*?)<\/ul>/gi
  let match
  while ((match = headingListRegex.exec(content))) {
    const section = stripHtml(match[1]) || null
    const itemTexts = splitParagraphsFromTag(match[2], 'li')
    if (itemTexts.length === 0) continue
    groups.push({
      section,
      items: itemTexts.map(parseIngredientItem).filter((item) => item.name),
    })
  }

  if (groups.length === 0) {
    const listRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi
    while ((match = listRegex.exec(content))) {
      const itemTexts = splitParagraphsFromTag(match[1], 'li')
      if (itemTexts.length === 0) continue
      groups.push({
        section: null,
        items: itemTexts.map(parseIngredientItem).filter((item) => item.name),
      })
    }
  }
  return groups
}

function parseNutritionTables(content) {
  const tables = []
  const tableRegex = /<table\b[\s\S]*?<\/table>/gi
  let tableMatch
  while ((tableMatch = tableRegex.exec(content))) {
    const tableHtml = tableMatch[0]
    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
    const rows = []
    let rowMatch
    while ((rowMatch = rowRegex.exec(tableHtml))) {
      const cellRegex = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi
      const cells = []
      let cellMatch
      while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
        cells.push(stripHtml(cellMatch[1]))
      }
      if (cells.length > 0) rows.push(cells)
    }
    if (rows.length === 0) continue

    const headerRowIndex = rows.findIndex((row) =>
      row.some((cell) => normalizeText(cell).includes('energia'))
    )
    if (headerRowIndex < 0 || headerRowIndex + 1 >= rows.length) continue

    const headers = rows[headerRowIndex].map((cell) => normalizeText(cell))
    const values = rows[headerRowIndex + 1]
    const labelRow = rows.find((row, idx) => idx < headerRowIndex && row.length === 1)
    const label = labelRow?.[0] || '1 adag energia- es tapanyagtartalma:'

    const lookup = (pattern) => {
      const index = headers.findIndex((h) => pattern.test(h))
      return index >= 0 ? parseNumber(values[index]) : 0
    }

    tables.push({
      label: label || '1 adag energia- es tapanyagtartalma:',
      energy: lookup(/ener/),
      protein: lookup(/feherje|protein/),
      fat: lookup(/zsir(?!sav)/),
      saturatedFat: lookup(/telitett|saturated/),
      carbs: lookup(/szenhidrat|carb/),
      fiber: lookup(/rost|fiber/),
    })
  }
  return tables
}

function deriveAuthor(doc) {
  if (Array.isArray(doc?.tv?.szerzo) && doc.tv.szerzo.length > 0) {
    const first = doc.tv.szerzo[0]
    const fromTv = typeof first?.name === 'string' ? first.name.trim() : ''
    if (fromTv) return fromTv
  }
  const description = stripHtml(doc?.description ?? '')
  if (!description) return ''
  return description
    .replace(/\breceptje\b\.?/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function deriveCategoryDecision({ year, id, categoryByKey, title, ingredientNames, predictCategory }) {
  const slashKey = `${year}/${id}`
  const dashKey = `${year}-${id}`
  const manualCategory = categoryByKey.get(slashKey) || categoryByKey.get(dashKey)
  if (manualCategory) {
    return {
      resolved: true,
      category: manualCategory,
      categorySource: 'manual',
      confidence: 1,
      margin: 1,
      matchedFeatures: [],
      reason: 'manual-map',
    }
  }

  if (typeof predictCategory === 'function') {
    const prediction = predictCategory({ title, ingredientNames })
    if (prediction?.resolved && prediction?.category) {
      return {
        resolved: true,
        category: prediction.category,
        categorySource: 'predicted',
        confidence: Number(prediction.confidence ?? 0),
        margin: Number(prediction.margin ?? 0),
        matchedFeatures: Array.isArray(prediction.matchedFeatures) ? prediction.matchedFeatures : [],
        reason: prediction.reason || 'predicted',
      }
    }

    return {
      resolved: false,
      category: null,
      categorySource: 'unresolved',
      confidence: Number(prediction?.confidence ?? 0),
      margin: Number(prediction?.margin ?? 0),
      matchedFeatures: Array.isArray(prediction?.matchedFeatures) ? prediction.matchedFeatures : [],
      reason: prediction?.reason || 'prediction-unresolved',
    }
  }

  return {
    resolved: false,
    category: null,
    categorySource: 'unresolved',
    confidence: 0,
    margin: 0,
    matchedFeatures: [],
    reason: 'no-manual-category',
  }
}

function uniqueByNormalized(values) {
  const out = []
  const seen = new Set()
  for (const value of values) {
    const clean = String(value ?? '').trim()
    if (!clean) continue
    const key = normalizeText(clean)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

function deriveInstructions(content) {
  const paragraphs = splitParagraphsFromTag(content, 'p')
  const orderedListItems = []
  const orderedListRegex = /<ol\b[^>]*>([\s\S]*?)<\/ol>/gi
  let listMatch
  while ((listMatch = orderedListRegex.exec(content))) {
    orderedListItems.push(...splitParagraphsFromTag(listMatch[1], 'li'))
  }
  const instructionItems = orderedListItems
  const steps = [...paragraphs, ...instructionItems].filter((text) => text.length > 6)
  return uniqueByNormalized(steps)
}

function deriveImage(doc) {
  if (doc?.img && typeof doc.img === 'object' && typeof doc.img.src === 'string') {
    return {
      src: doc.img.src,
      alt: doc.longtitle || doc.title || '',
      caption: typeof doc.img.caption === 'string' && doc.img.caption.trim() ? doc.img.caption : null,
    }
  }
  return null
}

function deriveSearchTerms({ title, ingredientNames }) {
  const words = [
    ...normalizeText(title).split(/\s+/),
    ...ingredientNames.flatMap((name) => normalizeText(name).split(/\s+/)),
  ].filter((token) => token.length >= 3)
  return uniqueByNormalized(words)
}

function timestampFromUnix(value, fallback) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return fallback
  const ms = num > 9999999999 ? num : num * 1000
  const iso = new Date(ms).toISOString()
  return Number.isNaN(Date.parse(iso)) ? fallback : iso
}

/**
 * @param {any} doc
 * @param {{
 *   year: number
 *   id: string
 *   categoryByKey: Map<string, string>
 *   predictCategory?: (input: { title?: string; ingredientNames?: string[] }) => {
 *     resolved: boolean
 *     category: string | null
 *     confidence?: number
 *     margin?: number
 *     matchedFeatures?: Array<{ feature: string; score: number }>
 *     reason?: string
 *   }
 * }} options
 */
export function buildRecipeFromModxDoc(doc, options) {
  const nowIso = new Date().toISOString()
  const year = Number.isFinite(options?.year) ? options.year : parseYearFromMagazinPath(doc?.path)
  const id = String(options?.id || doc?.alias || '').trim()
  const title = String(doc?.longtitle || doc?.title || '').trim()
  const content = String(doc?.content || '')
  const nutritionTables = parseNutritionTables(content)
  const firstNutrition = nutritionTables[0] || {
    energy: 0,
    protein: 0,
    fat: 0,
    saturatedFat: 0,
    carbs: 0,
    fiber: 0,
  }
  const ingredientGroups = parseIngredientGroups(content)
  const ingredientNames = uniqueByNormalized(
    ingredientGroups.flatMap((group) => group.items.map((item) => item.name))
  )
  const categoryDecision = deriveCategoryDecision({
    year,
    id,
    categoryByKey: options.categoryByKey,
    title,
    ingredientNames,
    predictCategory: options.predictCategory,
  })
  const instructions = deriveInstructions(content)
  const servingsAmount =
    ingredientGroups.length > 0
      ? parseNumber(ingredientGroups[0]?.section ?? '') || 0
      : 0

  const recipe = {
    id,
    year,
    title,
    author: deriveAuthor(doc),
    category: categoryDecision.category || '',
    servings: {
      amount: servingsAmount,
      unit: servingsAmount > 0 ? 'adag' : '',
    },
    energy: firstNutrition.energy,
    protein: firstNutrition.protein,
    fat: firstNutrition.fat,
    saturatedFat: firstNutrition.saturatedFat,
    carbs: firstNutrition.carbs,
    fiber: firstNutrition.fiber,
    nutritionTables,
    ingredientGroups,
    ingredientNames,
    searchTerms: deriveSearchTerms({ title, ingredientNames }),
    instructions,
    image: deriveImage(doc),
    img: doc?.img && typeof doc.img === 'object' ? doc.img : undefined,
    subRecipes: [],
    hasSubRecipes: false,
    createdAt: timestampFromUnix(doc?.publishedon, nowIso),
    updatedAt: timestampFromUnix(doc?.editedon, nowIso),
    free: true,
    video: typeof doc?.video === 'string' ? doc.video : undefined,
  }
  const sourceModxId = Number(doc?.id)
  if (Number.isFinite(sourceModxId)) {
    recipe.sourceModxId = sourceModxId
  }
  return { recipe, categoryDecision }
}

export { parseYearFromMagazinPath, normalizeText, isDescriptionAuthorCompatible }
