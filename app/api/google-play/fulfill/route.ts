import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getPaidCoinShopItemByGooglePlayProductId } from "@/lib/game/shop";
import { fetchGooglePlayProductPurchase, hashGooglePlayPurchaseToken } from "@/lib/server/googlePlay";

export const runtime = "nodejs";

type RequestBody = {
  googlePlayProductId?: string;
  purchaseToken?: string;
  transactionId?: string | null;
  orderId?: string | null;
  purchaseState?: string | number | null;
  appAccountToken?: string | null;
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

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
    const body = (await request.json()) as RequestBody;
    const googlePlayProductId = body.googlePlayProductId?.trim();
    const purchaseToken = body.purchaseToken?.trim();

    if (!googlePlayProductId || !purchaseToken) {
      return NextResponse.json({ error: "購入情報が不足しています。" }, { status: 400 });
    }

    const item = getPaidCoinShopItemByGooglePlayProductId(googlePlayProductId);
    if (!item) {
      return NextResponse.json({ error: "商品が見つかりません。" }, { status: 400 });
    }

    const purchaseInfo = await fetchGooglePlayProductPurchase(googlePlayProductId, purchaseToken);

    if (purchaseInfo.purchaseState !== 0) {
      return NextResponse.json({ error: "購入がまだ完了していません。" }, { status: 400 });
    }

    if (
      body.appAccountToken
      && purchaseInfo.obfuscatedExternalAccountId
      && purchaseInfo.obfuscatedExternalAccountId.toLowerCase() !== body.appAccountToken.toLowerCase()
    ) {
      return NextResponse.json({ error: "購入アカウントが一致しません。" }, { status: 400 });
    }

    const db = getFirebaseAdminFirestore();
    const uid = decodedToken.uid;
    const purchaseTokenHash = hashGooglePlayPurchaseToken(purchaseToken);
    const purchaseId = `google_play_${purchaseTokenHash.slice(0, 40)}`;
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
          googlePlayTransactionId: body.transactionId ?? null,
          googlePlayPurchaseTokenHash: purchaseTokenHash,
          googlePlayPurchaseState: purchaseInfo.purchaseState,
          googlePlayAcknowledgementState: purchaseInfo.acknowledgementState ?? null,
          googlePlayConsumptionState: purchaseInfo.consumptionState ?? null,
          idempotencyKey: purchaseTokenHash,
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

    return NextResponse.json({
      fulfilled: true,
      alreadyFulfilled,
      productId: item.itemId,
      grantedPaidCoins: alreadyFulfilled ? 0 : item.totalPaidCoins
    });
  } catch (error) {
    console.error("[google-play] failed to fulfill purchase", error);
    return NextResponse.json(
      { error: "購入情報の確認に失敗しました。少し待ってからもう一度お試しください。" },
      { status: 500 }
    );
  }
}
