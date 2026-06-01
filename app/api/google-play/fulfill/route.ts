import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getPaidCoinShopItemByGooglePlayProductId } from "@/lib/game/shop";
import {
  fetchGooglePlayProductPurchase,
  getGooglePlayCredentialEnvironmentSummary,
  hashGooglePlayPurchaseToken
} from "@/lib/server/googlePlay";

export const runtime = "nodejs";

type RequestBody = {
  googlePlayProductId?: string;
  purchaseToken?: string;
  transactionId?: string | null;
  orderId?: string | null;
  purchaseState?: string | number | null;
  appAccountToken?: string | null;
};

type GooglePlayDiagnosticInput = {
  eventName: string;
  productId?: string | null;
  storeProductId?: string | null;
  orderId?: string | null;
  transactionId?: string | null;
  purchaseTokenHash?: string | null;
  clientPurchaseState?: string | number | null;
  googlePlayPurchaseState?: number | null;
  googlePlayAcknowledgementState?: number | null;
  googlePlayConsumptionState?: number | null;
  googlePlayObfuscatedAccountPresent?: boolean;
  appAccountTokenPresent?: boolean;
  responseStatus?: number;
  errorMessage?: string | null;
  errorCode?: string | null;
  credentialEnvironment?: ReturnType<typeof getGooglePlayCredentialEnvironmentSummary>;
  grantedPaidCoins?: number | null;
  alreadyFulfilled?: boolean;
};

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function toIsoStringFromMillis(value?: string | null): string {
  if (!value) return new Date().toISOString();
  const millis = Number(value);
  if (!Number.isFinite(millis)) return new Date().toISOString();
  return new Date(millis).toISOString();
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

async function writeGooglePlayDiagnostic(uid: string | null, input: GooglePlayDiagnosticInput): Promise<void> {
  if (!uid) return;
  try {
    const db = getFirebaseAdminFirestore();
    await db.collection("users").doc(uid).collection("purchaseDiagnostics").doc().set(
      stripUndefined({
        source: "api/google-play/fulfill",
        eventName: input.eventName,
        platform: "android",
        productId: input.productId ?? null,
        storeProductId: input.storeProductId ?? null,
        orderId: input.orderId ?? null,
        transactionId: input.transactionId ?? null,
        purchaseTokenHash: input.purchaseTokenHash ?? null,
        clientPurchaseState: input.clientPurchaseState ?? null,
        googlePlayPurchaseState: input.googlePlayPurchaseState ?? null,
        googlePlayAcknowledgementState: input.googlePlayAcknowledgementState ?? null,
        googlePlayConsumptionState: input.googlePlayConsumptionState ?? null,
        googlePlayObfuscatedAccountPresent: input.googlePlayObfuscatedAccountPresent,
        appAccountTokenPresent: input.appAccountTokenPresent,
        responseStatus: input.responseStatus,
        errorMessage: input.errorMessage ?? null,
        errorCode: input.errorCode ?? null,
        credentialEnvironment: input.credentialEnvironment,
        grantedPaidCoins: input.grantedPaidCoins ?? null,
        alreadyFulfilled: input.alreadyFulfilled,
        createdAt: FieldValue.serverTimestamp()
      })
    );
  } catch (diagnosticError) {
    console.warn("[google-play] failed to write fulfillment diagnostic", diagnosticError);
  }
}

export async function POST(request: Request) {
  let uid: string | null = null;
  let body: RequestBody | null = null;
  let googlePlayProductId: string | null = null;
  let purchaseTokenHash: string | null = null;

  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
    uid = decodedToken.uid;
    body = (await request.json()) as RequestBody;
    googlePlayProductId = body.googlePlayProductId?.trim() ?? null;
    const purchaseToken = body.purchaseToken?.trim();
    purchaseTokenHash = purchaseToken ? hashGooglePlayPurchaseToken(purchaseToken) : null;

    if (!googlePlayProductId || !purchaseToken) {
      await writeGooglePlayDiagnostic(uid, {
        eventName: "google_play_fulfill_failed",
        storeProductId: googlePlayProductId,
        transactionId: body.transactionId ?? null,
        orderId: body.orderId ?? null,
        purchaseTokenHash,
        clientPurchaseState: body.purchaseState ?? null,
        appAccountTokenPresent: Boolean(body.appAccountToken),
        responseStatus: 400,
        errorMessage: "missing_google_play_product_or_purchase_token"
      });
      return NextResponse.json({ error: "購入情報が不足しています。" }, { status: 400 });
    }

    const item = getPaidCoinShopItemByGooglePlayProductId(googlePlayProductId);
    if (!item) {
      await writeGooglePlayDiagnostic(uid, {
        eventName: "google_play_fulfill_failed",
        storeProductId: googlePlayProductId,
        transactionId: body.transactionId ?? null,
        orderId: body.orderId ?? null,
        purchaseTokenHash,
        clientPurchaseState: body.purchaseState ?? null,
        appAccountTokenPresent: Boolean(body.appAccountToken),
        responseStatus: 400,
        errorMessage: "google_play_product_not_configured"
      });
      return NextResponse.json({ error: "商品が見つかりません。" }, { status: 400 });
    }

    const purchaseInfo = await fetchGooglePlayProductPurchase(googlePlayProductId, purchaseToken);

    if (purchaseInfo.purchaseState !== 0) {
      await writeGooglePlayDiagnostic(uid, {
        eventName: "google_play_fulfill_failed",
        productId: item.itemId,
        storeProductId: googlePlayProductId,
        transactionId: body.transactionId ?? null,
        orderId: purchaseInfo.orderId ?? body.orderId ?? null,
        purchaseTokenHash,
        clientPurchaseState: body.purchaseState ?? null,
        googlePlayPurchaseState: purchaseInfo.purchaseState ?? null,
        googlePlayAcknowledgementState: purchaseInfo.acknowledgementState ?? null,
        googlePlayConsumptionState: purchaseInfo.consumptionState ?? null,
        googlePlayObfuscatedAccountPresent: Boolean(purchaseInfo.obfuscatedExternalAccountId),
        appAccountTokenPresent: Boolean(body.appAccountToken),
        responseStatus: 400,
        errorMessage: "google_play_purchase_not_completed"
      });
      return NextResponse.json({ error: "購入がまだ完了していません。" }, { status: 400 });
    }

    if (
      body.appAccountToken
      && purchaseInfo.obfuscatedExternalAccountId
      && purchaseInfo.obfuscatedExternalAccountId.toLowerCase() !== body.appAccountToken.toLowerCase()
    ) {
      await writeGooglePlayDiagnostic(uid, {
        eventName: "google_play_fulfill_failed",
        productId: item.itemId,
        storeProductId: googlePlayProductId,
        transactionId: body.transactionId ?? null,
        orderId: purchaseInfo.orderId ?? body.orderId ?? null,
        purchaseTokenHash,
        clientPurchaseState: body.purchaseState ?? null,
        googlePlayPurchaseState: purchaseInfo.purchaseState ?? null,
        googlePlayAcknowledgementState: purchaseInfo.acknowledgementState ?? null,
        googlePlayConsumptionState: purchaseInfo.consumptionState ?? null,
        googlePlayObfuscatedAccountPresent: Boolean(purchaseInfo.obfuscatedExternalAccountId),
        appAccountTokenPresent: Boolean(body.appAccountToken),
        responseStatus: 400,
        errorMessage: "app_account_token_mismatch"
      });
      return NextResponse.json({ error: "購入アカウントが一致しません。" }, { status: 400 });
    }

    const db = getFirebaseAdminFirestore();
    const verifiedPurchaseTokenHash = purchaseTokenHash ?? hashGooglePlayPurchaseToken(purchaseToken);
    const purchaseId = `google_play_${verifiedPurchaseTokenHash.slice(0, 40)}`;
    const orderId = purchaseInfo.orderId ?? body.orderId ?? null;
    const walletRef = db.collection("users").doc(uid).collection("wallet").doc("summary");
    const historyRef = db.collection("users").doc(uid).collection("purchaseHistory").doc(purchaseId);
    const paidAt = toIsoStringFromMillis(purchaseInfo.purchaseTimeMillis);

    let alreadyFulfilled = false;
    await db.runTransaction(async (transaction) => {
      const historySnapshot = await transaction.get(historyRef);
      const walletSnapshot = await transaction.get(walletRef);
      const historyData = historySnapshot.exists ? historySnapshot.data() : null;

      if (historyData?.status === "fulfilled") {
        alreadyFulfilled = true;
        return;
      }

      transaction.set(
        historyRef,
        {
          purchaseId,
          platform: "android",
          channel: "google_play",
          status: "fulfilled",
          productId: item.itemId,
          storeProductId: googlePlayProductId,
          productType: item.productType,
          quantity: purchaseInfo.quantity ?? 1,
          grantedPaidCoins: item.totalPaidCoins,
          grantedItemIds: [],
          currencyType: "jpy",
          amountTotalMinor: item.priceJpy,
          purchasedAt: paidAt,
          paidAt,
          fulfilledAt: new Date().toISOString(),
          googlePlayOrderId: orderId,
          googlePlayTransactionId: body?.transactionId ?? null,
          googlePlayPurchaseTokenHash: verifiedPurchaseTokenHash,
          googlePlayPurchaseState: purchaseInfo.purchaseState,
          googlePlayAcknowledgementState: purchaseInfo.acknowledgementState ?? null,
          googlePlayConsumptionState: purchaseInfo.consumptionState ?? null,
          idempotencyKey: verifiedPurchaseTokenHash,
          createdAt: historySnapshot.exists ? historyData?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      transaction.set(
        walletRef,
        {
          schemaVersion: 1,
          paidCoinBalance: FieldValue.increment(item.totalPaidCoins),
          lifetimePaidCoinsPurchased: FieldValue.increment(item.totalPaidCoins),
          lastCoinGrantAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(!walletSnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
        },
        { merge: true }
      );
    });

    await writeGooglePlayDiagnostic(uid, {
      eventName: "google_play_fulfill_success",
      productId: item.itemId,
      storeProductId: googlePlayProductId,
      transactionId: body.transactionId ?? null,
      orderId,
      purchaseTokenHash: verifiedPurchaseTokenHash,
      clientPurchaseState: body.purchaseState ?? null,
      googlePlayPurchaseState: purchaseInfo.purchaseState ?? null,
      googlePlayAcknowledgementState: purchaseInfo.acknowledgementState ?? null,
      googlePlayConsumptionState: purchaseInfo.consumptionState ?? null,
      googlePlayObfuscatedAccountPresent: Boolean(purchaseInfo.obfuscatedExternalAccountId),
      appAccountTokenPresent: Boolean(body.appAccountToken),
      responseStatus: 200,
      grantedPaidCoins: alreadyFulfilled ? 0 : item.totalPaidCoins,
      alreadyFulfilled
    });

    return NextResponse.json({
      fulfilled: true,
      alreadyFulfilled,
      productId: item.itemId,
      grantedPaidCoins: alreadyFulfilled ? 0 : item.totalPaidCoins
    });
  } catch (error) {
    console.error("[google-play] failed to fulfill purchase", error);
    const errorMessage = error instanceof Error ? error.message : "google_play_fulfill_unknown_error";
    const errorCode = errorMessage.includes("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON")
      || errorMessage.includes("Google Play service account")
      ? "google_play_credentials_invalid"
      : "google_play_fulfill_failed";
    await writeGooglePlayDiagnostic(uid, {
      eventName: "google_play_fulfill_failed",
      storeProductId: googlePlayProductId,
      transactionId: body?.transactionId ?? null,
      orderId: body?.orderId ?? null,
      purchaseTokenHash,
      clientPurchaseState: body?.purchaseState ?? null,
      appAccountTokenPresent: Boolean(body?.appAccountToken),
      responseStatus: 500,
      errorMessage,
      errorCode,
      credentialEnvironment: getGooglePlayCredentialEnvironmentSummary()
    });
    return NextResponse.json(
      {
        error: "購入情報の確認に失敗しました。少し待ってからもう一度お試しください。",
        errorCode
      },
      { status: 500 }
    );
  }
}
