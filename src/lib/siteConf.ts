import { doc, getDoc, collection, getDocs } from 'firebase/firestore/lite';
import { db } from '$lib/firebase';

export type Banner = {
  // _key?: DocumentKey;
  name: string;
  prominent?: boolean;
  // related_banners: EntityReference[];
  link?: string;
  video?: string;
  image?: string;
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
        await data.top_banners.forEach((ban:any) => {
          // const bSnap = await getDoc(bRef);
          // console.log('bansSnap.docs',bansSnap.docs)
          const bId = ban._key.path.segments.pop()
          // console.log(bId)
          const bSnap = bansSnap.docs.find(b => bId == b.id)
          // const b = bSnap?.data()// || {name:'NOOOES'}
          // console.log(ban)
          if (bSnap?.data()) topbanners.push(bSnap.data())
            // if (bSnap.exists()) sBanners.push(bSnap.data())
        });
      }
      data.side_banners = sidebanners
      data.top_banners = topbanners
      data.ads_distance = 4
      // console.log({data})
      return data; //confSnap.data();
    } else {
      console.log("No banners!");
      return {};
    }
  } catch (error) {
    console.error("Error getting banners:", error);
    return {};
  }
};