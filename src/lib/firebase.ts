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
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut/* , onAuthStateChanged */ } from 'firebase/auth';

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

const provider = new GoogleAuthProvider();

function signInWithGoogle() {
  signInWithPopup(firebaseAuth, provider)
    .then((result) => {
      // This gives you a Google Access Token. You can use it to access the Google API.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      // The signed-in user info.
      // const user = result.user;
      $authUser = result.user;
      console.log("Successfully signed in with Google!", $authUser);
      // ... You can now update your UI to show the user is logged in
    })
    .catch((error) => {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      const email = error.customData.email;
      // The AuthCredential type that was used.
      const credential = GoogleAuthProvider.credentialFromError(error);
      console.error("Error during Google sign-in:", errorMessage);
      success = false;
    });
}

// You would call signInWithGoogle() when a button is clicked, e.g.:
// document.getElementById('google-signin-button').addEventListener('click', signInWithGoogle);


export { db, firebaseAuth, signInWithGoogle };