"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics/gtag";
import { useAuth } from "@/components/auth/AuthProvider";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { getVisibleHomeEvents, isEventActive } from "@/lib/game/events";
import { shouldRouteToDailyReview } from "@/lib/game/state";
import { getNativePlatform, isNativeMobileApp } from "@/lib/platform/capacitor";
import type { NativeStorePlatform, NativeStoreProductMap } from "@/lib/iap/appStorePurchases";
import {
  createAppAccountToken,
  finishNativeStoreTransaction,
  getNativeStoreProductId,
  loadNativeStoreProducts,
  purchaseNativeStoreProduct,
  summarizeNativeStoreTransaction
} from "@/lib/iap/appStorePurchases";
import { writeNativeStoreDiagnostic } from "@/lib/iap/nativePurchaseDiagnostics";
import {
  getBackgroundImagePath,
  getBoosterShopItem,
  getFramePreviewImagePath,
  getFrameThemeClass,
  SHOP_ATTRIBUTE_CHARMS,
  SHOP_BOOSTER_ITEMS,
  SHOP_EVERGREEN_BACKGROUNDS,
  SHOP_EVERGREEN_BUNDLES,
  SHOP_EVERGREEN_DECORATIONS,
  SHOP_EVERGREEN_FRAMES,
  SHOP_PAID_ATTRIBUTE_CHARMS,
  SHOP_PAID_BACKGROUNDS,
  SHOP_PAID_COIN_ITEMS,
  SHOP_PAID_FRAMES
} from "@/lib/game/shop";
import { useGame } from "@/lib/game/useGame";

type PurchaseModalState = {
  title: string;
  lines: string[];
};

type BundleConfirmState = {
  itemId: string;
  title: string;
  ownedLines: string[];
  grantedLines: string[];
};

type PurchaseConfirmState = {
  title: string;
  priceLabel: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

type FreeCategoryTab = "background" | "frame" | "deco" | "item";
type PaidCategoryTab = "coin" | "background" | "frame" | "deco" | "item" | "set";

const CHARM_BUTTON_CLASS: Record<(typeof SHOP_ATTRIBUTE_CHARMS)[number]["attribute"], string> = {
  power: "task-global-menu-button-danger",
  heal: "task-global-menu-button-heal",
  knowledge: "task-global-menu-button-knowledge",
  create: "task-global-menu-button-create"
};

function normalizeIosViewportAfterNativeDialog() {
  if (typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    window.scrollBy(0, 1);
    window.scrollBy(0, -1);
    document.documentElement.style.setProperty("--native-viewport-nudge", `${Date.now()}`);
  });
}

function isSupportedNativeStorePlatform(platform: "web" | "ios" | "android"): platform is NativeStorePlatform {
  return platform === "ios" || platform === "android";
}

function getNativeStoreProviderLabel(platform: NativeStorePlatform): string {
  return platform === "android" ? "Google Play" : "Apple";
}

function getNativeStoreProviderParam(platform: NativeStorePlatform): "app_store" | "google_play" {
  return platform === "android" ? "google_play" : "app_store";
}

function buildNativeStoreThanksUrl(provider: "app_store" | "google_play", grantedPaidCoins: number, fallbackPaidCoins: number): string {
  const coins = grantedPaidCoins || fallbackPaidCoins;
  const params = new URLSearchParams({
    provider,
    coins: String(coins)
  });
  return `/shop/thanks?${params.toString()}`;
}

export default function ShopPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    monsters,
    gameState,
    isLoading,
    purchaseBackground,
    equipBackground,
    purchaseFrame,
    equipFrame,
    unequipFrame,
    purchaseAttributeCharm,
    purchasePaidAttributeCharm,
    purchaseBooster,
    purchaseDecoration,
    purchasePaidBackground,
    purchasePaidFrame,
    purchasePaidBundle
  } = useGame();

  const [message, setMessage] = useState("");
  const [recentPurchase, setRecentPurchase] = useState<{ itemId: string; itemType: "background" | "frame"; title: string } | null>(null);
  const [purchaseModal, setPurchaseModal] = useState<PurchaseModalState | null>(null);
  const [activeCurrencyTab, setActiveCurrencyTab] = useState<"free" | "paid">("free");
  const [activeFreeCategoryTab, setActiveFreeCategoryTab] = useState<FreeCategoryTab>("background");
  const [activePaidCategoryTab, setActivePaidCategoryTab] = useState<PaidCategoryTab>("coin");
  const [checkoutItemId, setCheckoutItemId] = useState<string | null>(null);
  const [bundleConfirm, setBundleConfirm] = useState<BundleConfirmState | null>(null);
  const [purchaseConfirm, setPurchaseConfirm] = useState<PurchaseConfirmState | null>(null);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [nativePlatform, setNativePlatform] = useState<"web" | "ios" | "android">("web");
  const [nativePlatformLabel, setNativePlatformLabel] = useState("アプリ");
  const [nativeStoreProducts, setNativeStoreProducts] = useState<NativeStoreProductMap>({});
  const [nativeStoreProductError, setNativeStoreProductError] = useState("");

  useEffect(() => {
    setIsNativeApp(isNativeMobileApp());
    const platform = getNativePlatform();
    setNativePlatform(platform === "ios" || platform === "android" ? platform : "web");
    if (platform === "ios") {
      setNativePlatformLabel("iOSアプリ");
    } else if (platform === "android") {
      setNativePlatformLabel("Androidアプリ");
    } else {
      setNativePlatformLabel("アプリ");
    }
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 1600);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const currency = params.get("currency");
    const category = params.get("category");

    if (currency === "paid") setActiveCurrencyTab("paid");
    if (currency === "free") setActiveCurrencyTab("free");

    if (category === "background" || category === "frame" || category === "deco" || category === "item") {
      setActiveFreeCategoryTab(category);
    }

    if (category === "coin" || category === "background" || category === "frame" || category === "deco" || category === "item" || category === "set") {
      setActivePaidCategoryTab(category);
    }
  }, []);

  useEffect(() => {
    if (!gameState) return;
    if (gameState.endEventPending) {
      router.replace("/end-event");
      return;
    }
    if (gameState.birthEventPending) {
      router.replace("/birth-event");
      return;
    }
    if (shouldRouteToDailyReview(gameState)) {
      router.replace("/daily-review");
      return;
    }
    if (!gameState.hasSeenTutorial) {
      router.replace("/tutorial");
    }
  }, [gameState, router]);

  const paidCoinBundles = useMemo(
    () =>
      SHOP_PAID_COIN_ITEMS.filter(
        (item) => item.status === "confirmed" && item.productType === "bundle" && item.itemId !== "starter_bundle_boost_01"
      ),
    []
  );
  const paidCoinPacks = useMemo(
    () => SHOP_PAID_COIN_ITEMS.filter((item) => item.status === "confirmed" && item.productType === "coin_pack"),
    []
  );
  const paidBoosters = useMemo(() => SHOP_BOOSTER_ITEMS.filter((item) => item.currencyType === "paid_coin"), []);
  const freeBoosters = useMemo(() => SHOP_BOOSTER_ITEMS.filter((item) => item.currencyType === "free_coin"), []);

  useEffect(() => {
    if (!isNativeApp || nativePlatform !== "ios") return;

    const normalizeOnReturn = () => normalizeIosViewportAfterNativeDialog();
    window.addEventListener("focus", normalizeOnReturn);
    document.addEventListener("visibilitychange", normalizeOnReturn);

    return () => {
      window.removeEventListener("focus", normalizeOnReturn);
      document.removeEventListener("visibilitychange", normalizeOnReturn);
    };
  }, [isNativeApp, nativePlatform]);

  useEffect(() => {
    if (!isNativeApp || !isSupportedNativeStorePlatform(nativePlatform)) return;
    let isCancelled = false;

    async function loadProducts() {
      if (!isSupportedNativeStorePlatform(nativePlatform)) return;
      try {
        setNativeStoreProductError("");
        const products = await loadNativeStoreProducts(paidCoinPacks, nativePlatform);
        if (!isCancelled) {
          setNativeStoreProducts(products);
        }
      } catch (error) {
        console.error("[shop] failed to load native store products", error);
        if (!isCancelled) {
          const providerLabel = isSupportedNativeStorePlatform(nativePlatform) ? getNativeStoreProviderLabel(nativePlatform) : "アプリストア";
          setNativeStoreProductError(`${providerLabel}の商品情報を取得できませんでした。`);
        }
      }
    }

    void loadProducts();
    return () => {
      isCancelled = true;
    };
  }, [isNativeApp, nativePlatform, paidCoinPacks]);

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const activeEvent = getVisibleHomeEvents().find((event) => isEventActive(event)) ?? null;

  const openInventoryPopup = (title: string, lines: string[]) => {
    setRecentPurchase(null);
    setPurchaseModal({ title, lines });
  };

  const requestPurchase = (
    confirm: Omit<PurchaseConfirmState, "onConfirm">,
    onConfirm: () => void
  ) => {
    setPurchaseConfirm({ ...confirm, onConfirm });
  };

  const onConfirmPurchase = () => {
    if (!purchaseConfirm) return;
    const action = purchaseConfirm.onConfirm;
    setPurchaseConfirm(null);
    action();
  };

  const onBuy = (itemId: string, price: number) => {
    const result = purchaseBackground(itemId, price);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "insufficient_coins" ? "コインがたりません" : "すでに所持しています");
      return;
    }

    const item = SHOP_EVERGREEN_BACKGROUNDS.find((background) => background.itemId === itemId);
    trackEvent("shop_purchase", { item_id: itemId, item_name: item?.title ?? itemId, item_type: "background", currency_type: "free_coin", price });
    setRecentPurchase({ itemId, itemType: "background", title: item?.title ?? "背景" });
    setPurchaseModal(null);
    setMessage("こうにゅうしました");
  };

  const onEquip = (itemId: string) => {
    const result = equipBackground(itemId);
    if (!result) return;
    if (!result.equipped) {
      setMessage(result.reason === "already_equipped" ? "そうび中です" : "まだこうにゅうしていません");
      return;
    }
    setRecentPurchase(null);
    setMessage("背景をへんこうしました");
  };

  const onBuyFrame = (itemId: string, price: number) => {
    const result = purchaseFrame(itemId, price);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "insufficient_coins" ? "コインがたりません" : "すでに所持しています");
      return;
    }

    const item = SHOP_EVERGREEN_FRAMES.find((frame) => frame.itemId === itemId);
    trackEvent("shop_purchase", { item_id: itemId, item_name: item?.title ?? itemId, item_type: "frame", currency_type: "free_coin", price });
    setRecentPurchase({ itemId, itemType: "frame", title: item?.title ?? "フレーム" });
    setPurchaseModal(null);
    setMessage("こうにゅうしました");
  };

  const onBuyCharm = (attribute: (typeof SHOP_ATTRIBUTE_CHARMS)[number]["attribute"]) => {
    const result = purchaseAttributeCharm(attribute);
    const item = SHOP_ATTRIBUTE_CHARMS.find((charm) => charm.attribute === attribute);
    if (!result) return;
    if (!result.purchased) {
      setMessage(item ? `${item.title} を買うフリーコインがたりません` : "コインがたりません");
      return;
    }

    trackEvent("shop_purchase", {
      item_id: item?.itemId ?? `${attribute}_charm`,
      item_name: item?.title ?? `${attribute}_charm`,
      item_type: "attribute_charm",
      currency_type: "free_coin",
      price: item?.price ?? 300
    });
    if (item) {
      openInventoryPopup(item.title, [item.title]);
      setMessage(`${item.title} をこうにゅうしました`);
      return;
    }
    setMessage("こうにゅうしました");
  };

  const onBuyPaidCharm = (attribute: (typeof SHOP_PAID_ATTRIBUTE_CHARMS)[number]["attribute"]) => {
    const result = purchasePaidAttributeCharm(attribute);
    const item = SHOP_PAID_ATTRIBUTE_CHARMS.find((charm) => charm.attribute === attribute);
    if (!result) return;
    if (!result.purchased) {
      setMessage(item ? `${item.title} を買うモンタコインがたりません` : "モンタコインがたりません");
      return;
    }

    trackEvent("shop_purchase", {
      item_id: item?.itemId ?? `paid_charm_${attribute}_01`,
      item_name: item?.title ?? `paid_charm_${attribute}_01`,
      item_type: "premium_attribute_charm",
      currency_type: "paid_coin",
      price: item?.price ?? 300
    });
    if (item) {
      openInventoryPopup(item.title, [item.title]);
      setMessage(`${item.title} をこうにゅうしました`);
      return;
    }
    setMessage("こうにゅうしました");
  };

  const onBuyBooster = (itemId: string) => {
    const result = purchaseBooster(itemId);
    const item = getBoosterShopItem(itemId);
    if (!result) return;
    if (!result.purchased) {
      if (item?.currencyType === "free_coin") {
        setMessage(item ? `${item.title} を買うフリーコインがたりません` : "フリーコインがたりません");
      } else {
        setMessage(item ? `${item.title} を買うモンタコインがたりません` : "モンタコインがたりません");
      }
      return;
    }

    trackEvent("shop_purchase", {
      item_id: item?.itemId ?? itemId,
      item_name: item?.title ?? itemId,
      item_type: "booster",
      currency_type: item?.currencyType ?? "paid_coin",
      price: item?.price ?? 0
    });
    if (item) {
      openInventoryPopup(item.title, [item.title]);
      setMessage(`${item.title} をこうにゅうしました`);
      return;
    }
    setMessage("こうにゅうしました");
  };

  const onBuyPaidBackground = (itemId: string) => {
    const result = purchasePaidBackground(itemId);
    const item = SHOP_PAID_BACKGROUNDS.find((background) => background.itemId === itemId);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "already_owned" ? "すでに所持しています" : "モンタコインがたりません");
      return;
    }

    if (item) {
      trackEvent("shop_purchase", { item_id: item.itemId, item_name: item.title, item_type: "background", currency_type: "paid_coin", price: item.price });
      setRecentPurchase({ itemId, itemType: "background", title: item.title });
      setPurchaseModal(null);
    }
    setMessage("こうにゅうしました");
  };

  const onBuyPaidFrame = (itemId: string) => {
    const result = purchasePaidFrame(itemId);
    const item = SHOP_PAID_FRAMES.find((frame) => frame.itemId === itemId);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "already_owned" ? "すでに所持しています" : "モンタコインがたりません");
      return;
    }

    if (item) {
      trackEvent("shop_purchase", { item_id: item.itemId, item_name: item.title, item_type: "frame", currency_type: "paid_coin", price: item.price });
      setRecentPurchase({ itemId, itemType: "frame", title: item.title });
      setPurchaseModal(null);
    }
    setMessage("こうにゅうしました");
  };

  const onBuyPaidBundle = (itemId: string) => {
    const result = purchasePaidBundle(itemId);
    const item = SHOP_EVERGREEN_BUNDLES.find((bundle) => bundle.itemId === itemId);
    if (!result) return;
    if (!result.purchased) {
      setMessage("モンタコインがたりません");
      return;
    }

    if (item) {
      trackEvent("shop_purchase", { item_id: item.itemId, item_name: item.title, item_type: "bundle", currency_type: "paid_coin", price: item.price });
      if (item.itemId === "paid_bundle_spring_deco_01") {
        openInventoryPopup(item.title, ["ピクニックバスケット", "花灯りランタン", "春の芽吹きたまご"]);
      } else {
        openInventoryPopup(item.title, [item.title]);
      }
      setMessage(`${item.title} をこうにゅうしました`);
      return;
    }
    setMessage("こうにゅうしました");
  };

  const getBundleConfirmState = (itemId: string): BundleConfirmState | null => {
    const item = SHOP_EVERGREEN_BUNDLES.find((bundle) => bundle.itemId === itemId);
    if (!item) return null;

    if (item.itemId === "paid_bundle_spring_deco_01") {
      const ownedLines = [
        gameState.ownedDecorationIds.includes("paid_deco_picnic_basket_01") ? "ピクニックバスケット" : "",
        gameState.ownedDecorationIds.includes("paid_deco_flower_lantern_01") ? "花灯りランタン" : ""
      ].filter(Boolean);

      return {
        itemId,
        title: item.title,
        ownedLines,
        grantedLines: ["ピクニックバスケット", "花灯りランタン", "春の芽吹きたまご"]
      };
    }

    return {
      itemId,
      title: item.title,
      ownedLines: [],
      grantedLines: [item.title]
    };
  };

  const onRequestBuyPaidBundle = (itemId: string) => {
    const confirmState = getBundleConfirmState(itemId);
    if (confirmState && confirmState.ownedLines.length > 0) {
      setBundleConfirm(confirmState);
      return;
    }
    const item = SHOP_EVERGREEN_BUNDLES.find((bundle) => bundle.itemId === itemId);
    requestPurchase(
      {
        title: item?.title ?? "セット",
        priceLabel: item ? `${item.price} モンタコイン` : "モンタコイン",
        message: "このセットを購入しますか？"
      },
      () => onBuyPaidBundle(itemId)
    );
  };

  const onConfirmBuyPaidBundle = () => {
    if (!bundleConfirm) return;
    const itemId = bundleConfirm.itemId;
    setBundleConfirm(null);
    onBuyPaidBundle(itemId);
  };

  const onBuyDecoration = (itemId: string) => {
    const result = purchaseDecoration(itemId);
    const item = SHOP_EVERGREEN_DECORATIONS.find((decoration) => decoration.itemId === itemId);
    if (!result) return;
    if (!result.purchased) {
      setMessage(result.reason === "already_owned" ? "すでに所持しています" : "モンタコインがたりません");
      return;
    }

    if (item) {
      trackEvent("shop_purchase", { item_id: item.itemId, item_name: item.title, item_type: "decoration", currency_type: "paid_coin", price: item.price });
      openInventoryPopup(item.title, [item.title]);
      setMessage(`${item.title} をこうにゅうしました`);
      return;
    }
    setMessage("こうにゅうしました");
  };

  const onEquipFrame = (itemId: string) => {
    const result = equipFrame(itemId);
    if (!result) return;
    if (!result.equipped) {
      setMessage(result.reason === "already_equipped" ? "そうび中です" : "まだこうにゅうしていません");
      return;
    }

    setRecentPurchase(null);
    setMessage("フレームをへんこうしました");
  };

  const onUnequipFrame = () => {
    const result = unequipFrame();
    if (!result) return;
    if (!result.equipped) {
      setMessage("フレームは外れています");
      return;
    }
    setRecentPurchase(null);
    setMessage("フレームを外しました");
  };

  const onEquipRecent = () => {
    if (!recentPurchase) return;
    if (recentPurchase.itemType === "background") {
      onEquip(recentPurchase.itemId);
      return;
    }
    onEquipFrame(recentPurchase.itemId);
  };

  const onStartPaidCheckout = async (item: (typeof SHOP_PAID_COIN_ITEMS)[number]) => {
    try {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) {
        setMessage("ログインすると購入できます");
        router.push("/settings");
        return;
      }

      setCheckoutItemId(item.itemId);
      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ productId: item.itemId })
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setMessage(payload.error ?? "決済ページを開けませんでした");
        return;
      }

      trackEvent("begin_checkout", {
        item_id: item.itemId,
        item_type: item.productType,
        value: item.priceJpy,
        currency: "JPY"
      });
      window.location.href = payload.url;
    } catch (error) {
      console.error("[shop] failed to start paid checkout", error);
      setMessage("決済ページを開けませんでした");
    } finally {
      setCheckoutItemId(null);
    }
  };

  const getNativeStoreProduct = (item: (typeof SHOP_PAID_COIN_ITEMS)[number]) => {
    if (!isSupportedNativeStorePlatform(nativePlatform)) return null;
    const productId = getNativeStoreProductId(item, nativePlatform);
    return productId ? nativeStoreProducts[productId] ?? null : null;
  };

  const getPaidCoinTitle = (item: (typeof SHOP_PAID_COIN_ITEMS)[number]) =>
    isSupportedNativeStorePlatform(nativePlatform) ? getNativeStoreProduct(item)?.title ?? item.title : item.title;

  const getPaidCoinPriceLabel = (item: (typeof SHOP_PAID_COIN_ITEMS)[number]) => {
    if (isSupportedNativeStorePlatform(nativePlatform)) {
      return getNativeStoreProduct(item)?.priceString ?? "価格取得中";
    }
    return `${item.priceJpy} 円`;
  };

  const fulfillNativeStoreTransaction = async (
    transaction: Awaited<ReturnType<typeof purchaseNativeStoreProduct>>,
    platform: NativeStorePlatform,
    appAccountToken: string,
    expectedProductId: string,
    idToken: string
  ) => {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser) {
      throw new Error("ログインが必要です。");
    }

    const storeProductId = transaction.productIdentifier ?? expectedProductId;
    if (!storeProductId) {
      throw new Error("購入商品の情報を取得できませんでした。");
    }

    const transactionSnapshot = await summarizeNativeStoreTransaction(transaction);
    console.info("[shop] native store transaction received", {
      platform,
      productIdentifier: storeProductId,
      transactionId: transaction.transactionId,
      hasPurchaseToken: Boolean(transaction.purchaseToken),
      hasSignedTransactionInfo: Boolean(transaction.jwsRepresentation)
    });

    const response = await fetch(platform === "android" ? "/api/google-play/fulfill" : "/api/app-store/fulfill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(
        platform === "android"
          ? {
              googlePlayProductId: storeProductId,
              purchaseToken: transaction.purchaseToken,
              transactionId: transaction.transactionId,
              orderId: transaction.orderId ?? null,
              purchaseState: transaction.purchaseState ?? null,
              appAccountToken
            }
          : {
              appStoreProductId: storeProductId,
              transactionId: transaction.transactionId,
              appAccountToken,
              signedTransactionInfo: transaction.jwsRepresentation ?? null
            }
      )
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; grantedPaidCoins?: number } | null;

    if (!response.ok) {
      const diagnosticId = await writeNativeStoreDiagnostic(idToken, {
        eventName: "purchase_fulfill_failed",
        platform,
        appAccountTokenPresent: Boolean(appAccountToken),
        targetProductId: storeProductId,
        transaction: transactionSnapshot,
        responseStatus: response.status,
        errorMessage: payload?.error ?? "purchase fulfill failed"
      });
      throw new Error(`${payload?.error ?? "購入の反映に失敗しました。"} (${response.status})${diagnosticId ? ` 診断ID: ${diagnosticId}` : ""}`);
    }

    try {
      await finishNativeStoreTransaction(transaction, platform);
    } catch (finishError) {
      await writeNativeStoreDiagnostic(idToken, {
        eventName: "purchase_finish_failed",
        platform,
        appAccountTokenPresent: Boolean(appAccountToken),
        targetProductId: storeProductId,
        transaction: transactionSnapshot,
        errorMessage: finishError instanceof Error ? finishError.message : "finish native transaction failed"
      });
      console.warn("[shop] native store transaction was fulfilled but finish failed", finishError);
    }
    await writeNativeStoreDiagnostic(idToken, {
      eventName: "purchase_fulfill_success",
      platform,
      appAccountTokenPresent: Boolean(appAccountToken),
      targetProductId: storeProductId,
      transaction: transactionSnapshot,
      responseStatus: response.status,
      grantedPaidCoins: payload?.grantedPaidCoins ?? 0
    });
    return payload?.grantedPaidCoins ?? 0;
  };

  const onStartNativeStorePurchase = async (item: (typeof SHOP_PAID_COIN_ITEMS)[number]) => {
    try {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) {
        setMessage("ログインすると購入できます");
        router.push("/settings");
        return;
      }

      if (!isSupportedNativeStorePlatform(nativePlatform)) {
        setMessage(`${nativePlatformLabel}版での購入は準備中です。`);
        return;
      }

      const providerLabel = getNativeStoreProviderLabel(nativePlatform);
      const productId = getNativeStoreProductId(item, nativePlatform);
      if (!productId || !getNativeStoreProduct(item)) {
        setMessage(`${providerLabel}の商品情報を取得できませんでした`);
        return;
      }

      setCheckoutItemId(item.itemId);
      const idToken = await currentUser.getIdToken();
      const appAccountToken = await createAppAccountToken(currentUser.uid);

      await writeNativeStoreDiagnostic(idToken, {
        eventName: "purchase_start",
        platform: nativePlatform,
        appAccountTokenPresent: Boolean(appAccountToken),
        targetProductId: productId
      });

      trackEvent("begin_checkout", {
        item_id: item.itemId,
        item_type: item.productType,
        value: item.priceJpy,
        currency: "JPY",
        payment_provider: getNativeStoreProviderParam(nativePlatform)
      });

      const transaction = await purchaseNativeStoreProduct(item, nativePlatform, appAccountToken);
      await writeNativeStoreDiagnostic(idToken, {
        eventName: "purchase_result",
        platform: nativePlatform,
        appAccountTokenPresent: Boolean(appAccountToken),
        targetProductId: productId,
        transaction: await summarizeNativeStoreTransaction(transaction)
      });
      const grantedPaidCoins = await fulfillNativeStoreTransaction(transaction, nativePlatform, appAccountToken, productId, idToken);
      trackEvent("purchase", {
        transaction_id: transaction.transactionId ?? transaction.orderId ?? undefined,
        value: item.priceJpy,
        currency: "JPY",
        payment_provider: getNativeStoreProviderParam(nativePlatform),
        monta_coins_granted: grantedPaidCoins,
        items: [
          {
            item_id: item.itemId,
            item_name: item.title,
            item_category: item.productType,
            price: item.priceJpy,
            quantity: 1
          }
        ]
      });
      if (nativePlatform === "ios") {
        normalizeIosViewportAfterNativeDialog();
      }
      router.replace(buildNativeStoreThanksUrl(getNativeStoreProviderParam(nativePlatform), grantedPaidCoins, item.totalPaidCoins));
    } catch (error) {
      console.error(
        "[shop] failed to complete native store purchase",
        error instanceof Error ? { message: error.message, stack: error.stack } : error
      );
      setMessage(error instanceof Error ? error.message : "購入に失敗しました");
    } finally {
      setCheckoutItemId(null);
    }
  };

  const freeCards = activeFreeCategoryTab === "background"
    ? SHOP_EVERGREEN_BACKGROUNDS.map((item) => {
        const owned = gameState.ownedBackgroundIds.includes(item.itemId);
        const equipped = gameState.selectedBackgroundId === item.itemId;
        const insufficientCoins = gameState.freeCoins < item.price;
        return (
          <section className="card decorated-card shop-grid-card" key={item.itemId}>
            <div className="shop-grid-preview" style={{ backgroundImage: `url("${item.imagePath}")` }}>
              {equipped && <span className="equipped-badge">使用中</span>}
            </div>
            <div className="shop-grid-meta">
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <div className="shop-grid-price">{item.price === 0 ? "初期所持" : `${item.price} フリーコイン`}</div>
            </div>
            {!owned ? (
              <button
                className="quest-btn shop-grid-button task-global-menu-button-primary"
                onClick={() =>
                  requestPurchase(
                    {
                      title: item.title,
                      priceLabel: `${item.price} フリーコイン`,
                      message: "この背景を購入しますか？"
                    },
                    () => onBuy(item.itemId, item.price)
                  )
                }
                disabled={insufficientCoins}
              >
                {insufficientCoins ? "コイン不足" : "購入する"}
              </button>
            ) : (
              <button className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`} onClick={() => onEquip(item.itemId)}>
                {equipped ? "そうび中" : "使う"}
              </button>
            )}
          </section>
        );
      })
    : activeFreeCategoryTab === "frame"
      ? SHOP_EVERGREEN_FRAMES.map((item) => {
          const owned = gameState.ownedFrameIds.includes(item.itemId);
          const equipped = gameState.selectedFrameId === item.itemId;
          const framePreviewImagePath = getFramePreviewImagePath(item.itemId);
          const insufficientCoins = gameState.freeCoins < item.price;
          return (
            <section className="card decorated-card shop-grid-card" key={item.itemId}>
              <div className={`shop-grid-preview shop-frame-preview ${framePreviewImagePath ? "shop-frame-preview-image-only" : item.previewClassName}`}>
                {framePreviewImagePath ? <img src={framePreviewImagePath} alt={item.title} className="shop-frame-image" /> : null}
                {equipped && <span className="equipped-badge">使用中</span>}
              </div>
              <div className="shop-grid-meta">
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <div className="shop-grid-price">{item.price === 0 ? "初期所持" : `${item.price} フリーコイン`}</div>
              </div>
              {!owned ? (
                <button
                  className="quest-btn shop-grid-button task-global-menu-button-primary"
                  onClick={() =>
                    requestPurchase(
                      {
                        title: item.title,
                        priceLabel: `${item.price} フリーコイン`,
                        message: "このフレームを購入しますか？"
                      },
                      () => onBuyFrame(item.itemId, item.price)
                    )
                  }
                  disabled={insufficientCoins}
                >
                  {insufficientCoins ? "コイン不足" : "購入する"}
                </button>
              ) : (
                <>
                  <button className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`} onClick={() => onEquipFrame(item.itemId)}>
                    {equipped ? "そうび中" : "使う"}
                  </button>
                  {equipped ? (
                    <button className="quest-btn shop-grid-button task-global-menu-button-secondary" onClick={onUnequipFrame}>
                      フレームを外す
                    </button>
                  ) : null}
                </>
              )}
            </section>
          );
        })
      : activeFreeCategoryTab === "item"
        ? [
            ...SHOP_ATTRIBUTE_CHARMS.map((item) => {
              const ownedCount = gameState.ownedCharmItemCounts[item.attribute] ?? 0;
              const equipped = gameState.activeAttributeCharm?.attribute === item.attribute && (gameState.activeAttributeCharm?.variant ?? "free") === "free";
              const insufficientCoins = gameState.freeCoins < item.price;
              return (
                <section className={`card decorated-card shop-grid-card charm-card-${item.attribute}`} key={item.itemId}>
                  <div className={`shop-grid-preview shop-charm-preview charm-preview-${item.attribute}`}>
                    <img src={item.iconPath} alt={item.title} className="shop-charm-icon" />
                    {equipped && <span className="equipped-badge">発動中</span>}
                  </div>
                  <div className="shop-grid-meta">
                    <h2 className={`charm-title charm-title-${item.attribute}`}>{item.title}</h2>
                    <p>{item.description}</p>
                    <div className={`shop-grid-price charm-price charm-price-${item.attribute}`}>{item.price} フリーコイン / 所持 {ownedCount}</div>
                  </div>
                  <button
                    className={`quest-btn shop-grid-button ${CHARM_BUTTON_CLASS[item.attribute]}`}
                    onClick={() =>
                      requestPurchase(
                        {
                          title: item.title,
                          priceLabel: `${item.price} フリーコイン`,
                          message: "このアイテムを購入しますか？"
                        },
                        () => onBuyCharm(item.attribute)
                      )
                    }
                    disabled={insufficientCoins}
                  >
                    {insufficientCoins ? "コイン不足" : "購入する"}
                  </button>
                </section>
              );
            }),
            ...freeBoosters.map((item) => {
              const ownedCount = gameState.ownedBoosterItemCounts[item.itemId] ?? 0;
              const isActive = gameState.activeExpBooster?.itemId === item.itemId;
              const insufficientCoins = gameState.freeCoins < item.price;
              return (
                <section className="card decorated-card shop-grid-card" key={item.itemId}>
                  <div className="shop-grid-preview shop-charm-preview shop-grid-preview-coming-soon">
                    {item.iconPath ? <img src={item.iconPath} alt={item.title} className="shop-charm-icon" /> : <span className="shop-coming-soon-label">BOOST</span>}
                    {isActive && <span className="equipped-badge">発動中</span>}
                  </div>
                  <div className="shop-grid-meta">
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                    <div className="shop-grid-price">{item.price} フリーコイン / 所持 {ownedCount}</div>
                  </div>
                  <button
                    className="quest-btn shop-grid-button task-global-menu-button-primary"
                    onClick={() =>
                      requestPurchase(
                        {
                          title: item.title,
                          priceLabel: `${item.price} フリーコイン`,
                          message: "このアイテムを購入しますか？"
                        },
                        () => onBuyBooster(item.itemId)
                      )
                    }
                    disabled={insufficientCoins}
                  >
                    {insufficientCoins ? "コイン不足" : "購入する"}
                  </button>
                </section>
              );
            })
          ]
        : [
            <section className="card decorated-card shop-empty-card" key="free-deco-empty">
              <p>フリーコインで買えるデコは、これから追加予定です。</p>
            </section>
          ];

  const paidCards = activePaidCategoryTab === "coin"
    ? paidCoinPacks.map((item) => {
        const nativeStoreProduct = getNativeStoreProduct(item);
        const priceLabel = getPaidCoinPriceLabel(item);
        const title = getPaidCoinTitle(item);
        const isNativeStorePlatform = isSupportedNativeStorePlatform(nativePlatform);
        const nativeStoreProviderLabel = isNativeStorePlatform ? getNativeStoreProviderLabel(nativePlatform) : nativePlatformLabel;
        const isNativeStoreReady = !isNativeStorePlatform || Boolean(nativeStoreProduct);

        return (
          <section className="card decorated-card shop-grid-card" key={item.itemId}>
            <div className="shop-grid-preview shop-grid-preview-paid">
              <div className="shop-badge-stack">
                <span className="shop-paid-badge">有料</span>
              </div>
              <img src={item.imagePath} alt={title} className="shop-paid-pack-icon" />
              <div className="shop-paid-amount">{item.totalPaidCoins}</div>
              <div className="shop-paid-label">モンタコイン</div>
            </div>
            <div className="shop-grid-meta">
              <h2>{title}</h2>
              <p>{item.description}</p>
              <div className="shop-grid-price">{priceLabel}{item.bonusPaidCoins > 0 ? ` / +${item.bonusPaidCoins} おまけ` : ""}</div>
            </div>
            {isNativeApp && isNativeStorePlatform ? (
              <>
                {nativeStoreProductError ? (
                  <p className="shop-note shop-note-strong">{nativeStoreProductError}</p>
                ) : null}
                <button
                  className="quest-btn shop-grid-button task-global-menu-button-accent"
                  onClick={() =>
                    requestPurchase(
                      {
                        title,
                        priceLabel,
                        message: `${nativeStoreProviderLabel}の購入画面へ進みます。購入しますか？`,
                        confirmLabel: "購入へ進む"
                      },
                      () => onStartNativeStorePurchase(item)
                    )
                  }
                  disabled={checkoutItemId === item.itemId || !user || !isNativeStoreReady}
                >
                  {!user ? "ログインで購入可能" : checkoutItemId === item.itemId ? "処理中..." : `${nativeStoreProviderLabel}で購入`}
                </button>
              </>
            ) : isNativeApp ? (
              <p className="shop-note shop-note-strong">{nativePlatformLabel}版での購入は準備中です。</p>
            ) : (
              <button
                className="quest-btn shop-grid-button task-global-menu-button-accent"
                onClick={() =>
                  requestPurchase(
                    {
                      title: item.title,
                      priceLabel: `${item.priceJpy} 円`,
                      message: "決済ページへ移動します。購入しますか？",
                      confirmLabel: "決済へ進む"
                    },
                    () => onStartPaidCheckout(item)
                  )
                }
                disabled={checkoutItemId === item.itemId || !user}
              >
                {!user ? "ログインで購入可能" : checkoutItemId === item.itemId ? "移動中..." : "Stripe で購入"}
              </button>
            )}
          </section>
        );
      })
    : activePaidCategoryTab === "background"
      ? SHOP_PAID_BACKGROUNDS.length > 0
        ? SHOP_PAID_BACKGROUNDS.map((item) => {
            const owned = gameState.ownedBackgroundIds.includes(item.itemId);
            const equipped = gameState.selectedBackgroundId === item.itemId;
            const insufficientCoins = gameState.paidCoinBalance < item.price;
            return (
              <section className="card decorated-card shop-grid-card" key={item.itemId}>
                <div className="shop-grid-preview" style={{ backgroundImage: `url("${item.imagePath}")` }}>
                  <div className="shop-badge-stack"><span className="shop-paid-badge">モンタ</span></div>
                  {equipped && <span className="equipped-badge">使用中</span>}
                </div>
                <div className="shop-grid-meta">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <div className="shop-grid-price">{item.price} モンタコイン</div>
                </div>
                {!owned ? (
                  <button
                    className="quest-btn shop-grid-button task-global-menu-button-accent"
                    onClick={() =>
                      requestPurchase(
                        {
                          title: item.title,
                          priceLabel: `${item.price} モンタコイン`,
                          message: "この背景を購入しますか？"
                        },
                        () => onBuyPaidBackground(item.itemId)
                      )
                    }
                    disabled={insufficientCoins}
                  >
                    {insufficientCoins ? "コイン不足" : "購入する"}
                  </button>
                ) : (
                  <button className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`} onClick={() => onEquip(item.itemId)}>
                    {equipped ? "そうび中" : "使う"}
                  </button>
                )}
              </section>
            );
          })
        : [<section className="card decorated-card shop-empty-card" key="paid-bg-empty"><p>モンタコインで買える背景は準備中です。</p></section>]
      : activePaidCategoryTab === "frame"
        ? SHOP_PAID_FRAMES.map((item) => {
            const owned = gameState.ownedFrameIds.includes(item.itemId);
            const equipped = gameState.selectedFrameId === item.itemId;
            const framePreviewImagePath = getFramePreviewImagePath(item.itemId);
            const insufficientCoins = gameState.paidCoinBalance < item.price;
            return (
              <section className="card decorated-card shop-grid-card" key={item.itemId}>
                <div className={`shop-grid-preview shop-frame-preview ${framePreviewImagePath ? "shop-frame-preview-image-only" : item.previewClassName}`}>
                  {!framePreviewImagePath ? (
                    <div className="shop-badge-stack"><span className="shop-paid-badge">モンタ</span></div>
                  ) : null}
                  {framePreviewImagePath ? <img src={framePreviewImagePath} alt={item.title} className="shop-frame-image" /> : null}
                  {equipped && <span className="equipped-badge">使用中</span>}
                </div>
                <div className="shop-grid-meta">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                  <div className="shop-grid-price">{item.price} モンタコイン</div>
                </div>
                {!owned ? (
                  <button
                    className="quest-btn shop-grid-button task-global-menu-button-accent"
                    onClick={() =>
                      requestPurchase(
                        {
                          title: item.title,
                          priceLabel: `${item.price} モンタコイン`,
                          message: "このフレームを購入しますか？"
                        },
                        () => onBuyPaidFrame(item.itemId)
                      )
                    }
                    disabled={insufficientCoins}
                  >
                    {insufficientCoins ? "コイン不足" : "購入する"}
                  </button>
                ) : (
                  <>
                    <button className={`quest-btn shop-grid-button ${equipped ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`} onClick={() => onEquipFrame(item.itemId)}>
                      {equipped ? "そうび中" : "使う"}
                    </button>
                    {equipped ? (
                      <button className="quest-btn shop-grid-button task-global-menu-button-secondary" onClick={onUnequipFrame}>
                        フレームを外す
                      </button>
                    ) : null}
                  </>
                )}
              </section>
            );
          })
        : activePaidCategoryTab === "deco"
          ? SHOP_EVERGREEN_DECORATIONS.length > 0
            ? SHOP_EVERGREEN_DECORATIONS.map((item) => {
                const owned = gameState.ownedDecorationIds.includes(item.itemId);
                const insufficientCoins = gameState.paidCoinBalance < item.price;
                return (
                  <section className="card decorated-card shop-grid-card" key={item.itemId}>
                    <div className="shop-grid-preview shop-decoration-preview">
                      <div className="shop-badge-stack"><span className="shop-paid-badge">モンタ</span></div>
                      <img src={item.imagePath} alt={item.title} className="shop-decoration-image" />
                    </div>
                    <div className="shop-grid-meta">
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <div className="shop-grid-price">{item.price} モンタコイン</div>
                    </div>
                    <button
                      className={`quest-btn shop-grid-button ${owned ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`}
                      onClick={() =>
                        requestPurchase(
                          {
                            title: item.title,
                            priceLabel: `${item.price} モンタコイン`,
                            message: "このデコを購入しますか？"
                          },
                          () => onBuyDecoration(item.itemId)
                        )
                      }
                      disabled={owned || insufficientCoins}
                    >
                      {owned ? "所持中" : insufficientCoins ? "コイン不足" : "購入する"}
                    </button>
                  </section>
                );
              })
            : [<section className="card decorated-card shop-empty-card" key="paid-deco-empty"><p>モンタコインで買える常設デコは準備中です。</p></section>]
          : activePaidCategoryTab === "item"
            ? [
                ...SHOP_PAID_ATTRIBUTE_CHARMS.map((item) => {
                  const ownedCount = gameState.ownedPaidCharmItemCounts[item.attribute] ?? 0;
                  const insufficientCoins = gameState.paidCoinBalance < item.price;
                  return (
                    <section className={`card decorated-card shop-grid-card charm-card-${item.attribute}`} key={item.itemId}>
                      <div className={`shop-grid-preview shop-charm-preview charm-preview-${item.attribute}`}>
                        <div className="shop-badge-stack"><span className="shop-paid-badge">モンタ</span></div>
                        <img src={item.iconPath} alt={item.title} className="shop-charm-icon" />
                      </div>
                      <div className="shop-grid-meta">
                        <h2 className={`charm-title charm-title-${item.attribute}`}>{item.title}</h2>
                        <p>{item.description}</p>
                        <div className={`shop-grid-price charm-price charm-price-${item.attribute}`}>{item.price} モンタコイン / 所持 {ownedCount}</div>
                      </div>
                      <button
                        className={`quest-btn shop-grid-button ${CHARM_BUTTON_CLASS[item.attribute]}`}
                        onClick={() =>
                          requestPurchase(
                            {
                              title: item.title,
                              priceLabel: `${item.price} モンタコイン`,
                              message: "このアイテムを購入しますか？"
                            },
                            () => onBuyPaidCharm(item.attribute)
                          )
                        }
                        disabled={insufficientCoins}
                      >
                        {insufficientCoins ? "コイン不足" : "購入する"}
                      </button>
                    </section>
                  );
                }),
                ...paidBoosters.map((item) => {
                  const ownedCount = gameState.ownedBoosterItemCounts[item.itemId] ?? 0;
                  const isActive = gameState.activeExpBooster?.itemId === item.itemId;
                  const insufficientCoins = gameState.paidCoinBalance < item.price;
                  return (
                    <section className="card decorated-card shop-grid-card" key={item.itemId}>
                      <div className="shop-grid-preview shop-charm-preview shop-grid-preview-paid">
                        <div className="shop-badge-stack"><span className="shop-paid-badge">モンタ</span></div>
                        {item.iconPath ? <img src={item.iconPath} alt={item.title} className="shop-charm-icon" /> : null}
                        {isActive && <span className="equipped-badge">発動中</span>}
                      </div>
                      <div className="shop-grid-meta">
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                        <div className="shop-grid-price">{item.price} モンタコイン / 所持 {ownedCount}</div>
                      </div>
                      <button
                        className="quest-btn shop-grid-button task-global-menu-button-accent"
                        onClick={() =>
                          requestPurchase(
                            {
                              title: item.title,
                              priceLabel: `${item.price} モンタコイン`,
                              message: "このアイテムを購入しますか？"
                            },
                            () => onBuyBooster(item.itemId)
                          )
                        }
                        disabled={insufficientCoins}
                      >
                        {insufficientCoins ? "コイン不足" : "購入する"}
                      </button>
                    </section>
                  );
                })
              ]
            : [
                ...paidCoinBundles.map((item) => (
                  <section className="card decorated-card shop-grid-card" key={item.itemId}>
                    <div className="shop-grid-preview shop-grid-preview-paid">
                      <div className="shop-badge-stack">
                        <span className="shop-paid-badge">決済</span>
                                              </div>
                      <img src={item.imagePath} alt={item.title} className="shop-paid-pack-icon" />
                    </div>
                    <div className="shop-grid-meta">
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <div className="shop-grid-price">{item.priceJpy} 円</div>
                    </div>
                    {isNativeApp ? (
                      <p className="shop-note shop-note-strong">{nativePlatformLabel}版での購入は準備中です。</p>
                    ) : (
                      <button
                        className="quest-btn shop-grid-button task-global-menu-button-accent"
                        onClick={() =>
                          requestPurchase(
                            {
                              title: item.title,
                              priceLabel: `${item.priceJpy} 円`,
                              message: "決済ページへ移動します。購入しますか？",
                              confirmLabel: "決済へ進む"
                            },
                            () => onStartPaidCheckout(item)
                          )
                        }
                        disabled={checkoutItemId === item.itemId || !user}
                      >
                        {!user ? "ログインで購入可能" : checkoutItemId === item.itemId ? "移動中..." : "Stripe で購入"}
                      </button>
                    )}
                  </section>
                )),
                ...SHOP_EVERGREEN_BUNDLES.map((item) => {
                  const insufficientCoins = gameState.paidCoinBalance < item.price;
                  return (
                    <section className="card decorated-card shop-grid-card" key={item.itemId}>
                      <div className="shop-grid-preview shop-grid-preview-paid">
                        <div className="shop-badge-stack"><span className="shop-paid-badge">モンタ</span></div>
                        <img src={item.imagePath} alt={item.title} className="shop-paid-pack-icon" />
                      </div>
                      <div className="shop-grid-meta">
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                        <div className="shop-grid-price">{item.price} モンタコイン</div>
                      </div>
                      <button className="quest-btn shop-grid-button task-global-menu-button-accent" onClick={() => onRequestBuyPaidBundle(item.itemId)} disabled={insufficientCoins}>
                        {insufficientCoins ? "コイン不足" : "購入する"}
                      </button>
                    </section>
                  );
                })
              ];

  return (
    <main className={`page-shell page-rpg page-shop ${getFrameThemeClass(gameState.selectedFrameId)}`} style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}>
      <div className="title-panel">ショップ</div>
      <section className="card decorated-card quest-heading-card">
        <p>フリーコインやモンタコインで、見た目やアイテムをそろえられます。</p>
      </section>

      {message && <div className="toast">{message}</div>}

      {recentPurchase && (
        <div className="auth-email-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-equip-modal-title">
          <div className="card decorated-card auth-email-modal-card">
            <h2 id="shop-equip-modal-title" className="auth-email-modal-title">購入しました</h2>
            <p className="shop-note shop-note-strong"><strong>{recentPurchase.title}</strong> を購入しました。</p>
            <p className="shop-note">すぐ装備するかい？</p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={onEquipRecent}>いますぐ装備する</button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => router.push("/inventory")}>持ち物で確認</button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => setRecentPurchase(null)}>あとで</button>
            </div>
          </div>
        </div>
      )}

      {purchaseConfirm && (
        <div className="auth-email-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-purchase-confirm-title">
          <div className="card decorated-card auth-email-modal-card">
            <h2 id="shop-purchase-confirm-title" className="auth-email-modal-title">購入しますか？</h2>
            <p className="shop-note shop-note-strong"><strong>{purchaseConfirm.title}</strong></p>
            <p className="shop-note">{purchaseConfirm.message ?? "この商品を購入しますか？"}</p>
            <div className="shop-confirm-balance-grid">
              <div><span>所持フリーコイン</span><strong>{gameState.freeCoins}</strong></div>
              <div><span>所持モンタコイン</span><strong>{gameState.paidCoinBalance}</strong></div>
            </div>
            <div className="shop-grid-price shop-confirm-price">{purchaseConfirm.priceLabel}</div>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={onConfirmPurchase}>
                {purchaseConfirm.confirmLabel ?? "購入する"}
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => setPurchaseConfirm(null)}>
                やめる
              </button>
            </div>
          </div>
        </div>
      )}

      {purchaseModal && (
        <div className="auth-email-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-purchase-complete-title">
          <div className="card decorated-card auth-email-modal-card shop-recent-purchase">
            <h2 id="shop-purchase-complete-title" className="auth-email-modal-title">購入しました</h2>
            <p><strong>{purchaseModal.title}</strong> を購入しました。</p>
            <p>{purchaseModal.lines.map((line) => `「${line}」`).join(" と ")} を購入しました。もちものページを確認しよう。</p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={() => router.push("/inventory")}>持ち物を見る</button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => setPurchaseModal(null)}>とじる</button>
            </div>
          </div>
        </div>
      )}

      {bundleConfirm ? (
        <div className="auth-email-modal-overlay">
          <div className="auth-email-modal-card">
            <h2 className="auth-email-modal-title">セットを購入しますか？</h2>
            <p className="shop-note">
              <strong>{bundleConfirm.title}</strong>
              {" "}
              には、すでに所持しているアイテムが含まれています。
            </p>
            <p className="shop-note">所持中: {bundleConfirm.ownedLines.map((line) => `「${line}」`).join(" / ")}</p>
            <p className="shop-note">内容: {bundleConfirm.grantedLines.map((line) => `「${line}」`).join(" / ")}</p>
            <div className="task-global-menu">
              <button className="quest-btn task-global-menu-button task-global-menu-button-accent" onClick={onConfirmBuyPaidBundle}>
                それでも購入する
              </button>
              <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={() => setBundleConfirm(null)}>
                やめる
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="card decorated-card">
        <div className="status-panel compact-status-panel">
          <div className="status-row"><span>所持無料コイン</span><strong>{gameState.freeCoins}</strong></div>
          <div className="status-row"><span>所持モンタコイン</span><strong>{gameState.paidCoinBalance}</strong></div>
        </div>
      </section>

      {activeEvent && (
        <Link href={`/shop/events/${activeEvent.slug}`} className="card decorated-card event-shop-link-card">
          <img src={activeEvent.shopBannerImagePath?.replace("_shop_01.png", "_shop_icon_01.png") ?? "/img/icon/icon_shop_01.png"} alt="" className="event-shop-link-card-icon" />
          <div className="event-shop-link-card-copy">
            <span className="notification-badge notification-badge-event">イベントショップ</span>
            <strong>{activeEvent.name}</strong>
            <p>限定アイテムとイベントたまごはこちら</p>
          </div>
          <span className="event-shop-link-arrow" aria-hidden="true">▶</span>
        </Link>
      )}

      <section className="card decorated-card">
        <div className="shop-tab-row">
          <button className={`quest-btn shop-tab-button ${activeCurrencyTab === "free" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-primary"}`} onClick={() => setActiveCurrencyTab("free")}>フリーコイン</button>
          <button className={`quest-btn shop-tab-button ${activeCurrencyTab === "paid" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`} onClick={() => setActiveCurrencyTab("paid")}>モンタコイン</button>
        </div>
      </section>

      {activeCurrencyTab === "free" ? (
        <>
          <section className="card decorated-card">
            <div className="shop-tab-row shop-subtab-row shop-subtab-row-wide">
              <button className={`quest-btn shop-tab-button ${activeFreeCategoryTab === "background" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`} onClick={() => setActiveFreeCategoryTab("background")}>背景</button>
              <button className={`quest-btn shop-tab-button ${activeFreeCategoryTab === "frame" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`} onClick={() => setActiveFreeCategoryTab("frame")}>フレーム</button>
              <button className={`quest-btn shop-tab-button ${activeFreeCategoryTab === "item" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`} onClick={() => setActiveFreeCategoryTab("item")}>アイテム</button>
              <button className={`quest-btn shop-tab-button ${activeFreeCategoryTab === "deco" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-secondary"}`} onClick={() => setActiveFreeCategoryTab("deco")}>デコ</button>
            </div>
          </section>
          <section className="shop-grid">{freeCards}</section>
        </>
      ) : (
        <>
          <section className="card decorated-card">
            <div className="shop-paid-intro">
              <p className="shop-note shop-note-strong">
                {isNativeApp && nativePlatform === "ios"
                  ? "モンタコインは、Appleのアプリ内課金で購入できます。所持しているモンタコインは、背景やフレーム、アイテム、セット商品に使えます。"
                  : isNativeApp && nativePlatform === "android"
                    ? "モンタコインは、Google Playのアプリ内課金で購入できます。所持しているモンタコインは、背景やフレーム、アイテム、セット商品に使えます。"
                  : isNativeApp
                    ? `${nativePlatformLabel}版のモンタコイン購入は準備中です。所持しているモンタコインは、背景やフレーム、アイテム、セット商品に使えます。`
                  : "モンタコインは、Stripe で購入できる有料コインです。チャージしたあと、背景やフレーム、アイテム、セット商品に使えます。"}
              </p>
              {!user ? (
                <>
                  <p className="shop-note">モンタコインを購入するにはログインが必要です。設定画面からログインすると、そのまま購入できます。</p>
                  <div className="notification-card-actions">
                    <Link href="/settings" className="ui-link-button settings-menu-button settings-menu-button-primary">設定でログインする</Link>
                  </div>
                </>
              ) : null}
              <p className="shop-note">
                決済完了後、モンタコインは自動反映されます。少し待ってから表示をご確認ください。
              </p>
            </div>
          </section>

          <section className="card decorated-card">
            <div className="shop-tab-row shop-subtab-row shop-paid-subtab-row">
              <button className={`quest-btn shop-tab-button ${activePaidCategoryTab === "coin" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`} onClick={() => setActivePaidCategoryTab("coin")}>コイン</button>
              <button className={`quest-btn shop-tab-button ${activePaidCategoryTab === "background" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`} onClick={() => setActivePaidCategoryTab("background")}>背景</button>
              <button className={`quest-btn shop-tab-button ${activePaidCategoryTab === "frame" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`} onClick={() => setActivePaidCategoryTab("frame")}>フレーム</button>
              <button className={`quest-btn shop-tab-button ${activePaidCategoryTab === "deco" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`} onClick={() => setActivePaidCategoryTab("deco")}>デコ</button>
              <button className={`quest-btn shop-tab-button ${activePaidCategoryTab === "item" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`} onClick={() => setActivePaidCategoryTab("item")}>アイテム</button>
              <button className={`quest-btn shop-tab-button ${activePaidCategoryTab === "set" ? "task-global-menu-button-current task-global-menu-button-active" : "task-global-menu-button-accent"}`} onClick={() => setActivePaidCategoryTab("set")}>セット</button>
            </div>
          </section>

          <section className="shop-grid">{paidCards}</section>

          <section className="card decorated-card">
            <div className="shop-support-links">
              <Link href="/purchase-history" className="ui-link-button ui-link-secondary">購入履歴</Link>
              <Link href="/commerce" className="ui-link-button ui-link-secondary">特定商取引法に基づく表記</Link>
              <Link href="/contact" className="ui-link-button ui-link-secondary">お問い合わせ</Link>
            </div>
          </section>
        </>
      )}

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
