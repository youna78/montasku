import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseApp } from "./client";

export function getFirebaseFirestore() {
  return getFirestore(getFirebaseApp());
}

export async function ensureUserDocument(user: User) {
  const db = getFirebaseFirestore();
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  const payload: Record<string, unknown> = {
    userId: user.uid,
    displayName: user.displayName ?? null,
    email: user.email ?? null,
    updatedAt: serverTimestamp()
  };

  if (!snapshot.exists()) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(userRef, payload, { merge: true });
}

