import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { GameState } from "@/types/game";
import type { InventoryProfile, PurchaseHistoryRecord, WalletSummary } from "@/types/commerce";
import { getFirebaseFirestore } from "@/lib/firebase/firestore";

const COMMERCE_SCHEMA_VERSION = 1;

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

function getWalletDocRef(uid: string) {
  return doc(getFirebaseFirestore(), "users", uid, "wallet", "summary");
}

function getInventoryDocRef(uid: string) {
  return doc(getFirebaseFirestore(), "users", uid, "inventory", "profile");
}

function getPurchaseHistoryDocRef(uid: string, purchaseId: string) {
  return doc(getFirebaseFirestore(), "users", uid, "purchaseHistory", purchaseId);
}

export function buildWalletSummaryFromGameState(state: GameState): WalletSummary {
  return {
    schemaVersion: COMMERCE_SCHEMA_VERSION,
    freeCoinBalance: state.freeCoins,
    paidCoinBalance: state.paidCoinBalance,
    lifetimeFreeCoinsEarned: state.freeCoins,
    lifetimePaidCoinsPurchased: state.paidCoinBalance,
    lifetimeCoinsSpent: 0,
    lastCoinGrantAt: null,
    lastCoinSpendAt: null
  };
}

export function buildInventoryProfileFromGameState(state: GameState): InventoryProfile {
  return {
    schemaVersion: COMMERCE_SCHEMA_VERSION,
    ownedBackgroundIds: state.ownedBackgroundIds,
    selectedBackgroundId: state.selectedBackgroundId,
    ownedFrameIds: state.ownedFrameIds,
    selectedFrameId: state.selectedFrameId,
    ownedDecorationIds: [],
    ownedBoosterIds: []
  };
}

export async function loadCloudWalletSummary(uid: string): Promise<Partial<WalletSummary> | null> {
  const snapshot = await getDoc(getWalletDocRef(uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as Partial<WalletSummary>;
}

export async function loadCloudInventoryProfile(uid: string): Promise<Partial<InventoryProfile> | null> {
  const snapshot = await getDoc(getInventoryDocRef(uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as Partial<InventoryProfile>;
}

export async function saveCloudWalletSummary(uid: string, state: GameState): Promise<void> {
  const ref = getWalletDocRef(uid);
  const snapshot = await getDoc(ref);
  const current = snapshot.exists() ? (snapshot.data() as Partial<WalletSummary>) : null;
  const previousFreeBalance =
    current && typeof current.freeCoinBalance === "number" ? current.freeCoinBalance : state.freeCoins;
  const previousLifetimeEarned =
    current && typeof current.lifetimeFreeCoinsEarned === "number" ? current.lifetimeFreeCoinsEarned : state.freeCoins;
  const previousLifetimeSpent =
    current && typeof current.lifetimeCoinsSpent === "number" ? current.lifetimeCoinsSpent : 0;
  const previousLifetimePurchased =
    current && typeof current.lifetimePaidCoinsPurchased === "number"
      ? current.lifetimePaidCoinsPurchased
      : state.paidCoinBalance;
  const freeCoinDelta = state.freeCoins - previousFreeBalance;
  const gainedCoins = freeCoinDelta > 0 ? freeCoinDelta : 0;
  const spentCoins = freeCoinDelta < 0 ? Math.abs(freeCoinDelta) : 0;
  const paidCoinBalance = current && typeof current.paidCoinBalance === "number" ? current.paidCoinBalance : state.paidCoinBalance;

  await setDoc(
    ref,
    stripUndefined({
      schemaVersion: COMMERCE_SCHEMA_VERSION,
      freeCoinBalance: state.freeCoins,
      // Paid coins are server-authoritative once Stripe webhook fulfillment is enabled.
      // Do not let a stale browser state overwrite webhook-granted paid coins.
      paidCoinBalance,
      lifetimeFreeCoinsEarned: previousLifetimeEarned + gainedCoins,
      lifetimePaidCoinsPurchased: previousLifetimePurchased,
      lifetimeCoinsSpent: previousLifetimeSpent + spentCoins,
      lastCoinGrantAt: gainedCoins > 0 ? new Date().toISOString() : current?.lastCoinGrantAt ?? null,
      lastCoinSpendAt: spentCoins > 0 ? new Date().toISOString() : current?.lastCoinSpendAt ?? null,
      updatedAt: serverTimestamp(),
      ...(!snapshot.exists() ? { createdAt: serverTimestamp() } : {})
    }),
    { merge: true }
  );
}

export async function saveCloudInventoryProfile(uid: string, state: GameState): Promise<void> {
  const ref = getInventoryDocRef(uid);
  const snapshot = await getDoc(ref);

  await setDoc(
    ref,
    stripUndefined({
      ...buildInventoryProfileFromGameState(state),
      updatedAt: serverTimestamp(),
      ...(!snapshot.exists() ? { createdAt: serverTimestamp() } : {})
    }),
    { merge: true }
  );
}

export async function saveCloudCommerceState(uid: string, state: GameState): Promise<void> {
  await Promise.all([saveCloudWalletSummary(uid, state), saveCloudInventoryProfile(uid, state)]);
}

export function mergeCommerceIntoGameState(
  state: GameState,
  wallet: Partial<WalletSummary> | null,
  inventory: Partial<InventoryProfile> | null
): GameState {
  let nextState = state;

  if (wallet && typeof wallet.freeCoinBalance === "number") {
    nextState = {
      ...nextState,
      freeCoins: Math.max(0, wallet.freeCoinBalance)
    };
  }

  if (wallet && typeof wallet.paidCoinBalance === "number") {
    nextState = {
      ...nextState,
      paidCoinBalance: Math.max(0, wallet.paidCoinBalance)
    };
  }

  if (inventory) {
    const ownedBackgroundIds =
      Array.isArray(inventory.ownedBackgroundIds) && inventory.ownedBackgroundIds.length > 0
        ? [...new Set(inventory.ownedBackgroundIds.filter(Boolean))]
        : nextState.ownedBackgroundIds;
    const ownedFrameIds =
      Array.isArray(inventory.ownedFrameIds) && inventory.ownedFrameIds.length > 0
        ? [...new Set(inventory.ownedFrameIds.filter(Boolean))]
        : nextState.ownedFrameIds;

    nextState = {
      ...nextState,
      ownedBackgroundIds,
      selectedBackgroundId:
        typeof inventory.selectedBackgroundId === "string" && ownedBackgroundIds.includes(inventory.selectedBackgroundId)
          ? inventory.selectedBackgroundId
          : nextState.selectedBackgroundId,
      ownedFrameIds,
      selectedFrameId:
        typeof inventory.selectedFrameId === "string" && ownedFrameIds.includes(inventory.selectedFrameId)
          ? inventory.selectedFrameId
          : nextState.selectedFrameId
    };
  }

  return nextState;
}

export async function appendCloudPurchaseHistory(uid: string, record: PurchaseHistoryRecord): Promise<void> {
  const ref = getPurchaseHistoryDocRef(uid, record.purchaseId);

  await setDoc(
    ref,
    stripUndefined({
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }),
    { merge: true }
  );
}
