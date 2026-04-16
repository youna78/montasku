import { NextResponse } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";

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

    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const db = getFirebaseAdminFirestore();
    const userRef = db.collection("users").doc(decodedToken.uid);

    await db.recursiveDelete(userRef);
    await auth.deleteUser(decodedToken.uid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account] failed to delete account", error);
    return NextResponse.json({ error: "アカウント削除に失敗しました。時間をおいて再度お試しください。" }, { status: 500 });
  }
}
