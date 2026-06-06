import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKF87Z9R7L2SIMZP73AwycVHfbHAwcDeQ",
  authDomain: "battleramp-pwa.firebaseapp.com",
  databaseURL: "https://battleramp-pwa.firebaseio.com",
  projectId: "battleramp-pwa",
  storageBucket: "battleramp-pwa.appspot.com",
  messagingSenderId: "468109256032",
  appId: "1:468109256032:web:30b6a7cf9d45a02b63aa05",
  measurementId: "G-5QZTT0C31F"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };
