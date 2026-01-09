// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';
import { getStorage } from "firebase/storage";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVyovmUsGl5u7ovIoJHSbq6TP-zWUCiKU",
  authDomain: "instashare-b328c.firebaseapp.com",
  databaseURL: "https://instashare-b328c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "instashare-b328c",
  storageBucket: "instashare-b328c.appspot.com",
  messagingSenderId: "552445805110",
  appId: "1:552445805110:web:833842421ea3ac1b8ece97",
  measurementId: "G-YSVDTJVDSY"
};

// Initialize Firebase
const firebase = initializeApp(firebaseConfig);

export const analytics = getAnalytics(firebase);
export const database = getDatabase(firebase);
export const auth = getAuth(firebase);
export const storage = getStorage(firebase);


export const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account"
});

const appleProvider = new OAuthProvider('apple.com');

export const signInWithGooglePopup = () => signInWithPopup(auth, provider);
export const signInWithApplePopup = () => signInWithPopup(auth, appleProvider);

export default firebase;
