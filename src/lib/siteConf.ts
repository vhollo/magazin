// import { doc, getDoc, collection, getDocs } from 'firebase/firestore/lite';
// import { db } from '$lib/firebase';
import { db } from '$lib/firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

import { /* browser,  */building , dev/*, version */ } from '$app/environment';
import { recipeHeroToCardImg } from '$lib/receptsarok';
import { stringifyRecipesJson } from '$lib/recipesJsonFormat.js';
import fs from 'fs';
import path from 'path';
async function writeData(
  data: object | object[],
  filename: string,
  serialize: (data: object | object[]) => string = (d) => JSON.stringify(d, null, 2)
) {
  const outputPath = path.resolve(process.cwd(), 'src/lib/data', filename);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const next = serialize(data);
  try {
    const prev = fs.readFileSync(outputPath, 'utf-8');
    if (prev === next) return;
  } catch {
    // file missing — write below
  }
  fs.writeFileSync(outputPath, next);
}

export type Banner = {
  // _key?: DocumentKey;
  name: string;
  prominent?: boolean;
  // related_banners: EntityReference[];
  link?: string;
  video?: string;
  videoext?: string;
  image?: string;
  imageext?: string;
  height?: number;
  starts_on?: Date;
  expires_on?: Date;
}

export type SiteConf = {
	status?: boolean;
	sitename?: string;
	description?: string;
	tags?: string[];
	site_email?: string;
	main_image?: string;
	side_banners?: Banner[];
	top_banners?: Banner[];
	ads_distance?: number;
}

export const getSiteConf = async () => {
  if (building || dev) {
    try {
      const confRef = db.collection('config').doc('site');
      const confSnap = await confRef.get();
      // console.log({confSnap})

      if (confSnap.exists) {
        // Empty the banners directory before writing new files
        const bannersDir = path.resolve(process.cwd(), 'static', 'banners');
        if (fs.existsSync(bannersDir)) {
          fs.rmSync(bannersDir, { recursive: true, force: true });
        }
        fs.mkdirSync(bannersDir, { recursive: true });

        const processBanner = async (ban: any, i: number) => {
          // console.log(ban)
          const bId = ban._path.segments.pop();
          const bSnap = bansSnap.docs.find(b => bId == b.id);
          if (bSnap?.data()) {
            const b = bSnap.data() as Banner;
            if (b.video) {
              const videoUrl = b.video;
              const response = await fetch(videoUrl);
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const videoExt = videoUrl.split('.').pop()?.split('?')[0];
              if (videoExt) b.videoext = videoExt;
              const outputPath = path.resolve(process.cwd(), 'static', 'banners', `${i}.${b.videoext}`);
              fs.writeFileSync(outputPath, buffer);
              // console.log(`File saved successfully: ${outputPath}`);
              b.video = `/banners/${i}.${b.videoext}`;
              return b;
            }
            if (b.image) {
              const imageUrl = b.image;
              const response_1 = await fetch(imageUrl);
              const arrayBuffer_1 = await response_1.arrayBuffer();
              const buffer_1 = Buffer.from(arrayBuffer_1);
              // if (b.image) {
                const parts = b.image.split('.').pop();
                if (parts) {
                  b.imageext = parts.split('?')[0];
                }
              // }
              const outputPath_1 = path.resolve(process.cwd(), 'static', 'banners', `${i}.${b.imageext}`);
              fs.writeFileSync(outputPath_1, buffer_1);
              // console.log(`File saved successfully: ${outputPath}`);
              b.image = `/banners/${i}.${b.imageext}`;
              return b;
            }
            return Promise.resolve(b);
          }
          return Promise.resolve(null);
        };

        const data = confSnap.data() as SiteConf;
        const bansColl = db.collection('config/site/banners');
        const bansSnap = await bansColl.get();

        // console.log(data.side_banners)
        if (bansSnap.docs.length) {
          let i = 0;
          const sideBannerPromises = data.side_banners?.map((ban: any) => processBanner(ban, i++)) ?? [];
          const topBannerPromises = data.top_banners?.map((ban: any) => processBanner(ban, i++)) ?? [];

          const resolvedSideBanners = await Promise.all(sideBannerPromises);
          data.side_banners = resolvedSideBanners.filter(b => b !== null);

          const resolvedTopBanners = await Promise.all(topBannerPromises);
          data.top_banners = resolvedTopBanners.filter(b => b !== null);
        }
        data.ads_distance = 4
        // console.log({data})
        writeData(data, 'conf.json')
        return data; //confSnap.data();
      } else {
        console.log("No banners!");
        return {};
      }
    } catch (error) {
      console.error("Error getting banners:", error);
      return {};
    }
  } else {
    const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'conf.json'), 'utf-8');
    // console.log(data)
    return JSON.parse(data);
  }
}


export const getKviz = async () => {
  if (building || dev) {
    try {
      const kvizRef = db.collection('kviz');
      const kvizSnap = await kvizRef.get();
      const kvizData = kvizSnap.docs.filter((doc: QueryDocumentSnapshot) => doc.data().status).map((doc: QueryDocumentSnapshot) => {
        // console.log ('doc:', doc);
        const id = doc.ref.path.split('/').pop()
        const data: any = {id: id, ...doc.data()}
        data.starts_on = data.starts_on ? data.starts_on.toDate() : undefined
        data.expires_on = data.expires_on ? data.expires_on.toDate() : undefined
        // console.log(data.questions)//.map(q => q.score))
        data.max_score = data.questions?.reduce((acc: number, question: any) => acc + (question.options?.reduce((optionAcc: number, option: any) => optionAcc + (option.score > 0 ? option.score : 0), 0) || 0), 0) || 0
        return data;
      }).sort((a, b) => b.starts_on - a.starts_on) || [];
      writeData(kvizData, 'kviz.json')
      return kvizData;
    } catch (error) {
      console.error("Error getting kviz:", error);
      return []
    }
  } else {
    const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'kviz.json'), 'utf-8');
    // console.log(data)
    return JSON.parse(data);
  }
}

export const getPatika = async () => {
  if (building || dev) {
    try {
      const patikaRef = db.collection('tables/elofizetok/patika');
      const patikaSnap = await patikaRef.get();
      const patikaData = patikaSnap.docs.flatMap(doc => doc.data())
      writeData(patikaData, 'patika.json')
      return patikaData;
    } catch (error) {
      console.error("Error getting patika:", error);
      return []
    }
  } else {
    const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'patika.json'), 'utf-8');
    // console.log(data)
    return JSON.parse(data);
  }
}

/** One shared in-flight / resolved result per process (dev server, prerender worker). */
let recipesMemo: Promise<unknown[]> | null = null
let categoriesMemo: Promise<unknown[]> | null = null
let recipesMemoCacheKey: string | null = null

/** Fold the legacy `image` hero field into canonical `img` and drop it (recipe + subRecipes). */
function consolidateRecipeImg(data: any): any {
  const cardImg = recipeHeroToCardImg(data.year, data.image, data.img)
  if (cardImg) {
    data.img = cardImg
  } else {
    delete data.img
  }
  delete data.image
  if (Array.isArray(data.subRecipes)) {
    data.subRecipes = data.subRecipes.map((sub: any) => {
      if (!sub || typeof sub !== 'object') return sub
      const { image, ...rest } = sub
      const subImg = recipeHeroToCardImg(data.year, image, sub.img)
      if (subImg) rest.img = subImg
      else delete rest.img
      return rest
    })
  }
  return data
}

function normalizeRecipeForExport(rawData: any): any | null {
  const data: any = { ...rawData }
  data.createdAt = data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt
  data.updatedAt = data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt
  data.free =
    data.free === true ||
    (typeof data.free === 'string' && data.free.trim().toLowerCase() === 'true')

  return consolidateRecipeImg(data)
}

function toRuntimeRecipe(data: any): any {
  return consolidateRecipeImg({ ...data })
}

function parseRecipesJson(raw: string): any[] {
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) return []
  return parsed.map(toRuntimeRecipe)
}

function parseRecipesForExport(raw: string): any[] {
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((item) => normalizeRecipeForExport(item))
    .filter(Boolean)
}

function getRecipesCacheKeyForDev(): string {
  // Stable for the process — do not key off mtime (writeData used to bump it every SSR load).
  return 'dev';
}

/** Sidecar marker so dev/build skip the full `recipes` collection scan when nothing changed. */
const RECIPES_REV_SIDECAR = '.recipes-rev.json'

function readLocalRecipesRevision(): string | null {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', RECIPES_REV_SIDECAR), 'utf-8');
    const revision = JSON.parse(raw)?.revision
    return typeof revision === 'string' && revision ? revision : null
  } catch {
    return null
  }
}

async function loadRecipesUncached(): Promise<unknown[]> {
  if (building || dev) {
    try {
      // sync:recipes:apply stamps a revision into meta/recipesUpload; when it
      // matches our sidecar the local JSON is current — 1 read instead of one
      // per recipe, and local recipes.json edits survive dev restarts.
      const uploadSnap = await db.collection('meta').doc('recipesUpload').get();
      const revision = uploadSnap.exists ? (uploadSnap.data()?.revision as string | undefined) : undefined;
      if (revision && revision === readLocalRecipesRevision()) {
        if (dev) console.log('recipes unchanged (meta/recipesUpload revision match) — using local JSON');
        const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'recipes.json'), 'utf-8');
        return parseRecipesForExport(data).map(toRuntimeRecipe)
      }

      const recipesRef = db.collection('recipes');
      const recipesSnap = await recipesRef.get();
      if (recipesSnap.empty) {
        if (dev) console.log('No recipes in Firestore, using local JSON');
        const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'recipes.json'), 'utf-8');
        const recipesDataForExport = parseRecipesForExport(data)
        return recipesDataForExport.map(toRuntimeRecipe)
      }
      const recipesDataForExport = recipesSnap.docs
        .map((doc: QueryDocumentSnapshot) => normalizeRecipeForExport(doc.data()))
        .filter(Boolean)
      writeData(recipesDataForExport, 'recipes.json', stringifyRecipesJson)
      if (revision) writeData({ revision }, RECIPES_REV_SIDECAR)
      return recipesDataForExport.map(toRuntimeRecipe)
    } catch (error) {
      console.error("Error getting recipes:", error);
      const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'recipes.json'), 'utf-8');
      const recipesDataForExport = parseRecipesForExport(data)
      return recipesDataForExport.map(toRuntimeRecipe)
    }
  }
  const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'recipes.json'), 'utf-8');
  return parseRecipesJson(data);
}

async function loadCategoriesUncached(): Promise<unknown[]> {
  if (building || dev) {
    try {
      const catRef = db.collection('categories');
      const catSnap = await catRef.get();
      if (catSnap.empty) {
        if (dev) console.log('No categories in Firestore, using local JSON');
        const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'categories.json'), 'utf-8');
        return JSON.parse(data);
      }
      const catData = catSnap.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => a.order - b.order)
      writeData(catData, 'categories.json')
      return catData
    } catch (error) {
      console.error("Error getting categories:", error);
      const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'categories.json'), 'utf-8');
      return JSON.parse(data);
    }
  }
  const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'categories.json'), 'utf-8');
  return JSON.parse(data);
}

export const getRecipes = async () => {
  const cacheKey = dev ? getRecipesCacheKeyForDev() : 'static'
  if (!recipesMemo || recipesMemoCacheKey !== cacheKey) {
    recipesMemoCacheKey = cacheKey
    recipesMemo = loadRecipesUncached().catch((e) => {
      recipesMemo = null
      recipesMemoCacheKey = null
      throw e
    })
  }
  return recipesMemo as Promise<any[]>
}

export const getCategories = async () => {
  if (!categoriesMemo) {
    categoriesMemo = loadCategoriesUncached().catch((e) => {
      categoriesMemo = null
      throw e
    })
  }
  return categoriesMemo as Promise<any[]>
}

export const getScores = async () => {
  try {
    // Get all quizzes with status: true
    const activeKvizzes = await getKviz();
    
    if (!activeKvizzes || activeKvizzes.length === 0) {
      return [];
    }

    // Aggregate scores by name
    const scoreMap = new Map<string, number>();

    // Fetch scores sequentially to avoid connection issues
    for (const kviz of activeKvizzes) {
      try {
        if (!kviz?.id) continue;
        
        const scoresRef = db.collection(`kviz/${kviz.id}/scores`);
        const scoresSnap = await scoresRef.get();

        scoresSnap.docs.forEach((doc) => {
          const data = doc.data();
          const name = data.name;
          const score = Number(data.score) || 0;

          if (name && score > 0) {
            const currentTotal = scoreMap.get(name) || 0;
            scoreMap.set(name, currentTotal + score);
          }
        });
      } catch (error) {
        console.error(`Error fetching scores for quiz ${kviz.id}:`, error);
        // Continue with next quiz instead of failing completely
        continue;
      }
    }

    // Convert map to array and sort by score (descending)
    const leaderboard = Array.from(scoreMap.entries())
      .map(([name, totalScore]) => ({
        name,
        score: totalScore
      }))
      .sort((a, b) => b.score - a.score);

    return leaderboard;
  } catch (error) {
    console.error("Error getting scores:", error);
    return [];
  }
}
