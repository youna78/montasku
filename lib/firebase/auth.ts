import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  getAuth,
  getIdToken,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { getFirebaseApp } from "./client";
import { isNativeMobileApp } from "@/lib/platform/capacitor";

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

export async function signInWithGoogleNative() {
  await ensurePersistence();
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  let result;
  try {
    result = await FirebaseAuthentication.signInWithGoogle({
      skipNativeAuth: true,
      scopes: ["email", "profile"],
      useCredentialManager: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("Cannot find a matching credential") && !message.includes("NoCredential")) {
      throw error;
    }
    result = await FirebaseAuthentication.signInWithGoogle({
      skipNativeAuth: true,
      scopes: ["email", "profile"],
      useCredentialManager: false
    });
  }
  const credential = result.credential;
  if (!credential?.idToken && !credential?.accessToken) {
    throw new Error("auth/native-google-credential-missing");
  }

  const firebaseCredential = GoogleAuthProvider.credential(credential.idToken, credential.accessToken);
  return signInWithCredential(getFirebaseAuth(), firebaseCredential);
}

function createAppleProvider() {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return provider;
}

export async function signInWithApplePopup() {
  await ensurePersistence();
  return signInWithPopup(getFirebaseAuth(), createAppleProvider());
}

export async function signInWithAppleRedirect() {
  await ensurePersistence();
  return signInWithRedirect(getFirebaseAuth(), createAppleProvider());
}

export async function signInWithAppleNative() {
  await ensurePersistence();
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  const result = await FirebaseAuthentication.signInWithApple({
    skipNativeAuth: true
  });
  const credential = result.credential;
  if (!credential?.idToken) {
    throw new Error("auth/native-apple-credential-missing");
  }

  const provider = createAppleProvider();
  const firebaseCredential = provider.credential({
    idToken: credential.idToken,
    accessToken: credential.accessToken,
    rawNonce: credential.nonce
  });
  return signInWithCredential(getFirebaseAuth(), firebaseCredential);
}

export async function signInWithGoogle() {
  if (isNativeMobileApp()) {
    return signInWithGoogleNative();
  }

  const userAgent = typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : "";
  const isTouchDevice = typeof window !== "undefined"
    ? window.matchMedia?.("(pointer: coarse)")?.matches ?? false
    : false;

  if (/iphone|ipad|ipod|android/.test(userAgent) || isTouchDevice) {
    return signInWithGoogleRedirect();
  }

  return signInWithGooglePopup();
}

export async function signInWithApple() {
  if (isNativeMobileApp()) {
    return signInWithAppleNative();
  }

  const userAgent = typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : "";
  const isTouchDevice = typeof window !== "undefined"
    ? window.matchMedia?.("(pointer: coarse)")?.matches ?? false
    : false;

  if (/iphone|ipad|ipod|android/.test(userAgent) || isTouchDevice) {
    return signInWithAppleRedirect();
  }

  return signInWithApplePopup();
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
