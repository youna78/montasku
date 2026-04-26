import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getPaidCoinShopItemByAppStoreProductId } from "@/lib/game/shop";
import { fetchAppStoreTransactionInfo } from "@/lib/server/appStore";

export const runtime = "nodejs";

type RequestBody = {
  appStoreProductId?: string;
  transactionId?: string;
  appAccountToken?: string | null;
};

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
    const body = (await request.json()) as RequestBody;
    const transactionId = body.transactionId?.trim();
    const appStoreProductId = body.appStoreProductId?.trim();

    if (!transactionId || !appStoreProductId) {
      return NextResponse.json({ error: "購入情報が不足しています。" }, { status: 400 });
    }

    const item = getPaidCoinShopItemByAppStoreProductId(appStoreProductId);
    if (!item) {
      return NextResponse.json({ error: "商品が見つかりません。" }, { status: 400 });
    }

    const transactionInfo = await fetchAppStoreTransactionInfo(transactionId);
    const bundleId = process.env.APP_STORE_BUNDLE_ID;

    if (bundleId && transactionInfo.bundleId !== bundleId) {
      return NextResponse.json({ error: "購入情報のアプリIDが一致しません。" }, { status: 400 });
    }

    if (transactionInfo.productId !== appStoreProductId) {
      return NextResponse.json({ error: "購入情報の商品IDが一致しません。" }, { status: 400 });
    }

    if (transactionInfo.revocationDate) {
      return NextResponse.json({ error: "取り消された購入です。" }, { status: 400 });
    }

    if (body.appAccountToken && transactionInfo.appAccountToken && transactionInfo.appAccountToken !== body.appAccountToken) {
      return NextResponse.json({ error: "購入アカウントが一致しません。" }, { status: 400 });
    }

    const db = getFirebaseAdminFirestore();
    const uid = decodedToken.uid;
    const purchaseId = `app_store_${transactionInfo.transactionId}`;
    const walletRef = db.collection("users").doc(uid).collection("wallet").doc("summary");
    const historyRef = db.collection("users").doc(uid).collection("purchaseHistory").doc(purchaseId);
    const paidAt = transactionInfo.purchaseDate ? new Date(transactionInfo.purchaseDate).toISOString() : new Date().toISOString();

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
          platform: "ios",
          channel: "app_store",
          status: "fulfilled",
          productId: item.itemId,
          storeProductId: appStoreProductId,
          productType: item.productType,
          quantity: 1,
          grantedPaidCoins: item.totalPaidCoins,
          grantedItemIds: [],
          currencyType: "jpy",
          amountTotalMinor: item.priceJpy,
          purchasedAt: paidAt,
          paidAt,
          fulfilledAt: new Date().toISOString(),
          appStoreTransactionId: transactionInfo.transactionId,
          appStoreOriginalTransactionId: transactionInfo.originalTransactionId ?? null,
          appStoreEnvironment: transactionInfo.environment ?? null,
          idempotencyKey: transactionInfo.transactionId,
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
    console.error("[app-store] failed to fulfill purchase", error);
    return NextResponse.json({ error: "購入の反映に失敗しました。" }, { status: 500 });
  }
}
