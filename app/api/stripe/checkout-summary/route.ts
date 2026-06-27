import { NextResponse } from "next/server";
import { getPaidCoinShopItem } from "@/lib/game/shop";
import { getStripeClient } from "@/lib/server/stripe";

export const runtime = "nodejs";

function buildSummaryLines(productId: string, totalPaidCoins: number): string[] {
  if (productId === "starter_bundle_boost_01") {
    return ["500モンタコイン", "春の芽吹きたまご", "EXPブースト 24時間"];
  }

  if (productId.startsWith("paid_coin_pack_")) {
    return [`モンタコイン ${totalPaidCoins}枚`];
  }

  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const productId = session.metadata?.productId;
    const item = productId ? getPaidCoinShopItem(productId) : null;

    if (!item) {
      return NextResponse.json({ error: "商品が見つかりません。" }, { status: 404 });
    }

    return NextResponse.json({
      title: item.title,
      lines: buildSummaryLines(item.itemId, item.totalPaidCoins),
      transactionId: session.id,
      productId: item.itemId,
      productType: item.productType,
      value: item.priceJpy,
      currency: "JPY",
      totalPaidCoins: item.totalPaidCoins,
      paymentProvider: "stripe",
      paymentStatus: session.payment_status
    });
  } catch (error) {
    console.error("[stripe] failed to load checkout summary", error);
    return NextResponse.json({ error: "購入内容を取得できませんでした。" }, { status: 500 });
  }
}
