// firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseRealTimeDBConfig = {
  apiKey: "AIzaSyAEnopzXtZxCHWWhd14GCLIz0F_uUM2IQ4",
  authDomain: "react-native-7388b.fi€rebaseapp.com",
  databaseURL:
    "https://react-native-7388b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "react-native-7388b",
  storageBucket: "react-native-7388b.appspot.com",
  messagingSenderId: "105714972241",
  appId: "1:105714972241:web:d7297a992a6f1bbeb8aa70",
  measurementId: "G-2BPK388DFZ",
};

// Initialize Firebase
const app = initializeApp(firebaseRealTimeDBConfig);

const database = getDatabase(app);
const storage = getStorage(app);
const firestoreDB = getFirestore(app);

// Initialize Auth with AsyncStorage for persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { database, storage, auth, firestoreDB };
