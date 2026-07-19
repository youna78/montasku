import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getEventById } from "@/lib/game/events";
import type { WalletSummary } from "@/types/commerce";

export const runtime = "nodejs";

type RequestBody = {
  eventId?: string;
  itemId?: string;
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
    const eventConfig = body.eventId ? getEventById(body.eventId) : null;
    const item = eventConfig?.paidCoinShopItems.find((entry) => entry.itemId === body.itemId);

    if (!eventConfig || !item || item.currencyType !== "paid_coin") {
      return NextResponse.json({ error: "商品が見つかりません。" }, { status: 400 });
    }

    const db = getFirebaseAdminFirestore();
    const walletRef = db.collection("users").doc(decodedToken.uid).collection("wallet").doc("summary");
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(walletRef);
      const current = snapshot.exists ? (snapshot.data() as Partial<WalletSummary>) : null;
      const currentBalance =
        current && typeof current.paidCoinBalance === "number"
          ? Math.max(0, current.paidCoinBalance)
          : 0;

      if (currentBalance < item.price) {
        return { spent: false, paidCoinBalance: currentBalance };
      }

      const nextBalance = currentBalance - item.price;
      const previousLifetimeSpent =
        current && typeof current.lifetimeCoinsSpent === "number"
          ? Math.max(0, current.lifetimeCoinsSpent)
          : 0;

      transaction.set(
        walletRef,
        {
          schemaVersion: 1,
          paidCoinBalance: nextBalance,
          lifetimeCoinsSpent: previousLifetimeSpent + item.price,
          lastCoinSpendAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(!snapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
        },
        { merge: true }
      );

      return { spent: true, paidCoinBalance: nextBalance };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[wallet] failed to spend paid coins", error);
    return NextResponse.json({ error: "残高の更新に失敗しました。" }, { status: 500 });
  }
}
