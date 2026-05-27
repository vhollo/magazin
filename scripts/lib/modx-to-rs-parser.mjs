const DEFAULT_NUTRITION_LABEL = '1 adag energia- es tapanyagtartalma:'

const NAMED_HTML_ENTITIES = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ouml: 'ö',
  uuml: 'ü',
  odblac: 'ő',
  udblac: 'ű',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  Ouml: 'Ö',
  Uuml: 'Ü',
  Odblac: 'Ő',
  Udblac: 'Ű',
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

/** Magazine issue code YYMM or asset prefix dtYYMM (e.g. 0903 → 2009, 2506 → 2025). */
function parseIssueCodeYear(value) {
  const raw = String(value ?? '')
  const dtMatch = raw.match(/dt(\d{2})(0[1-9]|1[0-2])/i)
  if (dtMatch?.[1]) {
    const yy = Number(dtMatch[1])
    if (Number.isFinite(yy)) return 2000 + yy
  }
  const segmentMatch = raw.match(/(?:^|\/)(\d{2})(0[1-9]|1[0-2])(?:\/|$)/)
  if (segmentMatch?.[1]) {
    const yy = Number(segmentMatch[1])
    if (!Number.isFinite(yy)) return null
    const fourDigit = `${segmentMatch[1]}${segmentMatch[2]}`
    const asCalendar = Number(fourDigit)
    // Paths like /2001/ are magazine years, not YYMM issue codes.
    if (asCalendar >= 2000 && asCalendar <= 2008) return null
    return 2000 + yy
  }
  return null
}

function parseYearFromMagazinPath(pathValue) {
  const path = String(pathValue ?? '')

  const promoYear = path.match(/receptek-(20\d{2})/i)
  if (promoYear?.[1]) {
    const year = Number(promoYear[1])
    if (Number.isFinite(year)) return year
  }

  const fromIssueCode = parseIssueCodeYear(path)
  if (fromIssueCode) return fromIssueCode

  const explicitYear = path.match(/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/)
  if (explicitYear?.[1]) {
    const year = Number(explicitYear[1])
    if (Number.isFinite(year)) return year
  }

  return new Date().getUTCFullYear()
}

function parseValidYear(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  return parsed >= 2000 && parsed <= 2099 ? parsed : null
}

/** ISO timestamp from import/Firestore `createdAt` or MODX `publishedon` only (no clock fallback). */
function deriveDocCreatedAtIso(doc) {
  const raw = doc?.createdAt
  if (raw && typeof raw.toDate === 'function') {
    try {
      const d = raw.toDate()
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString()
    } catch {
      /* ignore */
    }
  }
  if (typeof raw === 'string' && raw.trim()) {
    const ms = Date.parse(raw.trim())
    if (!Number.isNaN(ms)) {
      const iso = new Date(ms).toISOString()
      if (!Number.isNaN(Date.parse(iso))) return iso
    }
  }
  const num = Number(doc?.publishedon)
  if (!Number.isFinite(num) || num <= 0) return null
  const ms = num > 9999999999 ? num : num * 1000
  const iso = new Date(ms).toISOString()
  return Number.isNaN(Date.parse(iso)) ? null : iso
}

function parseYearFromIso(iso) {
  const ms = Date.parse(String(iso ?? ''))
  if (Number.isNaN(ms)) return null
  return parseValidYear(new Date(ms).getUTCFullYear())
}

function deriveYear(doc, options) {
  const fromOption = parseValidYear(options?.year)
  if (fromOption) return fromOption

  const fromContentIssue = parseIssueCodeYear(String(doc?.content ?? ''))
  if (fromContentIssue) return fromContentIssue

  const nowYear = new Date().getUTCFullYear()

  // Seasonal MODX folders named after a future calendar year (e.g. husveti-receptek-2026 → 2025 booklet).
  const promoMatch = String(doc?.path ?? '').match(/receptek-(20\d{2})/i)
  if (promoMatch?.[1]) {
    const promoYear = Number(promoMatch[1])
    if (Number.isInteger(promoYear) && promoYear > nowYear - 1) return promoYear - 1
  }

  // MODX docs under receptsarok/{category}/ mirror the current booklet, not the calendar year.
  if (String(doc?.path ?? '').startsWith('receptsarok/') && !parseIssueCodeYear(doc?.path)) {
    return nowYear - 1
  }

  const fromPathParsed = parseValidYear(parseYearFromMagazinPath(doc?.path))
  if (fromPathParsed && fromPathParsed !== nowYear) return fromPathParsed

  const fromCreatedIso = deriveDocCreatedAtIso(doc)
  const fromCreated = fromCreatedIso ? parseYearFromIso(fromCreatedIso) : null
  if (fromCreated) return fromCreated

  if (fromPathParsed) return fromPathParsed

  const publishedRaw = Number(doc?.publishedon)
  const publishedMs = Number.isFinite(publishedRaw)
    ? publishedRaw > 9999999999
      ? publishedRaw
      : publishedRaw * 1000
    : NaN
  const fromPublished = parseValidYear(new Date(publishedMs).getUTCFullYear())
  if (fromPublished) return fromPublished
  return nowYear
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

function preInstructionContent(content) {
  const source = String(content ?? '')
  const match = source.match(
    /([\s\S]*?)(?:<h[1-6][^>]*>\s*(?:A\s+recept\s+elk[eé]sz[íi]t[eé]se|Elk[eé]sz[íi]t[eé]s)\s*<\/h[1-6]>|$)/i
  )
  return match?.[1] ?? source
}

function parseIngredientGroups(content) {
  const source = String(content ?? '')
  const cleanIngredientSectionLabel = (sectionValue) => {
    const raw = String(sectionValue ?? '').replace(/\s+/g, ' ').trim()
    if (!raw) return null
    const hozzavalokSlice = raw.match(/(Hozz[aá]val[oó]k.*)$/i)
    return (hozzavalokSlice?.[1] || raw).trim()
  }
  const isLikelyIngredientHeading = (section) => {
    const normalized = normalizeReadableText(section)
    if (!normalized) return false
    return /hozzaval/.test(normalized) || /\bhoz:?$/.test(normalized) || /\bhez:?$/.test(normalized)
  }
  const hasMeasuredIngredientItems = (items) =>
    items.some((item) => item.amount !== null || (typeof item.unit === 'string' && item.unit.trim()))

  const parseGroupsFromSource = (htmlSource) => {
    const groups = []
    const headingListRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>\s*<(ul|ol)[^>]*>([\s\S]*?)<\/\2>/gi
    let match
    while ((match = headingListRegex.exec(htmlSource))) {
      const section = cleanIngredientSectionLabel(stripHtml(match[1]))
      const itemTexts = splitParagraphsFromTag(match[3], 'li')
      if (itemTexts.length === 0) continue
      const items = parseIngredientLines(itemTexts)
      if (items.length === 0) continue
      // Prevent non-ingredient promo/navigation lists from becoming ingredient groups.
      if (!hasMeasuredIngredientItems(items) && !isLikelyIngredientHeading(section)) continue
      groups.push({
        section,
        items,
      })
    }

    if (groups.length === 0) {
      const listRegex = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi
      while ((match = listRegex.exec(htmlSource))) {
        const itemTexts = splitParagraphsFromTag(match[2], 'li')
        if (itemTexts.length === 0) continue
        const items = parseIngredientLines(itemTexts)
        if (items.length === 0) continue
        if (!hasMeasuredIngredientItems(items)) continue
        groups.push({
          section: null,
          items,
        })
      }
    }
    if (groups.length > 0) return groups
    return parseParagraphIngredientGroups(htmlSource)
  }

  const beforeInstruction = preInstructionContent(source)
  const groupsBeforeInstruction = parseGroupsFromSource(beforeInstruction)
  if (groupsBeforeInstruction.length > 0) return groupsBeforeInstruction

  // Some MODX imports place "Hozzávalók" after "A recept elkészítése";
  // fallback to the full HTML so those lists can still be parsed.
  const groupsFromFullContent = parseGroupsFromSource(source)
  if (groupsFromFullContent.length > 0) return groupsFromFullContent

  const instructionHtml = deriveInstructionsHtml(source)
  if (!instructionHtml) {
    return []
  }
  return parseGroupsFromSource(instructionHtml)
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
  return ['energy', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber'].filter((field) => {
    const v = table?.[field]
    // `null`/`undefined` means “missing”, not “0”.
    if (v === null || v === undefined) return false
    return Number.isFinite(Number(v))
  }).length
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

function deriveCategoryDecision({
  year,
  id,
  sourcePath,
  categoryByKey,
  title,
  ingredientNames,
  instructions,
  predictCategory,
}) {
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
    const prediction = predictCategory({ title, ingredientNames, sourcePath, instructions })
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
  if (instructionHtml) {
    // Preserve full imported MODX instruction flow (including heading/list text).
    const lines = htmlToTextLines(instructionHtml).filter((text) => text.length > 1)
    return uniqueByNormalized(lines)
  }
  const source = instructionHtml || content
  const paragraphs = splitParagraphsFromTag(source, 'p')
  const orderedListItems = []
  const orderedListRegex = /<ol\b[^>]*>([\s\S]*?)<\/ol>/gi
  let listMatch
  while ((listMatch = orderedListRegex.exec(source))) {
    orderedListItems.push(...splitParagraphsFromTag(listMatch[1], 'li'))
  }
  const divLines = splitParagraphsFromTag(source, 'div')
  const instructionItems = orderedListItems
  // Avoid flattening full HTML (tables, ingredient lists, side lists) into instructions.
  const steps = [...paragraphs, ...instructionItems, ...divLines].filter(
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

function parseVideoObject(videoHtmlOrUrl) {
  const raw = String(videoHtmlOrUrl ?? '').trim()
  if (!raw) return undefined
  if (!raw.includes('<')) {
    return { src: raw, poster: null }
  }
  const srcMatch =
    raw.match(/<source\b[^>]*\bsrc=(['"])(.*?)\1/i) ||
    raw.match(/<video\b[^>]*\bsrc=(['"])(.*?)\1/i)
  const posterMatch = raw.match(/<video\b[^>]*\bposter=(['"])(.*?)\1/i)
  const src = String(srcMatch?.[2] ?? '').trim()
  if (!src) return undefined
  const poster = String(posterMatch?.[2] ?? '').trim()
  return { src, poster: poster || null }
}

function deriveVideo(doc, content) {
  if (doc?.video && typeof doc.video === 'object') {
    const src = String(doc.video.src ?? '').trim()
    if (src) {
      const poster = String(doc.video.poster ?? '').trim()
      return { src, poster: poster || null }
    }
  }
  if (typeof doc?.video === 'string' && doc.video.trim()) {
    const parsed = parseVideoObject(doc.video)
    if (parsed) return parsed
  }
  const match = String(content ?? '').match(/<video\b[\s\S]*?<\/video>/i)
  if (!match?.[0]) return undefined
  return parseVideoObject(match[0])
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

/** Magazine-style main ingredients are usually an `<h2>` whose text starts with Hozzávalók. */
function hasMainStyleHozzavalokH2(content) {
  return /<h2\b[^>]*>\s*Hozzávalók/i.test(String(content ?? ''))
}

function hasExplicitInstructionHeading(content) {
  return /<h[1-6][^>]*>\s*(?:A\s+recept\s+elk[eé]sz[íi]t[eé]se|Elk[eé]sz[íi]t[eé]s)\s*<\/h[1-6]>/i.test(
    String(content ?? '')
  )
}

function deriveSubRecipes(content) {
  const source = String(content ?? '')
  const preInstruction = source.split(
    /<h[1-6][^>]*>\s*(?:A\s+recept\s+elk[eé]sz[íi]t[eé]se|Elk[eé]sz[íi]t[eé]s)\s*<\/h[1-6]>/i
  )[0]
  if (!preInstruction) return { subRecipes: [], fallbackInstructionLines: [] }

  /** When there is no magazine-style `<h2>Hozzávalók…</h2>` shell, `<h3>Hozzávalók…</h3>` must stay inside the preceding `<h2>Dish</h2>` block (multi-recipe collections). */
  const useH2OnlySubrecipeHeadings =
    !hasMainStyleHozzavalokH2(source) && !hasExplicitInstructionHeading(source)

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
  const fallbackInstructionLines = []
  const blockToInstructionLines = (title, blockHtml) => {
    const lines = htmlToTextLines(blockHtml)
    const heading = String(title ?? '').trim()
    if (!heading && lines.length === 0) return []
    return [heading ? `${heading}:` : '', ...lines].filter(Boolean)
  }
  const headingRegex = useH2OnlySubrecipeHeadings
    ? /<h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b[^>]*>|$)/gi
    : /<h([2-5])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[2-5][^>]*>|$)/gi
  const parseSubRecipeBlock = (title, blockHtml) => {
    const titleKey = normalizeText(title)
    if (!titleKey || /hozzavalok|elkeszites/.test(titleKey)) return null
    if (/tovabbi\s+recept|kapcsolodo|ajanlott/.test(titleKey)) return null
    if (hasLinkOnlyList(blockHtml)) return null
    const ingredientGroups = parseIngredientGroups(blockHtml)
    const nutritionTables = parseNutritionTables(blockHtml)
    const instructions = deriveInstructions(blockHtml)
    const ingredientLikeBlock =
      ingredientGroups.length > 0 && hasIngredientLikeItems(ingredientGroups)
    const hasCompleteSubRecipe =
      ingredientLikeBlock &&
      nutritionTables.length > 0 &&
      instructions.length > 0
    if (!hasCompleteSubRecipe) {
      // If this block is clearly an ingredient subsection (e.g. "A ...hoz"),
      // keep it only in ingredientGroups and do not duplicate it in instructions.
      if (ingredientLikeBlock) return { ignoredInstructionFallback: true }
      return { fallbackLines: blockToInstructionLines(title, blockHtml) }
    }
    const servings = deriveServings({ ingredientGroups, content: blockHtml, nutritionTables })
    return {
      subRecipe: {
        title,
        servings,
        nutritionTables,
        ingredientGroups,
        instructions,
        image: null,
      },
    }
  }

  const appendParsedBlock = (title, blockHtml) => {
    const parsed = parseSubRecipeBlock(title, blockHtml)
    if (!parsed) return
    if (parsed.subRecipe) {
      subRecipes.push(parsed.subRecipe)
      return
    }
    if (parsed.ignoredInstructionFallback) return
    if (Array.isArray(parsed.fallbackLines) && parsed.fallbackLines.length > 0) {
      fallbackInstructionLines.push(...parsed.fallbackLines)
    }
  }

  let match
  while ((match = headingRegex.exec(preInstruction))) {
    const title = stripHtml(useH2OnlySubrecipeHeadings ? match[1] : match[2])
    const blockHtml = useH2OnlySubrecipeHeadings ? match[2] : match[3]
    appendParsedBlock(title, blockHtml)
  }

  // General inline multi-recipe format: repeated <h3> dish blocks where each
  // block has its own table + ingredients + instructions.
  if (subRecipes.length === 0) {
    const h3BlockRegex = /<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b[^>]*>|$)/gi
    const h3ParsedSubRecipes = []
    while ((match = h3BlockRegex.exec(source))) {
      const title = stripHtml(match[1])
      const blockHtml = match[2]
      const parsed = parseSubRecipeBlock(title, blockHtml)
      if (parsed?.subRecipe) {
        h3ParsedSubRecipes.push(parsed.subRecipe)
      }
    }
    // Require multiple complete blocks to avoid splitting regular single recipes.
    if (h3ParsedSubRecipes.length >= 2) {
      subRecipes.push(...h3ParsedSubRecipes)
    }
  }
  return { subRecipes, fallbackInstructionLines }
}

/**
 * HTML is a multi-recipe collection (e.g. several `<h2>Dish name</h2>` blocks with table + ingredients + steps),
 * with no single parent recipe skeleton.
 */
function isOnlyStandaloneRecipeCollection(content, subRecipes) {
  if (!Array.isArray(subRecipes) || subRecipes.length < 2) return false
  const c = String(content ?? '')
  if (hasMainStyleHozzavalokH2(c)) return false
  if (hasExplicitInstructionHeading(c)) return false
  return true
}

function idSlugFromRecipeTitle(title) {
  const key = normalizeText(String(title ?? ''))
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return key || 'recept'
}

/**
 * When MODX content is only multiple complete mini-recipes (no main Hozzávalók / Elkészítés shell),
 * returns one `{ recipe, categoryDecision }` per dish. Otherwise returns a single-item array (same as {@link buildRecipeFromModxDoc}).
 *
 * @param {any} doc
 * @param {{
 *   year?: number
 *   id?: string
 *   categoryByKey: Map<string, string>
 *   predictCategory?: (input: { title?: string; ingredientNames?: string[]; instructions?: string[] }) => {
 *     resolved: boolean
 *     category: string | null
 *     confidence?: number
 *     margin?: number
 *     matchedFeatures?: Array<{ feature: string; score: number }>
 *     reason?: string
 *   }
 * }} options
 * @returns {Array<{ recipe: object, categoryDecision: object }>}
 */
export function buildRecipesFromModxDoc(doc, options) {
  const nowIso = new Date().toISOString()
  const year = deriveYear(doc, options)
  const createdAt = deriveDocCreatedAtIso(doc) ?? timestampFromUnix(doc?.publishedon, nowIso)
  const content = String(doc?.content || '')
  const { subRecipes } = deriveSubRecipes(content)

  if (!isOnlyStandaloneRecipeCollection(content, subRecipes)) {
    return [buildRecipeFromModxDoc(doc, options)]
  }

  const usedIds = new Set()
  const out = []
  for (const sub of subRecipes) {
    const subTitle = String(sub.title ?? '').trim()
    if (!subTitle) continue

    let id = idSlugFromRecipeTitle(subTitle)
    let uniqueId = id
    let n = 2
    while (usedIds.has(uniqueId)) {
      uniqueId = `${id}-${n}`
      n += 1
    }
    usedIds.add(uniqueId)

    const ingredientNames = uniqueByNormalized(
      sub.ingredientGroups.flatMap((group) => group.items.map((item) => item.name))
    )
    const categoryDecision = deriveCategoryDecision({
      year,
      id: uniqueId,
      sourcePath: doc?.path,
      categoryByKey: options.categoryByKey,
      title: subTitle,
      ingredientNames,
      instructions: sub.instructions,
      predictCategory: options.predictCategory,
    })
    const firstNutrition = sub.nutritionTables[0] || {
      energy: null,
      protein: null,
      fat: null,
      saturatedFat: null,
      carbs: null,
      fiber: null,
    }
    const recipe = {
      id: uniqueId,
      year,
      title: subTitle,
      author: deriveAuthor(doc),
      category: categoryDecision.category || '',
      servings: sub.servings,
      energy: firstNutrition.energy ?? null,
      protein: firstNutrition.protein ?? null,
      fat: firstNutrition.fat ?? null,
      saturatedFat: firstNutrition.saturatedFat ?? null,
      carbs: firstNutrition.carbs ?? null,
      fiber: firstNutrition.fiber ?? null,
      nutritionTables: sub.nutritionTables,
      ingredientGroups: sub.ingredientGroups,
      ingredientNames,
      searchTerms: deriveSearchTerms({ title: subTitle, ingredientNames }),
      instructions: sub.instructions,
      image: deriveImage(doc),
      img: doc?.img && typeof doc.img === 'object' ? doc.img : undefined,
      subRecipes: [],
      hasSubRecipes: false,
      createdAt,
      updatedAt: timestampFromUnix(doc?.editedon, nowIso),
      free: true,
      video: deriveVideo(doc, content),
    }
    const sourceModxId = Number(doc?.id)
    if (Number.isFinite(sourceModxId)) {
      recipe.sourceModxId = sourceModxId
    }
    out.push({ recipe, categoryDecision })
  }

  return out.length > 0 ? out : [buildRecipeFromModxDoc(doc, options)]
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
 *   predictCategory?: (input: { title?: string; ingredientNames?: string[]; instructions?: string[] }) => {
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
  const createdAt = deriveDocCreatedAtIso(doc) ?? timestampFromUnix(doc?.publishedon, nowIso)
  const id = String(options?.id || doc?.alias || '').trim()
  const title = String(doc?.longtitle || doc?.title || '').trim()
  const content = String(doc?.content || '')
  const ingredientGroups = parseIngredientGroups(content)
  const nutritionTables = parseNutritionTables(content)
  const { subRecipes, fallbackInstructionLines } = deriveSubRecipes(content)
  if (nutritionTables.length === 0) {
    const firstSubNutrition = subRecipes.find((sub) => Array.isArray(sub.nutritionTables) && sub.nutritionTables.length > 0)
    if (firstSubNutrition?.nutritionTables?.[0]) {
      nutritionTables.push(firstSubNutrition.nutritionTables[0])
    }
  }
  const firstNutrition = nutritionTables[0] || {
    energy: null,
    protein: null,
    fat: null,
    saturatedFat: null,
    carbs: null,
    fiber: null,
  }
  const ingredientNames = uniqueByNormalized(
    ingredientGroups.flatMap((group) => group.items.map((item) => item.name))
  )
  const mainInstructions = deriveInstructions(content)
  const seenInstructions = new Set(mainInstructions.map((line) => String(line ?? '').trim()).filter(Boolean))
  const instructions = [...mainInstructions]
  for (const line of fallbackInstructionLines) {
    const trimmed = String(line ?? '').trim()
    if (!trimmed || seenInstructions.has(trimmed)) continue
    instructions.push(line)
    seenInstructions.add(trimmed)
  }
  const categoryDecision = deriveCategoryDecision({
    year,
    id,
    sourcePath: doc?.path,
    categoryByKey: options.categoryByKey,
    title,
    ingredientNames,
    instructions,
    predictCategory: options.predictCategory,
  })
  const servings = deriveServings({ ingredientGroups, content, nutritionTables })

  const recipe = {
    id,
    year,
    title,
    author: deriveAuthor(doc),
    category: categoryDecision.category || '',
    servings,
    energy: firstNutrition.energy ?? null,
    protein: firstNutrition.protein ?? null,
    fat: firstNutrition.fat ?? null,
    saturatedFat: firstNutrition.saturatedFat ?? null,
    carbs: firstNutrition.carbs ?? null,
    fiber: firstNutrition.fiber ?? null,
    nutritionTables,
    ingredientGroups,
    ingredientNames,
    searchTerms: deriveSearchTerms({ title, ingredientNames }),
    instructions,
    image: deriveImage(doc),
    img: doc?.img && typeof doc.img === 'object' ? doc.img : undefined,
    subRecipes,
    hasSubRecipes: subRecipes.length > 0,
    createdAt,
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

export { parseYearFromMagazinPath, parseIssueCodeYear, normalizeText, isDescriptionAuthorCompatible }
