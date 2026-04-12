import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { UserEventState } from "@/types/event";
import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import { GAME_EVENTS, normalizeUserEventState } from "./events";

const EVENT_SCHEMA_VERSION = 1;

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

function getEventDocRef(uid: string, eventId: string) {
  return doc(getFirebaseFirestore(), "users", uid, "events", eventId);
}

export async function loadCloudEventStates(uid: string): Promise<Record<string, UserEventState>> {
  const entries = await Promise.all(
    GAME_EVENTS.map(async (eventConfig) => {
      const snapshot = await getDoc(getEventDocRef(uid, eventConfig.eventId));
      if (!snapshot.exists()) {
        return [eventConfig.eventId, normalizeUserEventState(eventConfig.eventId, null)] as const;
      }

      const data = snapshot.data();
      const rawState = data?.state && typeof data.state === "object" ? (data.state as Partial<UserEventState>) : null;
      return [eventConfig.eventId, normalizeUserEventState(eventConfig.eventId, rawState)] as const;
    })
  );

  return Object.fromEntries(entries);
}

export async function saveCloudEventStates(uid: string, eventStates: Record<string, UserEventState>): Promise<void> {
  await Promise.all(
    GAME_EVENTS.map(async (eventConfig) => {
      const ref = getEventDocRef(uid, eventConfig.eventId);
      const snapshot = await getDoc(ref);
      const state = normalizeUserEventState(eventConfig.eventId, eventStates[eventConfig.eventId]);
      await setDoc(
        ref,
        stripUndefined({
          schemaVersion: EVENT_SCHEMA_VERSION,
          eventId: eventConfig.eventId,
          state,
          updatedAt: serverTimestamp(),
          ...(!snapshot.exists() ? { createdAt: serverTimestamp() } : {})
        }),
        { merge: true }
      );
    })
  );
}
