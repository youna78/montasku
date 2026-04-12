import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getPaidCoinShopItem } from "@/lib/game/shop";
import { getAppUrl, getStripeClient } from "@/lib/server/stripe";

export const runtime = "nodejs";

type RequestBody = {
  productId?: string;
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
    const item = body.productId ? getPaidCoinShopItem(body.productId) : null;

    if (!item) {
      return NextResponse.json({ error: "商品が見つかりません。" }, { status: 400 });
    }

    const stripe = getStripeClient();
    const appUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: decodedToken.uid,
      success_url: `${appUrl}/shop/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/shop?checkout=cancelled`,
      customer_email: decodedToken.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "jpy",
            unit_amount: item.priceJpy,
            product_data: {
              name: item.title,
              description: item.description,
              metadata: {
                productId: item.itemId,
                productType: item.productType
              }
            }
          }
        }
      ],
      metadata: {
        uid: decodedToken.uid,
        productId: item.itemId,
        productType: item.productType,
        grantedPaidCoins: String(item.totalPaidCoins),
        grantedItemIds: JSON.stringify(item.grantedItemIds ?? []),
        grantedBoosterItemIds: JSON.stringify(item.grantedBoosterItemIds ?? []),
        grantedEventEggEventId: item.grantedEventEggEventId ?? ""
      }
    });

    const db = getFirebaseAdminFirestore();
    const historyRef = db.collection("users").doc(decodedToken.uid).collection("purchaseHistory").doc(session.id);
    await historyRef.set(
      {
        purchaseId: session.id,
        platform: "web",
        channel: "stripe_checkout",
        status: "pending",
        productId: item.itemId,
        productType: item.productType,
        quantity: 1,
        grantedPaidCoins: 0,
        grantedItemIds: [...(item.grantedItemIds ?? []), ...(item.grantedBoosterItemIds ?? [])],
        currencyType: "jpy",
        amountTotalMinor: item.priceJpy,
        purchasedAt: new Date().toISOString(),
        paidAt: null,
        fulfilledAt: null,
        stripePaymentLinkId: null,
        stripeCheckoutSessionId: session.id,
        idempotencyKey: session.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    if (!session.url) {
      return NextResponse.json({ error: "決済ページのURLを取得できませんでした。" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe] failed to create checkout session", error);
    return NextResponse.json({ error: "決済ページの作成に失敗しました。" }, { status: 500 });
  }
}
