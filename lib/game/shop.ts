export type ShopBackgroundItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  imagePath: string;
};

export type ShopFrameItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  previewClassName: string;
};

export type ShopPaidCoinItem = {
  itemId: string;
  title: string;
  description: string;
  priceJpy: number;
  paidCoinsGranted: number;
  bonusPaidCoins: number;
  totalPaidCoins: number;
  paymentLinkUrl: string;
  paymentLinkId: string;
  status: "confirmed" | "draft";
  productType: "coin_pack" | "bundle";
};

export const SHOP_BACKGROUNDS: ShopBackgroundItem[] = [
  {
    itemId: "home_morning",
    title: "はじまりの草原",
    description: "ホームで使える基本背景です。",
    price: 0,
    imagePath: "/img/background/bg_home_morning_01.png"
  },
  {
    itemId: "home_night",
    title: "星夜の草原",
    description: "夜の雰囲気が楽しめるホーム背景です。",
    price: 5,
    imagePath: "/img/background/bg_home_night_01.png"
  },
  {
    itemId: "main_field",
    title: "冒険のフィールド",
    description: "少し広い世界を感じられるホーム背景です。",
    price: 8,
    imagePath: "/img/background/bg_main_field_01.png"
  }
];

export const SHOP_FRAMES: ShopFrameItem[] = [
  {
    itemId: "classic_gold",
    title: "クラシックフレーム",
    description: "いまの雰囲気をそのまま楽しめる基本フレームです。",
    price: 0,
    previewClassName: "frame-preview-gold"
  },
  {
    itemId: "sky_crystal",
    title: "スカイクリスタル",
    description: "青みのある光で、すっきりした印象に変わるフレームです。",
    price: 6,
    previewClassName: "frame-preview-sky"
  },
  {
    itemId: "rose_charm",
    title: "ローズチャーム",
    description: "やさしいピンク系で、少し華やかな雰囲気になるフレームです。",
    price: 9,
    previewClassName: "frame-preview-rose"
  }
];

export const SHOP_PAID_COIN_ITEMS: ShopPaidCoinItem[] = [
  {
    itemId: "paid_coin_pack_small",
    title: "モンタコイン 120枚",
    description: "まず試しやすい、いちばん小さなモンタコインパックです。",
    priceJpy: 100,
    paidCoinsGranted: 100,
    bonusPaidCoins: 20,
    totalPaidCoins: 120,
    paymentLinkUrl: "https://buy.stripe.com/test_28E6oG5Y65jz7XndbP7Zu00",
    paymentLinkId: "plink_1TGE57B1dcN8XHrWZ8PuBb7i",
    status: "confirmed",
    productType: "coin_pack"
  },
  {
    itemId: "paid_coin_pack_medium",
    title: "モンタコイン 380枚",
    description: "少しお得に買える、定番のモンタコインパックです。",
    priceJpy: 300,
    paidCoinsGranted: 300,
    bonusPaidCoins: 80,
    totalPaidCoins: 380,
    paymentLinkUrl: "https://buy.stripe.com/test_eVqaEW9aieU9cdDc7L7Zu01",
    paymentLinkId: "plink_1TGE8GB1dcN8XHrW2fO8r1PN",
    status: "confirmed",
    productType: "coin_pack"
  },
  {
    itemId: "paid_coin_pack_large",
    title: "モンタコイン 700枚",
    description: "継続して遊ぶ人向けの、少し大きめなモンタコインパックです。",
    priceJpy: 600,
    paidCoinsGranted: 600,
    bonusPaidCoins: 100,
    totalPaidCoins: 700,
    paymentLinkUrl: "https://buy.stripe.com/test_dRmdR89aieU991r4Fj7Zu02",
    paymentLinkId: "plink_1TGE9AB1dcN8XHrWjGjcY4yn",
    status: "confirmed",
    productType: "coin_pack"
  },
  {
    itemId: "paid_coin_pack_xlarge",
    title: "モンタコイン 1600枚",
    description: "イベント時やまとめ買い向けの、大きなモンタコインパックです。",
    priceJpy: 1000,
    paidCoinsGranted: 1000,
    bonusPaidCoins: 600,
    totalPaidCoins: 1600,
    paymentLinkUrl: "https://buy.stripe.com/test_cNi6oG5Y6bHX4Lb1t77Zu03",
    paymentLinkId: "plink_1TGE9wB1dcN8XHrWT0uFL5bW",
    status: "confirmed",
    productType: "coin_pack"
  },
  {
    itemId: "starter_bundle_boost_01",
    title: "スターターバンドル（ブースト付き）",
    description: "モンタコイン 700枚分と、初回向けブーストをまとめたバンドルです。",
    priceJpy: 500,
    paidCoinsGranted: 500,
    bonusPaidCoins: 200,
    totalPaidCoins: 700,
    paymentLinkUrl: "https://buy.stripe.com/test_8x2cN4fyG9zP4Lb8Vz7Zu04",
    paymentLinkId: "plink_1TGEAnB1dcN8XHrW15jTJho2",
    status: "confirmed",
    productType: "bundle"
  },
  {
    itemId: "seasonal_bundle_spring_01",
    title: "春イベント応援パック",
    description: "春イベント向けの限定パックです。イベント開始時に有効化します。",
    priceJpy: 500,
    paidCoinsGranted: 500,
    bonusPaidCoins: 140,
    totalPaidCoins: 640,
    paymentLinkUrl: "https://buy.stripe.com/test_aFa00i9aibHXb9z6Nr7Zu05",
    paymentLinkId: "plink_1TGEBrB1dcN8XHrW50Zd5ICM",
    status: "draft",
    productType: "bundle"
  }
];

export function getPaidCoinShopItem(itemId: string): ShopPaidCoinItem | null {
  return SHOP_PAID_COIN_ITEMS.find((item) => item.itemId === itemId && item.status === "confirmed") ?? null;
}

export function getBackgroundImagePath(backgroundId: string): string {
  return SHOP_BACKGROUNDS.find((item) => item.itemId === backgroundId)?.imagePath ?? SHOP_BACKGROUNDS[0].imagePath;
}

export function getFrameThemeClass(frameId: string): string {
  switch (frameId) {
    case "sky_crystal":
      return "theme-frame-sky";
    case "rose_charm":
      return "theme-frame-rose";
    case "classic_gold":
    default:
      return "theme-frame-gold";
  }
}
