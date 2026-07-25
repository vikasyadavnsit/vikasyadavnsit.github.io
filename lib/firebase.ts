import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAezEgo3Q2DusmraomdBbDAZwbl-A4Luck",
  authDomain: "portfolio-projects-773a3.firebaseapp.com",
  projectId: "portfolio-projects-773a3",
  databaseURL: "https://portfolio-projects-773a3-default-rtdb.firebaseio.com/",
  storageBucket: "portfolio-projects-773a3.firebasestorage.app",
  messagingSenderId: "596147560716",
  appId: "1:596147560716:web:1bb7abed5a287d7b2ce929",
  measurementId: "G-D5GJW3L7GJ"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

export { app, auth, db, storage };
