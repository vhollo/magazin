import { doc, getDoc, collection, getDocs } from 'firebase/firestore/lite';
import { db } from '$lib/firebase';

/* type Banner = {
  name?: string;
  prominent?: boolean;
  // related_banners: EntityReference[];
  link?: string;
  video?: string;
  image?: string;
  height?: number;
  starts_on?: Date;
  expires_on?: Date;
} */

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
      // console.log("Config data:", confSnap.data());
      let data = confSnap.data()
      // console.log(data.side_banners)
      let sidebanners = []
      let topbanners = []
      const bansCol = collection(db, 'config/site/banners');
      const bansSnap = await getDocs(bansCol);
      if (bansSnap.docs.length) {
        await data.side_banners.forEach(ban => {
          // const bSnap = await getDoc(bRef);
          // console.log('bansSnap.docs',bansSnap.docs)
          const bId = ban._key.path.segments.pop()
          // console.log(bId)
          const bSnap = bansSnap.docs.find(b => bId == b.id)
          ban = bSnap?.data() || {name:'NOOOES'}
          // console.log(ban)
          sidebanners.push(ban)
          // if (bSnap.exists()) sBanners.push(bSnap.data())
        });
        await data.top_banners.forEach(ban => {
          // const bSnap = await getDoc(bRef);
          // console.log('bansSnap.docs',bansSnap.docs)
          const bId = ban._key.path.segments.pop()
          // console.log(bId)
          const bSnap = bansSnap.docs.find(b => bId == b.id)
          ban = bSnap?.data() || {name:'NOOOES'}
          // console.log(ban)
          topbanners.push(ban)
          // if (bSnap.exists()) sBanners.push(bSnap.data())
        });
      }
      data.side_banners = sidebanners
      data.top_banners = topbanners
      // console.log({data})
      return data; //confSnap.data();
    } else {
      console.log("No such document!");
      return {};
    }
  } catch (error) {
    console.error("Error getting document:", error);
    return {};
  }
};