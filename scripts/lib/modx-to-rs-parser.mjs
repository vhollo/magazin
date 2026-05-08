const DEFAULT_NUTRITION_LABEL = '1 adag energia- es tapanyagtartalma:'

const NAMED_HTML_ENTITIES = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
}

function decodeHtmlEntities(value) {
  if (!value) return ''
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : ''
    })
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : ''
    })
    .replace(/&([a-z][a-z0-9]+);/gi, (match, name) => NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match)
}

function normalizeReadableText(value) {
  return decodeHtmlEntities(String(value ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
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

function parseNullableNumber(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const match = raw.replace(/\s+/g, '').match(/-?\d+(?:[.,]\d+)?/)
  if (!match) return null
  const num = Number(match[0].replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

function parseYearFromMagazinPath(pathValue) {
  const match = String(pathValue ?? '').match(/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/)
  if (!match?.[1]) return new Date().getUTCFullYear()
  const year = Number(match[1])
  return Number.isFinite(year) ? year : new Date().getUTCFullYear()
}

function parseValidYear(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  return parsed >= 2000 && parsed <= 2099 ? parsed : null
}

function deriveYear(doc, options) {
  const fromOption = parseValidYear(options?.year)
  if (fromOption) return fromOption
  const fromPath = parseValidYear(parseYearFromMagazinPath(doc?.path))
  if (fromPath) return fromPath
  const publishedRaw = Number(doc?.publishedon)
  const publishedMs = Number.isFinite(publishedRaw)
    ? publishedRaw > 9999999999
      ? publishedRaw
      : publishedRaw * 1000
    : NaN
  const fromPublished = parseValidYear(new Date(publishedMs).getUTCFullYear())
  if (fromPublished) return fromPublished
  return new Date().getUTCFullYear()
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
  const looksLikeUnit =
    /^(dkg|kg|g|mg|ml|cl|dl|l|db|ek\.?|tk\.?|kk\.?|cs\.?|tasak|szelet|adag|fej|szal|csipet|evokanal|teaskanal|csomag|gerezd|marok|pohar|kanal)$/i.test(
    first
    )
  if (!looksLikeUnit) {
    return { text: clean, amount, unit: null, name: tail }
  }
  const name = tokens.slice(1).join(' ').trim() || tail
  return { text: clean, amount, unit: first, name }
}

function splitIngredientListByComma(text) {
  return String(text ?? '')
    .split(/,(?=\s)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
}

function mergeSplitDecimalIngredientLines(lines) {
  const merged = []
  for (let i = 0; i < lines.length; i += 1) {
    const current = String(lines[i] ?? '').trim()
    const next = String(lines[i + 1] ?? '').trim()
    if (/^\d+,\s*$/.test(current) && /^\d+(?:[.,]\d+)?\s+\S+/.test(next)) {
      merged.push(`${current}${next}`)
      i += 1
      continue
    }
    if (current) merged.push(current)
  }
  return merged
}

function parseIngredientLines(lines) {
  const merged = mergeSplitDecimalIngredientLines(lines)
  const out = []
  for (const line of merged) {
    const chunks = splitIngredientListByComma(line)
    if (chunks.length <= 1) {
      out.push(parseIngredientItem(line))
      continue
    }
    for (const chunk of chunks) {
      out.push(parseIngredientItem(chunk))
    }
  }
  return out.filter((item) => item.name)
}

function parseParagraphIngredientGroups(content) {
  const out = []
  const sectionMatch = String(content ?? '').match(
    /<h[1-6][^>]*>\s*Hozz[aá]val[oó]k[^<]*<\/h[1-6]>([\s\S]*?)(?:<h[1-6][^>]*>\s*(?:A\s+recept\s+elk[eé]sz[íi]t[eé]se|Elk[eé]sz[íi]t[eé]s)\s*<\/h[1-6]>|$)/i
  )
  if (!sectionMatch?.[1]) return out
  const lines = splitParagraphsFromTag(sectionMatch[1], 'p')
  if (lines.length === 0) return out
  const defaultItems = []
  for (const line of lines) {
    const clean = String(line ?? '').trim()
    if (!clean) continue
    const sectionLine = clean.match(/^(.{2,}?)\s+hoz:\s*(.+)$/i)
    if (sectionLine?.[1] && sectionLine?.[2]) {
      out.push({
        section: sectionLine[1].trim(),
        items: parseIngredientLines([sectionLine[2]]),
      })
      continue
    }
    defaultItems.push(clean)
  }
  const parsedDefaults = parseIngredientLines(defaultItems)
  if (parsedDefaults.length > 0) {
    out.push({ section: null, items: parsedDefaults })
  }
  return out.filter((group) => group.items.length > 0)
}

function parseIngredientGroups(content) {
  const groups = []
  const headingListRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>\s*<(ul|ol)[^>]*>([\s\S]*?)<\/\2>/gi
  let match
  while ((match = headingListRegex.exec(content))) {
    const section = stripHtml(match[1]) || null
    const itemTexts = splitParagraphsFromTag(match[3], 'li')
    if (itemTexts.length === 0) continue
    groups.push({
      section,
      items: parseIngredientLines(itemTexts),
    })
  }

  if (groups.length === 0) {
    const listRegex = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi
    while ((match = listRegex.exec(content))) {
      const itemTexts = splitParagraphsFromTag(match[2], 'li')
      if (itemTexts.length === 0) continue
      groups.push({
        section: null,
        items: parseIngredientLines(itemTexts),
      })
    }
  }
  if (groups.length > 0) return groups
  return parseParagraphIngredientGroups(content)
}

function emptyNutritionTable(label = DEFAULT_NUTRITION_LABEL) {
  return {
    label,
    energy: null,
    protein: null,
    fat: null,
    saturatedFat: null,
    carbs: null,
    fiber: null,
  }
}

function nutritionFieldPatterns() {
  return [
    { key: 'energy', header: /ener/, value: /(?:\be(?:\.|nergia)?\b|energia|kcal)/i },
    { key: 'protein', header: /feherje|protein/, value: /(?:feherje|protein)/i },
    { key: 'fat', header: /zsir(?!sav)/, value: /(?:\bzsir\b|zsir\s*tartalom|fat)/i },
    { key: 'saturatedFat', header: /telitett|saturated/, value: /(?:telitett|saturated)/i },
    { key: 'carbs', header: /szenhidrat|carb/, value: /(?:szenhidrat|carb)/i },
    { key: 'fiber', header: /rost|fiber/, value: /(?:\brost\b|fiber)/i },
  ]
}

function countNutritionValues(table) {
  return ['energy', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber'].filter((field) =>
    Number.isFinite(Number(table?.[field]))
  ).length
}

function parseNutritionFromRows(rows) {
  const rowMeta = rows.map((cells) => cells.map((cell) => normalizeReadableText(cell)))
  const fieldDefs = nutritionFieldPatterns()
  const headerRowIndex = rowMeta.findIndex((cells) => {
    const hits = fieldDefs.filter((field) => cells.some((cell) => field.header.test(cell)))
    return hits.length >= 2
  })
  if (headerRowIndex < 0) return null
  const valuesRowIndex = rowMeta.findIndex((cells, idx) => idx > headerRowIndex && cells.length > 0)
  if (valuesRowIndex < 0) return null
  const headers = rowMeta[headerRowIndex]
  const values = rows[valuesRowIndex]
  const labelRow = rows.find((row, idx) => idx < headerRowIndex && row.length === 1)
  const table = emptyNutritionTable(labelRow?.[0] || DEFAULT_NUTRITION_LABEL)
  for (const field of fieldDefs) {
    const index = headers.findIndex((header) => field.header.test(header))
    if (index < 0) continue
    table[field.key] = parseNullableNumber(values[index])
  }
  return countNutritionValues(table) > 0 ? table : null
}

function parseNutritionFromText(content) {
  const textRows = []
  const paragraphRegex = /<(p|div|li)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let paragraphMatch
  while ((paragraphMatch = paragraphRegex.exec(String(content ?? '')))) {
    const line = stripHtml(paragraphMatch[2])
    if (!line) continue
    textRows.push(line)
  }
  if (textRows.length === 0) return []

  const table = emptyNutritionTable()
  for (const row of textRows) {
    const normalized = normalizeReadableText(row)
    if (
      !table.label &&
      /(energia|tapanyag|tapertek|kcal|feherje|zsir|szenhidrat|rost|e\.)/.test(normalized)
    ) {
      table.label = row
    }
    for (const field of nutritionFieldPatterns()) {
      if (!field.value.test(normalized)) continue
      if (table[field.key] !== null) continue
      const valueMatch = normalized.match(
        new RegExp(`${field.value.source}[^0-9-]*(-?\\d+(?:[.,]\\d+)?)`, 'i')
      )
      if (!valueMatch?.[1]) continue
      table[field.key] = parseNullableNumber(valueMatch[1])
    }
  }

  return countNutritionValues(table) >= 2 ? [table] : []
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

    const parsed = parseNutritionFromRows(rows)
    if (parsed) tables.push(parsed)
  }
  if (tables.length > 0) return tables
  return parseNutritionFromText(content)
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
  const instructionHtml = deriveInstructionsHtml(content)
  const source = instructionHtml || content
  const paragraphs = splitParagraphsFromTag(source, 'p')
  const orderedListItems = []
  const orderedListRegex = /<ol\b[^>]*>([\s\S]*?)<\/ol>/gi
  let listMatch
  while ((listMatch = orderedListRegex.exec(source))) {
    orderedListItems.push(...splitParagraphsFromTag(listMatch[1], 'li'))
  }
  const divLines = splitParagraphsFromTag(source, 'div')
  const looseLines = htmlToTextLines(source)
  const instructionItems = orderedListItems
  const steps = [...paragraphs, ...instructionItems, ...divLines, ...looseLines].filter(
    (text) => text.length > 6
  )
  return uniqueByNormalized(steps)
}

function htmlToTextLines(content) {
  if (!content) return []
  const text = decodeHtmlEntities(
    String(content)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function deriveInstructionsHtml(content) {
  const headingRegex =
    /<h[1-6][^>]*>\s*(?:A\s+recept\s+elk[eé]sz[íi]t[eé]se|Elk[eé]sz[íi]t[eé]s)\s*<\/h[1-6]>([\s\S]*)/i
  const match = String(content ?? '').match(headingRegex)
  if (!match?.[1]) return ''
  return match[1].trim()
}

function deriveVideo(doc, content) {
  if (typeof doc?.video === 'string' && doc.video.trim()) {
    return doc.video
  }
  const match = String(content ?? '').match(/<video\b[\s\S]*?<\/video>/i)
  return match?.[0]?.trim() || undefined
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

function normalizeServingUnit(unitValue) {
  const key = normalizeReadableText(unitValue).replace(/\./g, '')
  const unitMap = new Map([
    ['adag', 'adag'],
    ['db', 'db'],
    ['darab', 'db'],
    ['szelet', 'szelet'],
    ['fo', 'fo'],
    ['pohar', 'pohar'],
    ['tepsi', 'tepsi'],
    ['tortaforma', 'tortaforma'],
    ['rud', 'rud'],
  ])
  return unitMap.get(key) || key || 'adag'
}

function parseServingsFromText(value) {
  const text = normalizeReadableText(value)
  if (!text) return null
  const match = text.match(
    /(\d+(?:[.,]\d+)?)\s*(adag|db|darab|szelet|fo|pohar|tepsi|tortaforma|rud)\s*(?:hoz|hez|hoz|re|ra|nak|nek)?/
  )
  if (!match?.[1]) return null
  const amount = parseNullableNumber(match[1])
  if (amount === null || amount <= 0) return null
  return { amount, unit: normalizeServingUnit(match[2] || 'adag') }
}

function deriveServings({ ingredientGroups, content, nutritionTables }) {
  for (const group of ingredientGroups) {
    const parsed = parseServingsFromText(group?.section ?? '')
    if (parsed) return parsed
  }

  const paragraphLines = splitParagraphsFromTag(content, 'p')
  for (const line of paragraphLines) {
    const parsed = parseServingsFromText(line)
    if (parsed) return parsed
  }

  for (const table of nutritionTables) {
    const parsed = parseServingsFromText(table?.label ?? '')
    if (parsed) return parsed
  }

  return { amount: 0, unit: '' }
}

function deriveSubRecipes(content) {
  const source = String(content ?? '')
  const preInstruction = source.split(
    /<h[1-6][^>]*>\s*(?:A\s+recept\s+elk[eé]sz[íi]t[eé]se|Elk[eé]sz[íi]t[eé]s)\s*<\/h[1-6]>/i
  )[0]
  if (!preInstruction) return []

  const hasLinkOnlyList = (html) => {
    const liMatches = [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    if (liMatches.length === 0) return false
    const linkLiCount = liMatches.filter((li) => /<a\b/i.test(li[1])).length
    return linkLiCount > 0 && linkLiCount === liMatches.length
  }

  const hasIngredientLikeItems = (ingredientGroups) =>
    ingredientGroups.some((group) =>
      group.items.some((item) => item.amount !== null || (typeof item.unit === 'string' && item.unit.trim()))
    )

  const subRecipes = []
  const headingRegex = /<h([2-5])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[2-5][^>]*>|$)/gi
  let match
  while ((match = headingRegex.exec(preInstruction))) {
    const title = stripHtml(match[2])
    const titleKey = normalizeText(title)
    if (!titleKey || /hozzavalok|elkeszites/.test(titleKey)) continue
    if (/tovabbi\s+recept|kapcsolodo|ajanlott/.test(titleKey)) continue
    const blockHtml = match[3]
    if (hasLinkOnlyList(blockHtml)) continue
    const ingredientGroups = parseIngredientGroups(blockHtml)
    if (ingredientGroups.length === 0) continue
    if (!hasIngredientLikeItems(ingredientGroups)) continue
    const nutritionTables = parseNutritionTables(blockHtml)
    const instructions = deriveInstructions(blockHtml)
    const servings = deriveServings({ ingredientGroups, content: blockHtml, nutritionTables })
    subRecipes.push({
      title,
      servings,
      nutritionTables,
      ingredientGroups,
      instructions,
      image: null,
    })
  }
  return subRecipes
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
  const year = deriveYear(doc, options)
  const id = String(options?.id || doc?.alias || '').trim()
  const title = String(doc?.longtitle || doc?.title || '').trim()
  const content = String(doc?.content || '')
  const ingredientGroups = parseIngredientGroups(content)
  const nutritionTables = parseNutritionTables(content)
  const subRecipes = deriveSubRecipes(content)
  if (nutritionTables.length === 0) {
    const firstSubNutrition = subRecipes.find((sub) => Array.isArray(sub.nutritionTables) && sub.nutritionTables.length > 0)
    if (firstSubNutrition?.nutritionTables?.[0]) {
      nutritionTables.push(firstSubNutrition.nutritionTables[0])
    }
  }
  const firstNutrition = nutritionTables[0] || {
    energy: 0,
    protein: 0,
    fat: 0,
    saturatedFat: 0,
    carbs: 0,
    fiber: 0,
  }
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
  const instructionsHtml = deriveInstructionsHtml(content)
  const servings = deriveServings({ ingredientGroups, content, nutritionTables })

  const recipe = {
    id,
    year,
    title,
    author: deriveAuthor(doc),
    category: categoryDecision.category || '',
    servings,
    energy: firstNutrition.energy ?? 0,
    protein: firstNutrition.protein ?? 0,
    fat: firstNutrition.fat ?? 0,
    saturatedFat: firstNutrition.saturatedFat ?? 0,
    carbs: firstNutrition.carbs ?? 0,
    fiber: firstNutrition.fiber ?? 0,
    nutritionTables,
    ingredientGroups,
    ingredientNames,
    searchTerms: deriveSearchTerms({ title, ingredientNames }),
    instructions,
    instructionsHtml: instructionsHtml || undefined,
    image: deriveImage(doc),
    img: doc?.img && typeof doc.img === 'object' ? doc.img : undefined,
    subRecipes,
    hasSubRecipes: subRecipes.length > 0,
    createdAt: timestampFromUnix(doc?.publishedon, nowIso),
    updatedAt: timestampFromUnix(doc?.editedon, nowIso),
    free: true,
    video: deriveVideo(doc, content),
  }
  const sourceModxId = Number(doc?.id)
  if (Number.isFinite(sourceModxId)) {
    recipe.sourceModxId = sourceModxId
  }
  return { recipe, categoryDecision }
}

export { parseYearFromMagazinPath, normalizeText, isDescriptionAuthorCompatible }
