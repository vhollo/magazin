import { doc, getDoc, collection, getDocs } from 'firebase/firestore/lite';
import { db } from '$lib/firebase';

import { /* browser,  */building , dev/*, version */ } from '$app/environment';
import fs from 'fs';
import path from 'path';
async function writeData(data: object[]) {
  console.log('writeData',data.length)
  const outputPath = path.resolve(process.cwd(), 'static', 'conf.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Conf sikeresen mentve: ${outputPath}`);
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
        // console.log(data.side_banners)
        let sidebanners:Banner[] = []
        let topbanners:Banner[] = []
        const bansColl = collection(db, 'config/site/banners');
        const bansSnap = await getDocs(bansColl);
        if (bansSnap.docs.length) {
          await data.side_banners.forEach((ban:any) => {
            // const bSnap = await getDoc(bRef);
            // console.log('ban._key',ban._key)
            const bId = ban._key.path.segments.pop()
            // console.log(bId)
            const bSnap = bansSnap.docs.find(b => bId == b.id)
            // let b:Banner 
            // b = bSnap?.data()// || {name:'NOOOES'}
            // console.log(ban)
            if (bSnap?.data()) sidebanners.push(bSnap.data())
            // if (bSnap.exists()) sBanners.push(bSnap.data())
          });
          const topBannerPromises = data.top_banners.map((ban: any, i: number) => {
            const bId = ban._key.path.segments.pop();
            const bSnap = bansSnap.docs.find(b => bId == b.id);
            if (bSnap?.data()) {
              const b: Banner = bSnap.data();
              if (b.video) {
                return fetch(b.video)
                  .then(response => response.arrayBuffer()) // Get the response body as an ArrayBuffer
                  .then(arrayBuffer => {
                    const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to a Buffer
                    // check file videoextension and trim any url params
                    b.videoext = b.video.split('.').pop().split('?')[0]
                    const outputPath = path.resolve(process.cwd(), 'static', 'banners', `${i}.${b.videoext}`);
                    fs.writeFileSync(outputPath, buffer); // Write the buffer synchronously
                    console.log(`File saved successfully: ${outputPath}`);
                    b.video = `/banners/${i}.${b.videoext}`; // Update the path to be relative to the static dir
                    return b;
                  });
              }
              if (b.image) {
                return fetch(b.image)
                  .then(response => response.arrayBuffer()) // Get the response body as an ArrayBuffer
                  .then(arrayBuffer => {
                    const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to a Buffer
                    // check file videoextension and trim any url params
                    b.imageext = b.image.split('.').pop().split('?')[0]
                    const outputPath = path.resolve(process.cwd(), 'static', 'banners', `${i}.${b.imageext}`);
                    fs.writeFileSync(outputPath, buffer); // Write the buffer synchronously
                    console.log(`File saved successfully: ${outputPath}`);
                    b.image = `/banners/${i}.${b.imageext}`; // Update the path to be relative to the static dir
                    return b;
                  });
              }
              return Promise.resolve(b); // Return banner if no video
            }
            return Promise.resolve(null); // Return null if no banner data
          });

          // Wait for all file saving operations to complete
          const resolvedBanners = await Promise.all(topBannerPromises);
          topbanners = resolvedBanners.filter(b => b !== null); // Filter out nulls
        }
        data.side_banners = sidebanners
        data.top_banners = topbanners
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
    console.log(data)
    return JSON.parse(data);
  }
};