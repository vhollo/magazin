import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  compareRecipeCandidates,
  chooseWinner,
  pickRedirectTarget,
} from '../src/lib/receptsarokDedupeShared.js'
import {
  buildRecipeFromModxDoc,
  isDescriptionAuthorCompatible,
  parseYearFromMagazinPath,
} from './lib/modx-to-rs-parser.mjs'
import { predictRecipeCategory, loadCategoryPatterns } from './lib/receptsarok-category-predictor.mjs'

const root = process.cwd()
const createReviewPath = path.resolve(root, 'src/lib/data/receptsarok-create-review.json')
const redirectsPath = path.resolve(root, 'src/lib/data/receptsarok-redirects.json')
const patternsPath = path.resolve(root, 'src/lib/data/receptsarok-category-patterns.json')
const uncategorizedPath = path.resolve(root, 'src/lib/data/receptsarok-uncategorized-review.json')
const recipesPath = path.resolve(root, 'src/lib/data/recipes.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function testComparatorOrder() {
  const noVideoMoreNutrition = {
    id: 'a',
    year: 2024,
    video: '',
    nutritionTables: [{ energy: 1, protein: 1, fat: 1, saturatedFat: 1, carbs: 1, fiber: 1 }],
  }
  const hasVideoLessNutrition = {
    id: 'b',
    year: 2024,
    video: 'https://example.com',
    nutritionTables: [{ energy: 1 }],
  }
  const videoResult = compareRecipeCandidates(noVideoMoreNutrition, hasVideoLessNutrition)
  assert.equal(videoResult.winner.id, 'b')
  assert.equal(videoResult.reason, 'video')

  const sameVideoA = {
    id: 'c',
    year: 2024,
    video: '',
    nutritionTables: [{ energy: 1, protein: 1, fat: 1, saturatedFat: 1, carbs: 1, fiber: 1 }],
  }
  const sameVideoB = { id: 'd', year: 2025, video: '', nutritionTables: [{ energy: 1 }] }
  const nutritionResult = compareRecipeCandidates(sameVideoA, sameVideoB)
  assert.equal(nutritionResult.winner.id, 'c')
  assert.equal(nutritionResult.reason, 'nutrition')

  const yearA = { id: 'e', year: 2023, video: '', nutritionTables: [{ energy: 1 }] }
  const yearB = { id: 'f', year: 2025, video: '', nutritionTables: [{ energy: 1 }] }
  const yearResult = compareRecipeCandidates(yearA, yearB)
  assert.equal(yearResult.winner.id, 'f')
  assert.equal(yearResult.reason, 'year')
}

function testPickRedirectTargetPrefersRsBookletYear() {
  const rsBooklet = { id: 'puszedli', year: 2025, sourceModxId: undefined, video: '', nutritionTables: [{ energy: 1 }] }
  const modxClone = { id: 'puszedli', year: 2026, sourceModxId: 4346, video: '', nutritionTables: [{ energy: 1, protein: 1, fat: 1, saturatedFat: 1, carbs: 1, fiber: 1 }] }
  const matches = [rsBooklet, modxClone]
  const { winner: contentWinner } = chooseWinner(matches)
  assert.equal(contentWinner?.year, 2026, 'MODX clone wins content tie-break on year')
  const redirectTarget = pickRedirectTarget(matches, contentWinner)
  assert.equal(redirectTarget?.year, 2025, 'Redirect should use RS booklet year')
  assert.equal(redirectTarget?.id, 'puszedli')
}

function testAuthorGate() {
  assert.equal(isDescriptionAuthorCompatible('Gyurcsáné Kondrát Ilona receptje', 'Gyurcsáné Kondrát Ilona'), true)
  assert.equal(isDescriptionAuthorCompatible('Kovács Bence receptje', 'Szabó Anna'), false)
  assert.equal(isDescriptionAuthorCompatible('', 'Szabó Anna'), true)
  assert.equal(isDescriptionAuthorCompatible('Kovács Bence receptje', ''), true)
}

function testParserEntityAndYearResilience() {
  const parsedYear = parseYearFromMagazinPath('/receptsarok/2024/oszi-menu')
  assert.equal(parsedYear, 2024)
  assert.equal(parseYearFromMagazinPath('cikkek/diabetes/2506/puszedli'), 2025)
  assert.equal(parseYearFromMagazinPath('cikkek/diabetes/0903/recept'), 2009)
  const fallbackYear = parseYearFromMagazinPath('/receptsarok/archiv/menu')
  assert.ok(Number.isInteger(fallbackYear), 'Fallback year should remain a finite integer')

  const doc = {
    alias: 'teszt-entity',
    path: '/receptsarok/2025/teszt-entity',
    longtitle: 'T&#xE1;rgy',
    content: `
      <h2>Hozzávalók 2 adaghoz</h2>
      <ul><li>1 csipet s&#243;</li></ul>
      <h2>Elkészítés</h2>
      <p>Keverjük össze.</p>
      <p>Energia: 120 kcal</p>
      <p>Fehérje: 3 g</p>
    `,
    description: 'Teszt Szerz&#337; receptje',
  }
  const { recipe } = buildRecipeFromModxDoc(doc, {
    year: 2025,
    id: 'teszt-entity',
    categoryByKey: new Map(),
  })
  assert.equal(recipe.title, 'T&#xE1;rgy')
  assert.equal(recipe.author, 'Teszt Szerző')
  assert.equal(recipe.servings.amount, 2)
  assert.equal(recipe.servings.unit, 'adag')
  assert.ok(recipe.ingredientNames.includes('só'), 'Expected decoded ingredient name')
}

function testParserNutritionFallbackFromParagraphs() {
  const doc = {
    alias: 'teszt-nutrition',
    path: '/receptsarok/2025/teszt-nutrition',
    title: 'Paragraph nutrition',
    content: `
      <h2>Hozzávalók</h2>
      <ul><li>1 db alma</li></ul>
      <h2>Elkészítés</h2>
      <p>Keverés.</p>
      <p>1 adag energia- és tápanyagtartalma:</p>
      <p>Energia: 101 kcal</p>
      <p>Fehérje: 4,5 g</p>
      <p>Zsír: 2 g</p>
      <p>Szénhidrát: 10 g</p>
      <p>Rost: 1 g</p>
    `,
  }
  const { recipe } = buildRecipeFromModxDoc(doc, {
    year: 2025,
    id: 'teszt-nutrition',
    categoryByKey: new Map(),
  })
  assert.ok(recipe.nutritionTables.length > 0, 'Nutrition fallback should produce a table')
  assert.equal(recipe.energy, 101)
  assert.equal(recipe.protein, 4.5)
  assert.equal(recipe.carbs, 10)
}

function testParserIngredientAndServingFallbacks() {
  const doc = {
    alias: 'teszt-ingredients',
    path: '/receptsarok/2025/teszt-ingredients',
    title: 'Ingredients fallback',
    content: `
      <h2>Hozzávalók 4 adaghoz</h2>
      <ul>
        <li>1,</li>
        <li>5 dl tej</li>
        <li>2 db tojás, 1 csipet só</li>
      </ul>
      <h2>Elkészítés</h2>
      <p>Összekeverjük.</p>
      <p>Energia: 90 kcal</p>
      <p>Fehérje: 3 g</p>
    `,
  }
  const { recipe } = buildRecipeFromModxDoc(doc, {
    year: 2025,
    id: 'teszt-ingredients',
    categoryByKey: new Map(),
  })
  const firstGroup = recipe.ingredientGroups[0] || { items: [] }
  assert.ok(firstGroup.items.length >= 3, 'Expected comma-separated list expansion')
  assert.equal(firstGroup.items[0]?.amount, 1.5)
  assert.equal(recipe.servings.amount, 4)
  assert.equal(recipe.servings.unit, 'adag')
}

function testParserParagraphIngredientsAndSubrecipes() {
  const doc = {
    alias: 'teszt-sub',
    path: '/receptsarok/2025/teszt-sub',
    title: 'Sub recipe support',
    content: `
      <h2>Hozzávalók</h2>
      <p>6 adaghoz: 2 db tojás, 1 dl tej</p>
      <h2>A krém</h2>
      <ul><li>10 dkg vaj</li><li>2 dkg cukor</li></ul>
      <table>
        <tr><th>Energia</th><th>Fehérje</th><th>Zsír</th><th>Telített zsír</th><th>Szénhidrát</th><th>Rost</th></tr>
        <tr><td>180</td><td>2</td><td>12</td><td>5</td><td>8</td><td>1</td></tr>
      </table>
      <p>Összekeverjük, majd készre hűtjük.</p>
      <h2>Elkészítés</h2>
      <p>Energia: 75 kcal</p>
      <p>Fehérje: 1 g</p>
    `,
  }
  const { recipe } = buildRecipeFromModxDoc(doc, {
    year: 2025,
    id: 'teszt-sub',
    categoryByKey: new Map(),
  })
  assert.equal(recipe.servings.amount, 6)
  assert.ok(recipe.subRecipes.length > 0, 'Expected heading-delimited subrecipe extraction')
  assert.equal(recipe.hasSubRecipes, true)
}

function testParserDoesNotTreatRelatedLinksAsSubrecipe() {
  const doc = {
    alias: 'lazac-citromos-gyomberszosszal',
    path: '/cikkek/diabetes/1905/lazac-citromos-gyomberszosszal',
    title: 'Lazac citromos gyömbérszósszal',
    content: `
      <table>
        <tr><th>Energia</th><th>Fehérje</th><th>Zsír</th><th>Szénhidrát</th></tr>
        <tr><td>332 kcal</td><td>30 g</td><td>22 g</td><td>2 g</td></tr>
      </table>
      <h2>Hozzávalók 4 adaghoz:</h2>
      <ul>
        <li>4 szelet lazacfilé (600 g)</li>
        <li>2 szál újhagyma</li>
        <li>1 tk. reszelt citromhéj</li>
      </ul>
      <p>Melegítsük elő a sütőt 200 °C-ra, és süssük készre a lazacot.</p>
      <h3>További receptek kanadából:</h3>
      <ul>
        <li><a href="/cikkek/diabetes/1905/kanadai-sargaborsoleves-sonkaval">Kanadai sárgaborsóleves sonkával</a></li>
        <li><a href="/cikkek/diabetes/1905/feher-husu-hal-sult-hagymaval-es-lencsepurevel">Fehér húsú hal sült hagymával és lencsepürével</a></li>
      </ul>
    `,
  }
  const { recipe } = buildRecipeFromModxDoc(doc, {
    year: 2026,
    id: 'lazac-citromos-gyomberszosszal',
    categoryByKey: new Map(),
  })
  assert.equal(recipe.hasSubRecipes, false)
  assert.equal(recipe.subRecipes.length, 0)
}

function testParsedBranchBCompleteness() {
  const review = readJson(createReviewPath)
  const entries = Array.isArray(review?.entries) ? review.entries : []
  const missingBody = entries.filter((entry) => {
    const recipe = entry?.recipe ?? {}
    const ingredientGroups = Array.isArray(recipe.ingredientGroups) ? recipe.ingredientGroups : []
    const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : []
    const nutritionTables = Array.isArray(recipe.nutritionTables) ? recipe.nutritionTables : []
    return (
      ingredientGroups.length === 0 ||
      instructions.length === 0 ||
      nutritionTables.length === 0
    )
  })
  assert.equal(missingBody.length, 0, `Parsed recipes missing body fields: ${missingBody.length}`)
}

function testRedirectsShape() {
  const redirects = readJson(redirectsPath)
  const entries = Array.isArray(redirects?.entries) ? redirects.entries : []
  assert.ok(entries.length > 0, 'redirect manifest should contain entries')
  const invalid = entries.filter((entry) => !entry.path || !entry.id || !Number.isFinite(Number(entry.year)))
  assert.equal(invalid.length, 0, `Invalid redirect rows: ${invalid.length}`)
}

function testCategoryPatternsShapeAndPredictor() {
  const model = loadCategoryPatterns(patternsPath)
  const expectedCategories = new Set([
    'levesek',
    'zoldsegetelek',
    'haletelek',
    'husetelek',
    'egytaletelek',
    'koretek-italok-hidegkonyha',
    'sos-edes-sutemenyek-desszertek-tesztak',
  ])
  assert.equal(model.categories.length, expectedCategories.size, 'Unexpected category count in pattern file')
  for (const category of expectedCategories) {
    assert.ok(model.categories.includes(category), `Missing category in pattern file: ${category}`)
  }

  const prediction = predictRecipeCategory({
    title: 'Tarkonyos zoldsegleves csirkehussal',
    ingredientNames: ['csirkemell', 'sargarepa', 'zeller', 'petrezselyemgyoker', 'tarkony'],
  })
  assert.ok(prediction.predictedCategory, 'Predictor did not return a top category')

  const husKeywordBoost = predictRecipeCategory({
    title: 'Serteskaraj steak tepsis zoldsegekkel',
    ingredientNames: [],
  })
  assert.equal(
    husKeywordBoost.category,
    'husetelek',
    'Meat keywords in title should boost prediction toward husetelek'
  )

  const levesInTitle = predictRecipeCategory({
    title: 'Szederleves',
    ingredientNames: [],
  })
  assert.equal(levesInTitle.category, 'levesek', 'Title containing leves should boost toward levesek')
  assert.equal(levesInTitle.reason, 'title-proof')

  const koretInInstructions = predictRecipeCategory({
    title: 'Narancsos savanyú káposzta',
    ingredientNames: ['fejes káposzta', 'narancs'],
    instructions: ['Keverjük össze, és tálaljuk köretként a sült hús mellé.'],
  })
  assert.equal(
    koretInInstructions.category,
    'koretek-italok-hidegkonyha',
    'Instruction mention of köret should boost toward koretek-italok-hidegkonyha'
  )

  const sourcePathProof = predictRecipeCategory({
    title: 'Rantasos retesvariaciok',
    ingredientNames: [],
    sourcePath: 'receptsarok/desszertek/rantasos-retesvariaciok',
  })
  assert.equal(
    sourcePathProof.category,
    'sos-edes-sutemenyek-desszertek-tesztak',
    'sourcePath category-part token should act as proof'
  )
  assert.equal(sourcePathProof.reason, 'source-path-proof')

  const stuffedWithMeat = predictRecipeCategory({
    title: 'Toltott paprika',
    ingredientNames: ['daralthus', 'rizs'],
  })
  assert.equal(stuffedWithMeat.category, 'husetelek', 'Stuffed + meat should map to husetelek')

  const stuffedWithGreens = predictRecipeCategory({
    title: 'Toltott sutotok',
    ingredientNames: ['sutotok', 'gomba', 'cukkini'],
  })
  assert.equal(stuffedWithGreens.category, 'zoldsegetelek', 'Stuffed + greens should map to zoldsegetelek')

  const stuffedWithSweet = predictRecipeCategory({
    title: 'Toltott alma',
    ingredientNames: ['alma', 'dio'],
  })
  assert.equal(
    stuffedWithSweet.category,
    'sos-edes-sutemenyek-desszertek-tesztak',
    'Stuffed + fruits/nuts should map to sweets category'
  )

  const stuffedNoSoup = predictRecipeCategory({
    title: 'Toltott valami',
    ingredientNames: ['rizs'],
  })
  assert.notEqual(stuffedNoSoup.predictedCategory, 'levesek', 'Stuffed title must not end up in levesek')

  const ingredientMeatProof = predictRecipeCategory({
    title: 'Etvagyhozo husgolyok',
    ingredientNames: ['sovany daralt marhahus', 'voroshagyma'],
    sourcePath: '/cikkek/diabetes/1806/karacsonyi-receptsarok/etvagyhozo-husgolyok-svedorszagbol',
  })
  assert.equal(ingredientMeatProof.category, 'husetelek', 'Explicit meat ingredient should map to husetelek')
  assert.equal(ingredientMeatProof.reason, 'ingredient-proof-meat')

  const titleSoupBeatsMeat = predictRecipeCategory({
    title: 'Kanadai sargaborsoleves sonkaval',
    ingredientNames: ['sargaborso', 'sonka'],
    sourcePath: '/cikkek/diabetes/1905/kanadai-sargaborsoleves-sonkaval',
  })
  assert.equal(titleSoupBeatsMeat.category, 'levesek', 'Leves in title should keep soup category generally')
  assert.equal(titleSoupBeatsMeat.reason, 'title-proof')

  const rakottProof = predictRecipeCategory({
    title: 'Rakott karfiol',
    ingredientNames: ['karfiol', 'tejfol', 'sajt'],
  })
  assert.equal(rakottProof.category, 'egytaletelek', 'Rakott in title should map to egytaletelek')
  assert.equal(rakottProof.reason, 'title-proof')

  const ingredientGreensProof = predictRecipeCategory({
    title: 'Spenotos gombas arpas pilaf',
    ingredientNames: ['gomba', 'bebispenot', 'voroshagyma'],
    sourcePath: '/cikkek/diabetes/1905/spenotos-gombas-arpas-pilaf',
  })
  assert.equal(
    ingredientGreensProof.category,
    'zoldsegetelek',
    'Vegetable-only ingredient profile without soup signal should map to zoldsegetelek'
  )
  assert.equal(ingredientGreensProof.reason, 'ingredient-proof-greens')
}

function testUncategorizedQueueConsistency() {
  const redirects = readJson(redirectsPath)
  const redirectKeySet = new Set(
    (Array.isArray(redirects?.entries) ? redirects.entries : []).map((entry) => `${entry.year}-${entry.id}`)
  )
  const recipes = readJson(recipesPath)
  const recipeKeySet = new Set((Array.isArray(recipes) ? recipes : []).map((recipe) => `${recipe.year}-${recipe.id}`))

  if (!fs.existsSync(uncategorizedPath)) return
  const queue = readJson(uncategorizedPath)
  const entries = Array.isArray(queue?.entries) ? queue.entries : []
  const conflictingRedirects = entries.filter((entry) => redirectKeySet.has(String(entry?.key ?? '').replace('/', '-')))
  const conflictingRecipes = entries.filter((entry) => recipeKeySet.has(String(entry?.key ?? '').replace('/', '-')))
  assert.equal(
    conflictingRedirects.length,
    0,
    `Uncategorized entries unexpectedly present in redirects: ${conflictingRedirects.length}`
  )
  assert.equal(
    conflictingRecipes.length,
    0,
    `Uncategorized entries unexpectedly present in recipes.json: ${conflictingRecipes.length}`
  )
}

testComparatorOrder()
testPickRedirectTargetPrefersRsBookletYear()
testAuthorGate()
testParserEntityAndYearResilience()
testParserNutritionFallbackFromParagraphs()
testParserIngredientAndServingFallbacks()
testParserParagraphIngredientsAndSubrecipes()
testParserDoesNotTreatRelatedLinksAsSubrecipe()
testParsedBranchBCompleteness()
testRedirectsShape()
testCategoryPatternsShapeAndPredictor()
testUncategorizedQueueConsistency()

console.log('validate-recipe-dedupe-v2: OK')
