import { doc, getDoc, collection, getDocs } from 'firebase/firestore/lite';
// import { db } from '$lib/firebase';
import { db } from '$lib/firebase-admin';

import { /* browser,  */building , dev/*, version */ } from '$app/environment';
import fs from 'fs';
import path from 'path';
async function writeData(data: object | object[], filename: string) {
  // console.log('writeData',data)
  const outputPath = path.resolve(process.cwd(), 'static', filename);
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
              if (b.image) {
                const parts = b.image.split('.').pop();
                if (parts) {
                  b.imageext = parts.split('?')[0];
                }
              }
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
    const data = fs.readFileSync(path.resolve(process.cwd(), 'static', 'conf.json'), 'utf-8');
    // console.log(data)
    return JSON.parse(data);
  }
}


export const getKvizConf = async () => {
  if (building || dev) {
    try {
      const kvizRef = db.collection('kviz');
      const kvizSnap = await kvizRef.get();
      const kvizData = kvizSnap.docs.filter(doc => doc.data().status).map(doc => {
        const id = doc._ref._path.segments.pop()
        const data = {id: id, ...doc.data()}
        data.starts_on = data.starts_on?.toDate().toString();
        return data;
      }).reverse() || [];
      writeData(kvizData, 'kviz.json')
      return kvizData;
    } catch (error) {
      console.error("Error getting kviz:", error);
      return []
    }
  } else {
    const data = fs.readFileSync(path.resolve(process.cwd(), 'static', 'kviz.json'), 'utf-8');
    // console.log(data)
    return JSON.parse(data);
  }
}
