import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_APP_ID
} from '$env/static/public';
import { initializeApp, getApps } from 'firebase/app';
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore/lite';
import type { Firestore } from 'firebase/firestore/lite';
import { getAuth/*, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, onAuthStateChanged */ } from 'firebase/auth';

const firebaseConfig = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
let firebaseApp, db:Firestore

if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
  // const analytics = getAnalytics(firebaseApp);
  db = getFirestore(firebaseApp);
}

// Auth
const firebaseAuth = getAuth(firebaseApp);
// console.log('firebaseAuth', firebaseAuth)


export { db, firebaseAuth };