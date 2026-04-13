// import { doc, getDoc, collection, getDocs } from 'firebase/firestore/lite';
// import { db } from '$lib/firebase';
import { db } from '$lib/firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

import { /* browser,  */building , dev/*, version */ } from '$app/environment';
import fs from 'fs';
import path from 'path';
async function writeData(data: object | object[], filename: string) {
  // console.log('writeData',data)
  const outputPath = path.resolve(process.cwd(), 'src/lib/data', filename);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  // console.log(`Conf sikeresen mentve: ${outputPath}`);
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

async function loadRecipesUncached(): Promise<unknown[]> {
  if (building || dev) {
    try {
      const recipesRef = db.collection('recipes');
      const recipesSnap = await recipesRef.get();
      if (recipesSnap.empty) {
        if (dev) console.log('No recipes in Firestore, using local JSON');
        const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'recipes.json'), 'utf-8');
        return JSON.parse(data);
      }
      const recipesData = recipesSnap.docs.map((doc: QueryDocumentSnapshot) => {
        const data: any = { ...doc.data() }
        data.createdAt = data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt
        data.updatedAt = data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt
        return data
      })
      writeData(recipesData, 'recipes.json')
      return recipesData
    } catch (error) {
      console.error("Error getting recipes:", error);
      const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'recipes.json'), 'utf-8');
      return JSON.parse(data);
    }
  }
  const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'recipes.json'), 'utf-8');
  return JSON.parse(data);
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
  if (!recipesMemo) {
    recipesMemo = loadRecipesUncached().catch((e) => {
      recipesMemo = null
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
