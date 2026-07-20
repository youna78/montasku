import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { SHOP_PAID_ATTRIBUTE_CHARMS } from "@/lib/game/shop";
import type { InventoryProfile, WalletSummary } from "@/types/commerce";

export const runtime = "nodejs";

type RequestBody = {
  itemId?: string;
  purchaseId?: string;
  platform?: "web" | "ios" | "android";
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
    const item = SHOP_PAID_ATTRIBUTE_CHARMS.find((entry) => entry.itemId === body.itemId);
    const purchaseId = typeof body.purchaseId === "string" ? body.purchaseId.trim() : "";

    if (!item || item.currencyType !== "paid_coin") {
      return NextResponse.json({ error: "商品が見つかりません。" }, { status: 400 });
    }
    if (!purchaseId || purchaseId.length > 128 || !/^[A-Za-z0-9_-]+$/.test(purchaseId)) {
      return NextResponse.json({ error: "購入IDが正しくありません。" }, { status: 400 });
    }

    const db = getFirebaseAdminFirestore();
    const userRef = db.collection("users").doc(decodedToken.uid);
    const walletRef = userRef.collection("wallet").doc("summary");
    const inventoryRef = userRef.collection("inventory").doc("profile");
    const historyRef = userRef.collection("purchaseHistory").doc(purchaseId);

    const result = await db.runTransaction(async (transaction) => {
      const [walletSnapshot, inventorySnapshot, historySnapshot] = await Promise.all([
        transaction.get(walletRef),
        transaction.get(inventoryRef),
        transaction.get(historyRef)
      ]);
      const wallet = walletSnapshot.exists ? (walletSnapshot.data() as Partial<WalletSummary>) : null;
      const inventory = inventorySnapshot.exists
        ? (inventorySnapshot.data() as Partial<InventoryProfile>)
        : null;
      const currentBalance = typeof wallet?.paidCoinBalance === "number" ? Math.max(0, wallet.paidCoinBalance) : 0;
      const currentCounts = inventory?.ownedPaidCharmItemCounts ?? {};
      const currentItemCount = Math.max(0, Math.floor(currentCounts[item.attribute] ?? 0));

      if (historySnapshot.exists) {
        return { spent: true, paidCoinBalance: currentBalance, itemCount: currentItemCount };
      }
      if (currentBalance < item.price) {
        return { spent: false, paidCoinBalance: currentBalance, itemCount: currentItemCount };
      }

      const purchasedAt = new Date().toISOString();
      const nextBalance = currentBalance - item.price;
      const nextItemCount = currentItemCount + 1;
      const previousLifetimeSpent = Math.max(0, wallet?.lifetimeCoinsSpent ?? 0);

      transaction.set(
        walletRef,
        {
          schemaVersion: 1,
          paidCoinBalance: nextBalance,
          lifetimeCoinsSpent: previousLifetimeSpent + item.price,
          lastCoinSpendAt: purchasedAt,
          updatedAt: FieldValue.serverTimestamp(),
          ...(!walletSnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
        },
        { merge: true }
      );
      transaction.set(
        inventoryRef,
        {
          schemaVersion: 1,
          ownedPaidCharmItemCounts: {
            ...currentCounts,
            [item.attribute]: nextItemCount
          },
          updatedAt: FieldValue.serverTimestamp(),
          ...(!inventorySnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
        },
        { merge: true }
      );
      transaction.set(historyRef, {
        purchaseId,
        platform: body.platform === "ios" || body.platform === "android" ? body.platform : "web",
        channel: "in_app_shop",
        status: "fulfilled",
        productId: item.itemId,
        productType: "premium_attribute_charm",
        quantity: 1,
        grantedPaidCoins: 0,
        grantedItemIds: [item.itemId],
        currencyType: "paid_coin",
        amountTotalMinor: item.price,
        purchasedAt,
        fulfilledAt: purchasedAt,
        idempotencyKey: purchaseId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return { spent: true, paidCoinBalance: nextBalance, itemCount: nextItemCount };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[wallet] failed to purchase paid shop item", error);
    return NextResponse.json({ error: "購入処理に失敗しました。" }, { status: 500 });
  }
}
