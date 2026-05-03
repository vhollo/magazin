///** @type {import('./$types').PageServerLoad} */
export const prerender = false
import { dev } from '$app/environment'
import MiniSearch from 'minisearch'

import { /* modxDoc,  */allDocs } from '$lib/modx'
import { getRecipes } from '$lib/siteConf'
import { recipeDetailSegments, type Recipe } from '$lib/receptsarok'

type RecipeWithCard = Recipe & {
  img?: { src: string; pos?: string; ext?: string } | null
  ellipsis?: string
  published?: boolean
}

// const stopWords = new Set(['a', 'az', 'és', 'vagy', 'de', 'ha', 'hogy', 'is', 'nem', 'csak', 'meg', 'mint', 'mert', 'egy', 'kell', 'lehet', 'volt', 'lesz', 'van', 'itt', 'ott', 'ahol', 'amikor', 'akkor', 'így', 'úgy', 'még', 'már', 'sem', 'se', 'sok', 'kevés', 'több', 'kevesebb', 'nagyon', 'igen', 'majd', 'most', 'mindig', 'soha', 'talán', 'persze', 'valami', 'valaki', 'valahol', 'valamikor', 'minden', 'senki', 'semmi', 'sehol', 'semikor', 'ez', 'azt', 'ezt', 'ebben', 'abban', 'ettől', 'attól', 'ilyen', 'olyan', 'én', 'te', 'ő', 'mi', 'ti', 'ők', 'aki', 'ami', 'akik', 'amik', 'amely', 'amelyek', 'ahogy', 'amint', 'amíg', 'hiszen', 'hanem', 'illetve', 'valamint', 'tehát', 'azaz', 'vagyis', 'azonban', 'viszont', 'pedig', 'mégis', 'annak', 'ennek', 'azzal', 'ezzel', 'arra', 'erre', 'arról', 'erről' ])

const miniSearch = new MiniSearch({
  fields: ['szerzo', 'longtitle', 'description', 'ellipsis', 'content'], // fields to index for full-text search
  storeFields: [
    'longtitle',
    'path',
    'description',
    'ellipsis',
    'content',
    'img',
    'tv',
    'free',
  ],
  // processTerm: (term, _fieldName) => stopWords.has(term) ? null : term.toLowerCase(),
  extractField: (document, fieldName) => {
    if (fieldName === 'szerzo') {
      if (typeof document.szerzo === 'string') return document.szerzo
      const authors = document.tv?.szerzo;
      if (Array.isArray(authors)) {
        return authors.map(author => author.name).join(' ');
      }
      return null;
    }

    // Access nested fields for other cases
    // return fieldName.split('.').reduce((doc, key) => doc && doc[key], document)

    return document[fieldName]
  }
})

function keresRecipeCardImg(r: RecipeWithCard): { src: string; pos: string; ext: string } | null {
  if (r.img?.src) {
    return {
      src: r.img.src,
      pos: r.img.pos || '50% 40%',
      ext: r.img.ext || String(r.img.src).split('.').pop()?.split('?')[0] || 'jpg',
    }
  }
  if (!r.image?.src) return null
  const src = r.image.src
  const fullSrc = /^https?:\/\//i.test(src) ? src : `/rs/${r.year}/${src}`
  return {
    src: fullSrc,
    pos: '50% 40%',
    ext: src.split('.').pop()?.split('?')[0] || 'jpg',
  }
}

function recipeNutritionEllipsis(r: Recipe): string {
  const first = r.nutritionTables?.[0]
  const energy = first?.energy ?? r.energy
  const protein = first?.protein ?? r.protein
  const fat = first?.fat ?? r.fat
  const carbs = first?.carbs ?? r.carbs
  const label = first?.label?.trim() || '1 adag tápanyagtartalma:'

  if (
    typeof energy !== 'number' &&
    typeof protein !== 'number' &&
    typeof fat !== 'number' &&
    typeof carbs !== 'number'
  ) {
    return `<p class="text-sm opacity-80">Receptsarok · ${r.category}${r.author?.trim() ? ` · ${r.author.trim()}` : ''}</p>`
  }

  const value = (n: number | null | undefined, unit: string) =>
    typeof n === 'number' ? `${n} ${unit}` : '—'

  return `<table border="0"><thead><tr><th colspan="4">${label}</th></tr></thead><tbody><tr><th>Energia</th><th>Fehérje</th><th>Zsír</th><th>Szénhidrát</th></tr><tr><td>${value(energy, 'kcal')}</td><td>${value(protein, 'g')}</td><td>${value(fat, 'g')}</td><td>${value(carbs, 'g')}</td></tr></tbody></table>`
}

function recipeSearchDescriptionLine(r: Recipe): string {
  const bits: string[] = []
  if (typeof r.energy === 'number') bits.push(`${r.energy} kcal`)
  if (typeof r.protein === 'number') bits.push(`${r.protein} g fehérje`)
  if (typeof r.carbs === 'number') bits.push(`${r.carbs} g szénhidrát`)
  if (typeof r.fiber === 'number') bits.push(`${r.fiber} g rost`)
  return bits.join(' · ')
}

function recipeToKeresDoc(r: Recipe) {
  const rr = r as RecipeWithCard
  const path = `receptsarok/${recipeDetailSegments(r)}`
  const nutritionLine = recipeSearchDescriptionLine(r)
  const description =
    [r.author?.trim(), nutritionLine].filter(Boolean).join(' · ') || 'Receptsarok recept'
  const ing = (r.ingredientNames ?? []).join(' ')
  const terms = (r.searchTerms ?? []).join(' ')
  const ellipsis =
    typeof rr.ellipsis === 'string' && rr.ellipsis.trim()
      ? rr.ellipsis
      : recipeNutritionEllipsis(r)
  const img = keresRecipeCardImg(rr)
  return {
    id: `rs-${r.year}-${r.id}`,
    szerzo: r.author,
    longtitle: r.title,
    description,
    ellipsis,
    content: `${terms} ${ing} ${r.title} ${r.author}`.trim(),
    path,
    img,
    free: r.free === true,
    tv: { tags: ['receptsarok', 'recept'] },
  }
}

const rsRecipes: Recipe[] = (await getRecipes()).filter(
  (r: Recipe) => (r as RecipeWithCard).published !== false
)
const recipeKeresDocs = rsRecipes.map(recipeToKeresDoc)
miniSearch.addAll([...allDocs, ...recipeKeresDocs])


export async function load({ url }) {

  const q = url?.searchParams?.get('q') || ''
  let doc, docs: any[] = []//, query, page = 0

    doc = {'path': 'keres' , 'title': `Keresés: "${q}"` }
    docs = q ? miniSearch.search(q, { boost: { ellipsis: 2 }, fuzzy: 0.2 })/* .sort((a, b) => b.id - a.id) */ : []
    if (dev) console.log('search:', q, docs.length)
    // console.log(docs[1])

    /* if (!docs.length) {
      doc = {'path': 'keres' , 'title': `Nem található: "${q}"` }
    } */

  /* if (!doc && !docs.length) {
    doc = {'path': '/'}
  } */
  return {doc, docs, count: allDocs.length + rsRecipes.length}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent