import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdminApp() {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const projectId = (process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    ?.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9._-]+$/g, "");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin environment variables are not configured.");
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getFirebaseAdminApp());
}
