import { doc, getDoc, collection, getDocs } from 'firebase/firestore/lite';
import { db } from '$lib/firebase';

import { /* browser,  */building , dev/*, version */ } from '$app/environment';
import fs from 'fs';
import path from 'path';
async function writeData(data: object) {
  // console.log('writeData',data)
  const outputPath = path.resolve(process.cwd(), 'static', 'conf.json');
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

/* export type SiteConf = {
  status?: boolean;
  sitename?: string;
  description?: string;
  tags?: string[];
  site_email?: string;
  main_image?: string;
  sidebanners?: Banner[];
  topbanners?: Banner[];
  side_banners?: Banner[];
  top_banners?: Banner[];
} */

export const getSiteConf = async () => {
  if (building || dev) {
    try {
      const confRef = doc(db, 'config/site');
      const confSnap = await getDoc(confRef);
      // console.log({confSnap})

      if (confSnap.exists()) {
        let data = confSnap.data()

        // Empty the banners directory before writing new files
        const bannersDir = path.resolve(process.cwd(), 'static', 'banners');
        if (fs.existsSync(bannersDir)) {
          fs.rmSync(bannersDir, { recursive: true, force: true });
        }
        fs.mkdirSync(bannersDir, { recursive: true });
        // console.log(data.side_banners)
        const processBanner = (ban: any, i: number) => {
          const bId = ban._key.path.segments.pop();
          const bSnap = bansSnap.docs.find(b => bId == b.id);
          if (bSnap?.data()) {
            const b = bSnap.data() as Banner;
            if (b.video) {
              const videoUrl = b.video;
              return fetch(videoUrl)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => {
                  const buffer = Buffer.from(arrayBuffer);
                  const videoExt = videoUrl.split('.').pop()?.split('?')[0];
                  if (videoExt) b.videoext = videoExt;
                  const outputPath = path.resolve(process.cwd(), 'static', 'banners', `${i}.${b.videoext}`);
                  fs.writeFileSync(outputPath, buffer);
                  // console.log(`File saved successfully: ${outputPath}`);
                  b.video = `/banners/${i}.${b.videoext}`;
                  return b;
                });
            }
            if (b.image) {
              const imageUrl = b.image;
              return fetch(imageUrl)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => {
                  const buffer = Buffer.from(arrayBuffer);
                  if (b.image) {
                    const parts = b.image.split('.').pop();
                    if (parts) {
                      b.imageext = parts.split('?')[0];
                    }
                  }
                  const outputPath = path.resolve(process.cwd(), 'static', 'banners', `${i}.${b.imageext}`);
                  fs.writeFileSync(outputPath, buffer);
                  // console.log(`File saved successfully: ${outputPath}`);
                  b.image = `/banners/${i}.${b.imageext}`;
                  return b;
                });
            }
            return Promise.resolve(b);
          }
          return Promise.resolve(null);
        };

        const bansColl = collection(db, 'config/site/banners');
        const bansSnap = await getDocs(bansColl);
        if (bansSnap.docs.length) {
          let i = 0;
          const sideBannerPromises = data.side_banners.map((ban: any) => processBanner(ban, i++));
          const topBannerPromises = data.top_banners.map((ban: any) => processBanner(ban, i++));

          const resolvedSideBanners = await Promise.all(sideBannerPromises);
          data.side_banners = resolvedSideBanners.filter(b => b !== null);

          const resolvedTopBanners = await Promise.all(topBannerPromises);
          data.top_banners = resolvedTopBanners.filter(b => b !== null);
        }
        data.ads_distance = 4
        // console.log({data})
        writeData(data)
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
};