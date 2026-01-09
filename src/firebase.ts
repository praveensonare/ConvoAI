// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';
import { getStorage } from "firebase/storage";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";

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

// Email Link Authentication
export const sendLoginLinkToEmail = async (email: string) => {
  const actionCodeSettings = {
    // URL you want to redirect back to after email link is clicked
    url: window.location.origin + '/login',
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  // Save the email locally so we can use it to complete sign-in
  window.localStorage.setItem('emailForSignIn', email);
};

export const completeSignInWithEmailLink = async () => {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');

    if (!email) {
      // If missing, prompt user for email (in case they opened link on different device)
      email = window.prompt('Please provide your email for confirmation');
    }

    if (email) {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      return result;
    }
  }
  return null;
};

export { isSignInWithEmailLink };

export default firebase;
