import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getPaidCoinShopItem } from "@/lib/game/shop";
import { getStripeClient } from "@/lib/server/stripe";

export const runtime = "nodejs";

function getSessionUid(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id || session.metadata?.uid || null;
}

function parseGrantedIds(rawValue: string | undefined): string[] {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0) : [];
  } catch {
    return [];
  }
}

async function markCheckoutSessionFailed(session: Stripe.Checkout.Session, reason: string) {
  const uid = getSessionUid(session);
  const productId = session.metadata?.productId;
  const item = productId ? getPaidCoinShopItem(productId) : null;
  if (!uid || !item) return;

  const db = getFirebaseAdminFirestore();
  const historyRef = db.collection("users").doc(uid).collection("purchaseHistory").doc(session.id);

  await historyRef.set(
    {
      purchaseId: session.id,
      platform: "web",
      channel: "stripe_checkout",
      status: "failed",
      productId: item.itemId,
      productType: item.productType,
      quantity: 1,
      grantedPaidCoins: 0,
      grantedItemIds: [],
      currencyType: "jpy",
      amountTotalMinor: item.priceJpy,
      purchasedAt: new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      paidAt: null,
      fulfilledAt: null,
      stripePaymentLinkId: null,
      stripeCheckoutSessionId: session.id,
      idempotencyKey: session.id,
      failureReason: reason,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

async function fulfillCheckoutSession(sessionId: string) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return;
  }

  const uid = getSessionUid(session);
  const productId = session.metadata?.productId;
  const item = productId ? getPaidCoinShopItem(productId) : null;

  if (!uid || !item) {
    throw new Error(`Invalid checkout session metadata: ${session.id}`);
  }

  const paidAt = new Date().toISOString();
  const purchasedAt = new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const db = getFirebaseAdminFirestore();
  const walletRef = db.collection("users").doc(uid).collection("wallet").doc("summary");
  const inventoryRef = db.collection("users").doc(uid).collection("inventory").doc("profile");
  const eventRef = db.collection("users").doc(uid).collection("events").doc("spring_easter_2026");
  const historyRef = db.collection("users").doc(uid).collection("purchaseHistory").doc(session.id);
  const grantedItemIds = parseGrantedIds(session.metadata?.grantedItemIds);
  const grantedBoosterItemIds = parseGrantedIds(session.metadata?.grantedBoosterItemIds);
  const grantedEventEggEventId = session.metadata?.grantedEventEggEventId || null;

  await db.runTransaction(async (transaction) => {
    const historySnapshot = await transaction.get(historyRef);
    const walletSnapshot = await transaction.get(walletRef);
    const inventorySnapshot = await transaction.get(inventoryRef);
    const eventSnapshot = grantedEventEggEventId ? await transaction.get(eventRef) : null;
    const historyData = historySnapshot.exists ? historySnapshot.data() : null;
    const currentStatus = historyData?.status ?? null;

    if (currentStatus === "fulfilled") {
      return;
    }

    // Keep the paid milestone explicit before completing fulfillment.
    transaction.set(
      historyRef,
      {
        purchaseId: session.id,
        platform: "web",
        channel: "stripe_checkout",
        status: "paid",
        productId: item.itemId,
        productType: item.productType,
        quantity: 1,
        grantedPaidCoins: 0,
        grantedItemIds: [...grantedItemIds, ...grantedBoosterItemIds],
        currencyType: "jpy",
        amountTotalMinor: item.priceJpy,
        purchasedAt,
        paidAt,
        stripePaymentLinkId: null,
        stripeCheckoutSessionId: session.id,
        idempotencyKey: session.id,
        updatedAt: FieldValue.serverTimestamp(),
        ...(!historySnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
      },
      { merge: true }
    );

    transaction.set(
      walletRef,
      {
        schemaVersion: 1,
        paidCoinBalance: FieldValue.increment(item.totalPaidCoins),
        lifetimePaidCoinsPurchased: FieldValue.increment(item.totalPaidCoins),
        lastCoinGrantAt: paidAt,
        updatedAt: FieldValue.serverTimestamp(),
        ...(!walletSnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
      },
      { merge: true }
    );

    const inventoryPatch: Record<string, unknown> = {
      schemaVersion: 1,
      updatedAt: FieldValue.serverTimestamp(),
      ...(!inventorySnapshot.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
    };

    if (grantedItemIds.some((itemId) => itemId === "spring_meadow")) {
      inventoryPatch.ownedBackgroundIds = FieldValue.arrayUnion("spring_meadow");
    }
    if (grantedItemIds.some((itemId) => itemId === "spring_sakura")) {
      inventoryPatch.ownedFrameIds = FieldValue.arrayUnion("spring_sakura");
    }
    if (grantedItemIds.some((itemId) => itemId === "paid_deco_picnic_basket_01" || itemId === "paid_deco_flower_lantern_01" || itemId === "paid_deco_sakura_petals_01")) {
      inventoryPatch.ownedDecorationIds = FieldValue.arrayUnion(
        ...grantedItemIds.filter((itemId) =>
          ["paid_deco_picnic_basket_01", "paid_deco_flower_lantern_01", "paid_deco_sakura_petals_01"].includes(itemId)
        )
      );
    }

    for (const boosterItemId of grantedBoosterItemIds) {
      inventoryPatch[`ownedBoosterItemCounts.${boosterItemId}`] = FieldValue.increment(1);
    }

    if (Object.keys(inventoryPatch).length > 2 || !inventorySnapshot.exists) {
      transaction.set(inventoryRef, inventoryPatch, { merge: true });
    }

    if (grantedEventEggEventId === "spring_easter_2026") {
      transaction.set(
        eventRef,
        {
          eventId: "spring_easter_2026",
          ownedEggCount: FieldValue.increment(1),
          purchasedEggCount: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
          ...(!eventSnapshot?.exists ? { hasSeenIntroPopup: false, hasClaimedFreeEgg: false, completedTaskCount: 0, loginDates: [], hasCompletedLoginMission: false, claimedRewardIds: [] } : {})
        },
        { merge: true }
      );
    }

    transaction.set(
      historyRef,
      {
        status: "fulfilled",
        grantedPaidCoins: item.totalPaidCoins,
        grantedItemIds: [...grantedItemIds, ...grantedBoosterItemIds],
        fulfilledAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe] invalid webhook signature", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await fulfillCheckoutSession(event.data.object.id);
        break;
      case "checkout.session.expired":
        await markCheckoutSessionFailed(event.data.object, "expired");
        break;
      case "checkout.session.async_payment_failed":
        await markCheckoutSessionFailed(event.data.object, "async_payment_failed");
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe] webhook handling failed", error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
