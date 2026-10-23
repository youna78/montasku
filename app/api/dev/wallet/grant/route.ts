import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import type { WalletSummary } from "@/types/commerce";

export const runtime = "nodejs";

type RequestBody = {
  amount?: number;
};

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

function isDebugRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  const isLocalHost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return process.env.NODE_ENV === "development" || isLocalHost;
}

export async function POST(request: Request) {
  if (!isDebugRequest(request)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const amount = body?.amount;
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 1 || amount > 10_000) {
      return NextResponse.json({ error: "付与数が正しくありません。" }, { status: 400 });
    }

    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
    const db = getFirebaseAdminFirestore();
    const walletRef = db.collection("users").doc(decodedToken.uid).collection("wallet").doc("summary");
    const paidCoinBalance = await db.runTransaction(async (transaction) => {
      const walletSnapshot = await transaction.get(walletRef);
      const wallet = walletSnapshot.exists ? (walletSnapshot.data() as Partial<WalletSummary>) : null;
      const currentBalance = typeof wallet?.paidCoinBalance === "number" ? Math.max(0, wallet.paidCoinBalance) : 0;
      const nextBalance = currentBalance + amount;

      transaction.set(
        walletRef,
        {
          schemaVersion: 1,
          paidCoinBalance: nextBalance,
          lastCoinGrantAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(!walletSnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
        },
        { merge: true }
      );

      return nextBalance;
    });

    return NextResponse.json({ paidCoinBalance });
  } catch (error) {
    console.error("[dev-wallet] failed to grant paid coins", error);
    return NextResponse.json({ error: "モンタコインの付与に失敗しました。" }, { status: 500 });
  }
}
