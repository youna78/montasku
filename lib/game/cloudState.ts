import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { GameState } from "@/types/game";
import { getFirebaseFirestore } from "@/lib/firebase/firestore";

const GAME_STATE_SCHEMA_VERSION = 1;

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .map(([key, nested]) => [key, stripUndefined(nested)])
    ) as T;
  }

  return value;
}

function getGameStateDocRef(uid: string) {
  return doc(getFirebaseFirestore(), "users", uid, "game", "state");
}

export async function loadCloudGameState(uid: string): Promise<Partial<GameState> | null> {
  const snapshot = await getDoc(getGameStateDocRef(uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  const rawState = data?.gameState;
  if (!rawState || typeof rawState !== "object") return null;
  return rawState as Partial<GameState>;
}

export async function saveCloudGameState(
  uid: string,
  state: GameState,
  options?: { migratedFromLocal?: boolean }
): Promise<void> {
  const ref = getGameStateDocRef(uid);
  const snapshot = await getDoc(ref);

  await setDoc(
    ref,
    {
      schemaVersion: GAME_STATE_SCHEMA_VERSION,
      gameState: stripUndefined(state),
      updatedAt: serverTimestamp(),
      ...(options?.migratedFromLocal ? { migratedFromLocalAt: serverTimestamp() } : {}),
      ...(!snapshot.exists() ? { createdAt: serverTimestamp() } : {})
    },
    { merge: true }
  );
}

