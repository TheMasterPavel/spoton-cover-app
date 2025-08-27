
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// IMPORTANT: This is your actual Firebase config object.
const firebaseConfig = {
  "projectId": "spoton-cover",
  "appId": "1:727089932575:web:b17a0d5bbbae9e8aa8282a",
  "storageBucket": "spoton-cover.firebasestorage.app",
  "apiKey": "AIzaSyDdhsVivN6SkzsHAba2RqTKC4eER_QdRpU",
  "authDomain": "spoton-cover.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "727089932575"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

export { app, storage };
