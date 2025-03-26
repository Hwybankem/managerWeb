import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDk47IjfGi7oXk98lz5jEt2fhrwJlyOTP4",
  authDomain: "ecomerce-4651d.firebaseapp.com",
  projectId: "ecomerce-4651d",
  storageBucket: "ecomerce-4651d.firebasestorage.app",
  messagingSenderId: "1071079126935",
  appId: "1:1071079126935:web:4a95a9d077c08b76c576d2"
};

// Initialize Firebase
export  const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);