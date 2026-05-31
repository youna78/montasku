import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type SnapshotInput = {
  productIdentifier?: unknown;
  transactionId?: unknown;
  orderId?: unknown;
  purchaseState?: unknown;
  purchaseDate?: unknown;
  productType?: unknown;
  appAccountTokenPresent?: unknown;
  purchaseTokenPresent?: unknown;
  purchaseTokenHash?: unknown;
  jwsRepresentationPresent?: unknown;
  isAcknowledged?: unknown;
  quantity?: unknown;
  reason?: unknown;
};

type RequestBody = {
  eventName?: unknown;
  platform?: unknown;
  appAccountTokenPresent?: unknown;
  productIds?: unknown;
  targetProductId?: unknown;
  rawPurchaseCount?: unknown;
  restorablePurchaseCount?: unknown;
  rejectedPurchaseCount?: unknown;
  restoreSyncAttempted?: unknown;
  restoreSyncError?: unknown;
  rawPurchaseSnapshots?: unknown;
  restorablePurchaseSnapshots?: unknown;
  rejectedPurchaseSnapshots?: unknown;
  transaction?: unknown;
  responseStatus?: unknown;
  errorMessage?: unknown;
  grantedPaidCoins?: unknown;
};

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function asString(value: unknown, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item, 120))
    .filter((item): item is string => Boolean(item))
    .slice(0, 40);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

function sanitizeSnapshot(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as SnapshotInput;
  return stripUndefined({
    productIdentifier: asString(snapshot.productIdentifier, 160),
    transactionId: asString(snapshot.transactionId, 160),
    orderId: asString(snapshot.orderId, 180),
    purchaseState: asString(snapshot.purchaseState, 80),
    purchaseDate: asString(snapshot.purchaseDate, 120),
    productType: asString(snapshot.productType, 80),
    appAccountTokenPresent: asBoolean(snapshot.appAccountTokenPresent),
    purchaseTokenPresent: asBoolean(snapshot.purchaseTokenPresent),
    purchaseTokenHash: asString(snapshot.purchaseTokenHash, 96),
    jwsRepresentationPresent: asBoolean(snapshot.jwsRepresentationPresent),
    isAcknowledged: asBoolean(snapshot.isAcknowledged),
    quantity: asNumber(snapshot.quantity),
    reason: asString(snapshot.reason, 120)
  });
}

function sanitizeSnapshots(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeSnapshot(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .slice(0, 30);
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const db = getFirebaseAdminFirestore();
    const ref = db.collection("users").doc(decodedToken.uid).collection("purchaseDiagnostics").doc();
    const transaction = sanitizeSnapshot(body.transaction);

    await ref.set(
      stripUndefined({
        eventName: asString(body.eventName, 120) ?? "native_store_diagnostic",
        platform: asString(body.platform, 40),
        appAccountTokenPresent: asBoolean(body.appAccountTokenPresent),
        productIds: asStringArray(body.productIds),
        targetProductId: asString(body.targetProductId, 160),
        rawPurchaseCount: asNumber(body.rawPurchaseCount),
        restorablePurchaseCount: asNumber(body.restorablePurchaseCount),
        rejectedPurchaseCount: asNumber(body.rejectedPurchaseCount),
        restoreSyncAttempted: asBoolean(body.restoreSyncAttempted),
        restoreSyncError: asString(body.restoreSyncError, 500),
        rawPurchaseSnapshots: sanitizeSnapshots(body.rawPurchaseSnapshots),
        restorablePurchaseSnapshots: sanitizeSnapshots(body.restorablePurchaseSnapshots),
        rejectedPurchaseSnapshots: sanitizeSnapshots(body.rejectedPurchaseSnapshots),
        transaction: transaction ?? undefined,
        responseStatus: asNumber(body.responseStatus),
        errorMessage: asString(body.errorMessage, 800),
        grantedPaidCoins: asNumber(body.grantedPaidCoins),
        userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        createdAt: FieldValue.serverTimestamp()
      })
    );

    return NextResponse.json({ diagnosticId: ref.id });
  } catch (error) {
    console.error("[native-store-diagnostics] failed to write diagnostic", error);
    return NextResponse.json({ error: "診断ログを保存できませんでした。" }, { status: 500 });
  }
}
