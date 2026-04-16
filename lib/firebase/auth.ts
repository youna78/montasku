import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  getAuth,
  getIdToken,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { getFirebaseApp } from "./client";

let persistenceReady: Promise<void> | null = null;

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

async function ensurePersistence() {
  if (!persistenceReady) {
    const auth = getFirebaseAuth();
    persistenceReady = setPersistence(auth, browserLocalPersistence).then(() => undefined);
  }
  return persistenceReady;
}

export async function signInWithGooglePopup() {
  await ensurePersistence();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });

  return signInWithPopup(getFirebaseAuth(), provider);
}

export async function signInWithGoogleRedirect() {
  await ensurePersistence();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });

  return signInWithRedirect(getFirebaseAuth(), provider);
}

export async function consumeGoogleRedirectResult() {
  await ensurePersistence();
  return getRedirectResult(getFirebaseAuth());
}

export async function signInWithEmail(email: string, password: string) {
  await ensurePersistence();
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  await ensurePersistence();
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function sendVerificationEmail() {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("auth/no-current-user");
  }

  return sendEmailVerification(currentUser);
}

export async function sendResetPasswordEmail(email: string) {
  await ensurePersistence();
  return sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function getCurrentUserIdToken(forceRefresh = false) {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error("auth/no-current-user");
  }

  return getIdToken(currentUser, forceRefresh);
}

export async function signOutFirebase() {
  return signOut(getFirebaseAuth());
}
