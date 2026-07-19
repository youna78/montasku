import type { CharmAttribute } from "@/types/game";
import { SHOP_MASTER_BY_ID } from "./shopMaster.generated";

export type ShopBackgroundItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  imagePath: string;
  availability?: "always" | "event_limited";
};

export type ShopFrameItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  previewClassName: string;
  imagePath?: string;
  availability?: "always" | "event_limited";
};

export type ShopAttributeCharmItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  attribute: CharmAttribute;
  uses: number;
  iconPath: string;
  currencyType: "free_coin" | "paid_coin";
  variant: "free" | "paid";
};

export type ShopPaidCoinItem = {
  itemId: string;
  title: string;
  description: string;
  priceJpy: number;
  appStoreProductId?: string;
  googlePlayProductId?: string;
  paidCoinsGranted: number;
  bonusPaidCoins: number;
  totalPaidCoins: number;
  paymentLinkUrl: string;
  paymentLinkId: string;
  status: "confirmed" | "draft";
  productType: "coin_pack" | "bundle";
  imagePath: string;
  grantedItemIds?: string[];
  grantedBoosterItemIds?: string[];
  grantedEventEggEventId?: string | null;
};

export type ShopBoosterItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  currencyType: "free_coin" | "paid_coin";
  boostRate: number;
  durationMinutes: number;
  iconPath?: string;
};

export type ShopPaidBackgroundItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  currencyType: "paid_coin";
  imagePath: string;
};

export type ShopPaidFrameItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  currencyType: "paid_coin";
  previewClassName: string;
  imagePath?: string;
};

export type ShopPaidBundleItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  currencyType: "paid_coin";
  imagePath: string;
  bundleType: "spring_starter" | "spring_deco";
};

export type ShopDecorationItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  currencyType: "paid_coin";
  imagePath: string;
  previewClassName?: string;
  availability?: "always" | "event_limited";
};

export type ShopComingSoonItem = {
  itemId: string;
  title: string;
  description: string;
  price: number;
  currencyType: "paid_coin";
  category: "background" | "frame" | "decoration" | "booster" | "bundle";
  imagePath?: string;
};

const SHOP_MASTER_ID_ALIASES: Record<string, string> = {
  power_charm: "power_charm_01",
  heal_charm: "heal_charm_01",
  knowledge_charm: "knowledge_charm_01",
  create_charm: "create_charm_01",
  starter_bundle_boost_01: "paid_bundle_spring_starter_01"
};

function getShopMasterRow(itemId: string) {
  return SHOP_MASTER_BY_ID[SHOP_MASTER_ID_ALIASES[itemId] ?? itemId] ?? null;
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveAssetPath(candidate: string | undefined, fallback: string | undefined): string | undefined {
  const normalized = candidate?.trim();
  if (normalized && normalized.startsWith("/")) {
    return normalized;
  }
  return fallback;
}

function applyBackgroundMaster<T extends ShopBackgroundItem | ShopPaidBackgroundItem>(item: T): T {
  const row = getShopMasterRow(item.itemId);
  if (!row) return item;
  const price = row.currency_type === "free_coin" ? toNumber(row.price_free_coins, item.price) : toNumber(row.price_monta_coins, item.price);
  return {
    ...item,
    title: row.display_name || item.title,
    description: row.short_description || item.description,
    price,
    imagePath: resolveAssetPath(row.current_path, item.imagePath) ?? item.imagePath
  };
}

function applyFrameMaster<T extends ShopFrameItem | ShopPaidFrameItem>(item: T): T {
  const row = getShopMasterRow(item.itemId);
  if (!row) return item;
  const price = row.currency_type === "free_coin" ? toNumber(row.price_free_coins, item.price) : toNumber(row.price_monta_coins, item.price);
  return {
    ...item,
    title: row.display_name || item.title,
    description: row.short_description || item.description,
    price,
    imagePath: resolveAssetPath(row.current_path, item.imagePath)
  };
}

function applyCharmMaster(item: ShopAttributeCharmItem): ShopAttributeCharmItem {
  const row = getShopMasterRow(item.itemId);
  if (!row) return item;
  const uses = Number((row.grant_value.split(":")[1] ?? "").trim());
  const price = item.currencyType === "free_coin" ? toNumber(row.price_free_coins, item.price) : toNumber(row.price_monta_coins, item.price);
  return {
    ...item,
    title: row.display_name || item.title,
    description: row.short_description || item.description,
    price,
    uses: Number.isFinite(uses) && uses > 0 ? uses : item.uses,
    iconPath: resolveAssetPath(row.current_path, item.iconPath) ?? item.iconPath
  };
}

function applyBoosterMaster(item: ShopBoosterItem): ShopBoosterItem {
  const row = getShopMasterRow(item.itemId);
  if (!row) return item;
  const price = item.currencyType === "free_coin" ? toNumber(row.price_free_coins, item.price) : toNumber(row.price_monta_coins, item.price);
  return {
    ...item,
    title: row.display_name || item.title,
    description: row.short_description || item.description,
    price,
    iconPath: resolveAssetPath(row.current_path, item.iconPath) ?? item.iconPath
  };
}

function applyPaidCoinMaster(item: ShopPaidCoinItem): ShopPaidCoinItem {
  const row = getShopMasterRow(item.itemId);
  if (!row) return item;
  const paidCoins = Number((row.grant_value.match(/paid_coin:(\d+)/)?.[1] ?? row.grant_value).trim());
  return {
    ...item,
    title: row.display_name || item.title,
    description: row.short_description || item.description,
    priceJpy: toNumber(row.price_monta_coins, item.priceJpy),
    paidCoinsGranted: Number.isFinite(paidCoins) ? paidCoins : item.paidCoinsGranted,
    totalPaidCoins: Number.isFinite(paidCoins) ? paidCoins : item.totalPaidCoins,
    imagePath: resolveAssetPath(row.current_path, item.imagePath) ?? item.imagePath
  };
}

function applyDecorationMaster(item: ShopDecorationItem): ShopDecorationItem {
  const row = getShopMasterRow(item.itemId);
  if (!row) return item;
  return {
    ...item,
    title: row.display_name || item.title,
    description: row.short_description || item.description,
    price: toNumber(row.price_monta_coins, item.price),
    imagePath: resolveAssetPath(row.current_path, item.imagePath) ?? item.imagePath
  };
}

function applyBundleMaster(item: ShopPaidBundleItem): ShopPaidBundleItem {
  const row = getShopMasterRow(item.itemId);
  if (!row) return item;
  return {
    ...item,
    title: row.display_name || item.title,
    description: row.short_description || item.description,
    price: item.currencyType === "paid_coin" ? toNumber(row.price_monta_coins, item.price) : item.price,
    imagePath: resolveAssetPath(row.current_path, item.imagePath) ?? item.imagePath
  };
}

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
    price: 500,
    imagePath: "/img/background/bg_home_night_01.png"
  },
  {
    itemId: "main_field",
    title: "冒険のフィールド",
    description: "少し広い世界を感じられるホーム背景です。",
    price: 500,
    imagePath: "/img/background/bg_main_field_01.png"
  },
  {
    itemId: "paid_bg_library_magic_01",
    title: "まほう書庫の背景",
    description: "図鑑好き向けの静かな魔法書庫背景です。",
    price: 500,
    imagePath: "/img/background/bg_library_magic_01.png"
  },
  {
    itemId: "spring_stream",
    title: "せせらぎの春小道",
    description: "小川と花びらが流れる春イベントの背景です。",
    price: 0,
    imagePath: "/img/background/bg_spring_stream_01.png",
    availability: "event_limited"
  },
  {
    itemId: "spring_meadow",
    title: "春風の花畑",
    description: "桜と若草がゆれる春イベントの背景です。",
    price: 0,
    imagePath: "/img/background/bg_spring_meadow_01.png",
    availability: "event_limited"
  },
  {
    itemId: "june_shrine_meadow",
    title: "雨宿り神社",
    description: "梅雨の時期の神社イベント限定の背景です。",
    price: 0,
    imagePath: "/img/background/bg_june_shrine_01.png",
    availability: "event_limited"
  },
  {
    itemId: "june_shrine_night",
    title: "夜の雨宿り神社",
    description: "雨の夜に灯りがともる神社イベント限定の背景です。",
    price: 0,
    imagePath: "/img/background/bg_june_shrine_night_01.png",
    availability: "event_limited"
  },
  {
    itemId: "july_summertime_beach",
    title: "真夏のモンタスク海岸",
    description: "海開きの空気を感じる7月イベント限定の背景です。",
    price: 0,
    imagePath: "/img/background/bg_july_summertime_beach_01.png",
    availability: "event_limited"
  },
  {
    itemId: "july_summertime_beach_night",
    title: "夜のモンタスク海岸",
    description: "夏の夜風と月明かりを感じる7月イベント限定背景です。",
    price: 0,
    imagePath: "/img/background/bg_july_summertime_beach_night_01.png",
    availability: "event_limited"
  },
  {
    itemId: "august_natsumatsuri_bonodori",
    title: "盆踊り会場",
    description: "お昼の明るい盆踊りステージでお祭りを楽しめる背景です。",
    price: 0,
    imagePath: "/img/background/bg_august_bonodori_01.png",
    availability: "event_limited"
  },
  {
    itemId: "august_natsumatsuri_bg_night",
    title: "夜の夏まつり屋台",
    description: "夜の夏祭りの屋台風景で素敵な時間を過ごせる背景です。",
    price: 0,
    imagePath: "/img/background/bg_august_natsumatsuri_night_01.png",
    availability: "event_limited"
  }
].map((item) => applyBackgroundMaster(item as ShopBackgroundItem));

export const SHOP_FRAMES: ShopFrameItem[] = [
  {
    itemId: "classic_gold",
    title: "クラシックフレーム",
    description: "いまの雰囲気をそのまま楽しめる基本フレームです。",
    price: 0,
    previewClassName: "frame-preview-gold",
    imagePath: "/img/deco_frame/frame_classic_gold_01_aligned_01.png"
  },
  {
    itemId: "sky_crystal",
    title: "スカイクリスタル",
    description: "青みのある光で、すっきりした印象に変わるフレームです。",
    price: 300,
    previewClassName: "frame-preview-sky",
    imagePath: "/img/deco_frame/frame_sky_crystal_01_aligned_01.png"
  },
  {
    itemId: "rose_charm",
    title: "ローズチャーム",
    description: "やさしいピンク系で、少し華やかな雰囲気になるフレームです。",
    price: 300,
    previewClassName: "frame-preview-rose",
    imagePath: "/img/deco_frame/frame_rose_charm_01_aligned_01.png"
  },
  {
    itemId: "spring_clover",
    title: "クローバーフレーム",
    description: "若草色のやさしい春イベントフレームです。",
    price: 0,
    previewClassName: "frame-preview-clover",
    imagePath: "/img/deco_frame/frame_clover_01_aligned_01.png",
    availability: "event_limited"
  },
  {
    itemId: "spring_sakura",
    title: "さくらフレーム",
    description: "淡い花びらをあしらった春イベントフレームです。",
    price: 0,
    previewClassName: "frame-preview-sakura",
    imagePath: "/img/deco_frame/frame_sakura_01_aligned_01.png",
    availability: "event_limited"
  },
  {
    itemId: "spring_rain",
    title: "梅雨フレーム",
    description: "雨粒と神社飾りをあしらった梅雨イベントフレームです。",
    price: 0,
    previewClassName: "frame-preview-june-rain",
    imagePath: "/img/deco_frame/frame_june_rain_01_aligned_01.png",
    availability: "event_limited"
  },
  {
    itemId: "june_shrine_azisai",
    title: "あじさいフレーム",
    description: "あじさいと雨粒をあしらった梅雨イベントフレームです。",
    price: 0,
    previewClassName: "frame-preview-june-azisai",
    imagePath: "/img/deco_frame/frame_june_azisai_01_aligned_01.png",
    availability: "event_limited"
  },
  {
    itemId: "july_shell",
    title: "貝殻フレーム",
    description: "貝殻と海辺のきらめきをあしらった7月イベントフレームです。",
    price: 0,
    previewClassName: "frame-preview-july-shell",
    imagePath: "/img/deco_frame/frame_july_shell_01_aligned_01.png",
    availability: "event_limited"
  },
  {
    itemId: "july_hibiscus",
    title: "ハイビスカスフレーム",
    description: "ハイビスカスの花をあしらった7月イベントフレームです。",
    price: 0,
    previewClassName: "frame-preview-july-hibiscus",
    imagePath: "/img/deco_frame/frame_july_hibiscus_01_aligned_01.png",
    availability: "event_limited"
  },
  {
    itemId: "august_yatai_frame",
    title: "屋台フレーム",
    description: "金魚すくいやヨーヨー、かき氷が入った夏まつりフレームです。",
    price: 0,
    previewClassName: "frame-preview-august-yatai",
    imagePath: "/img/deco_frame/frame_august_yatai_01_aligned_01.png",
    availability: "event_limited"
  },
  {
    itemId: "august_morningglory",
    title: "あさがおフレーム",
    description: "朝顔をあしらった8月イベントのログイン報酬フレームです。",
    price: 0,
    previewClassName: "frame-preview-august-morningglory",
    imagePath: "/img/deco_frame/frame_august_morningglory_01_aligned_01.png",
    availability: "event_limited"
  }
].map((item) => applyFrameMaster(item as ShopFrameItem));

export const SHOP_ATTRIBUTE_CHARMS: ShopAttributeCharmItem[] = [
  {
    itemId: "power_charm",
    title: "ちからのおまもり",
    description: "次の3タスクは Power だけが伸びるおまもりです。",
    price: 300,
    attribute: "power",
    uses: 3,
    iconPath: "/img/item/charm/icon_charm_power_free_01.png",
    currencyType: "free_coin",
    variant: "free"
  },
  {
    itemId: "heal_charm",
    title: "いやしのおまもり",
    description: "次の3タスクは Heal だけが伸びるおまもりです。",
    price: 300,
    attribute: "heal",
    uses: 3,
    iconPath: "/img/item/charm/icon_charm_heal_free_01.png",
    currencyType: "free_coin",
    variant: "free"
  },
  {
    itemId: "knowledge_charm",
    title: "ちえのおまもり",
    description: "次の3タスクは Knowledge だけが伸びるおまもりです。",
    price: 300,
    attribute: "knowledge",
    uses: 3,
    iconPath: "/img/item/charm/icon_charm_knowledge_free_01.png",
    currencyType: "free_coin",
    variant: "free"
  },
  {
    itemId: "create_charm",
    title: "ひらめきのおまもり",
    description: "次の3タスクは Create だけが伸びるおまもりです。",
    price: 300,
    attribute: "create",
    uses: 3,
    iconPath: "/img/item/charm/icon_charm_create_free_01.png",
    currencyType: "free_coin",
    variant: "free"
  }
].map((item) => applyCharmMaster(item as ShopAttributeCharmItem));

export const SHOP_PAID_ATTRIBUTE_CHARMS: ShopAttributeCharmItem[] = [
  {
    itemId: "paid_charm_power_01",
    title: "ちからのおまもり+",
    description: "次の10タスクは Power だけが伸びる、モンタコイン用の特別なおまもりです。",
    price: 300,
    attribute: "power",
    uses: 10,
    iconPath: "/img/item/charm/icon_charm_power_01.png",
    currencyType: "paid_coin",
    variant: "paid"
  },
  {
    itemId: "paid_charm_heal_01",
    title: "いやしのおまもり+",
    description: "次の10タスクは Heal だけが伸びる、モンタコイン用の特別なおまもりです。",
    price: 300,
    attribute: "heal",
    uses: 10,
    iconPath: "/img/item/charm/icon_charm_heal_01.png",
    currencyType: "paid_coin",
    variant: "paid"
  },
  {
    itemId: "paid_charm_knowledge_01",
    title: "ちえのおまもり+",
    description: "次の10タスクは Knowledge だけが伸びる、モンタコイン用の特別なおまもりです。",
    price: 300,
    attribute: "knowledge",
    uses: 10,
    iconPath: "/img/item/charm/icon_charm_knowledge_01.png",
    currencyType: "paid_coin",
    variant: "paid"
  },
  {
    itemId: "paid_charm_create_01",
    title: "ひらめきのおまもり+",
    description: "次の10タスクは Create だけが伸びる、モンタコイン用の特別なおまもりです。",
    price: 300,
    attribute: "create",
    uses: 10,
    iconPath: "/img/item/charm/icon_charm_create_01.png",
    currencyType: "paid_coin",
    variant: "paid"
  }
].map((item) => applyCharmMaster(item as ShopAttributeCharmItem));

export const SHOP_PAID_COIN_ITEMS: ShopPaidCoinItem[] = [
  {
    itemId: "paid_coin_pack_small",
    title: "モンタコイン 120枚",
    description: "まず試しやすい、いちばん小さなモンタコインパックです。",
    priceJpy: 100,
    appStoreProductId: "montasku_coin_120",
    googlePlayProductId: "montaskucoin120",
    paidCoinsGranted: 100,
    bonusPaidCoins: 20,
    totalPaidCoins: 120,
    paymentLinkUrl: "https://buy.stripe.com/test_28E6oG5Y65jz7XndbP7Zu00",
    paymentLinkId: "plink_1TGE57B1dcN8XHrWZ8PuBb7i",
    status: "confirmed",
    productType: "coin_pack",
    imagePath: "/img/icon/icon_paid_coin_pack_01.png"
  },
  {
    itemId: "paid_coin_pack_medium",
    title: "モンタコイン 380枚",
    description: "少しお得に買える、定番のモンタコインパックです。",
    priceJpy: 300,
    appStoreProductId: "montasku_coin_380",
    googlePlayProductId: "montaskucoin380",
    paidCoinsGranted: 300,
    bonusPaidCoins: 80,
    totalPaidCoins: 380,
    paymentLinkUrl: "https://buy.stripe.com/test_eVqaEW9aieU9cdDc7L7Zu01",
    paymentLinkId: "plink_1TGE8GB1dcN8XHrW2fO8r1PN",
    status: "confirmed",
    productType: "coin_pack",
    imagePath: "/img/icon/icon_paid_coin_pack_01.png"
  },
  {
    itemId: "paid_coin_pack_large",
    title: "モンタコイン 700枚",
    description: "継続して遊ぶ人向けの、少し大きめなモンタコインパックです。",
    priceJpy: 600,
    appStoreProductId: "montasku_coin_700",
    googlePlayProductId: "montaskucoin700",
    paidCoinsGranted: 600,
    bonusPaidCoins: 100,
    totalPaidCoins: 700,
    paymentLinkUrl: "https://buy.stripe.com/test_dRmdR89aieU991r4Fj7Zu02",
    paymentLinkId: "plink_1TGE9AB1dcN8XHrWjGjcY4yn",
    status: "confirmed",
    productType: "coin_pack",
    imagePath: "/img/icon/icon_paid_coin_pack_01.png"
  },
  {
    itemId: "paid_coin_pack_xlarge",
    title: "モンタコイン 1600枚",
    description: "イベント時やまとめ買い向けの、大きなモンタコインパックです。",
    priceJpy: 1000,
    appStoreProductId: "montasku_coin_1600",
    googlePlayProductId: "montaskucoin1600",
    paidCoinsGranted: 1000,
    bonusPaidCoins: 600,
    totalPaidCoins: 1600,
    paymentLinkUrl: "https://buy.stripe.com/test_cNi6oG5Y6bHX4Lb1t77Zu03",
    paymentLinkId: "plink_1TGE9wB1dcN8XHrWT0uFL5bW",
    status: "confirmed",
    productType: "coin_pack",
    imagePath: "/img/icon/icon_paid_coin_pack_01.png"
  },
  {
    itemId: "starter_bundle_boost_01",
    title: "春イベントスターターセット",
    description: "500モンタコインと 春の芽吹きたまご、EXPブースト 24時間 がついてくる限定セットです。",
    priceJpy: 500,
    paidCoinsGranted: 500,
    bonusPaidCoins: 0,
    totalPaidCoins: 500,
    paymentLinkUrl: "https://buy.stripe.com/test_8x2cN4fyG9zP4Lb8Vz7Zu04",
    paymentLinkId: "plink_1TGEAnB1dcN8XHrW15jTJho2",
    status: "confirmed",
    productType: "bundle",
    imagePath: "/img/icon/icon_bundle_spring_starter_01.png",
    grantedBoosterItemIds: ["paid_boost_exp_20_24h_01"],
    grantedEventEggEventId: "spring_easter_2026"
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
    productType: "bundle",
    imagePath: "/img/icon/icon_bundle_spring_starter_01.png"
  }
].map((item) => applyPaidCoinMaster(item as ShopPaidCoinItem));

export const SHOP_BOOSTER_ITEMS: ShopBoosterItem[] = [
  {
    itemId: "paid_boost_exp_20_1h_01",
    title: "EXPブースト 1時間",
    description: "1時間だけ獲得EXPが20%アップします。",
    price: 100,
    currencyType: "free_coin",
    boostRate: 0.2,
    durationMinutes: 60,
    iconPath: "/img/icon/icon_boost_exp_20_01.png"
  },
  {
    itemId: "paid_boost_exp_20_3h_01",
    title: "EXPブースト 3時間",
    description: "3時間だけ獲得EXPが20%アップします。",
    price: 300,
    currencyType: "free_coin",
    boostRate: 0.2,
    durationMinutes: 180,
    iconPath: "/img/icon/icon_boost_exp_20_03.png"
  },
  {
    itemId: "paid_boost_exp_20_24h_01",
    title: "EXPブースト 24時間",
    description: "24時間だけ獲得EXPが20%アップします。",
    price: 100,
    currencyType: "paid_coin",
    boostRate: 0.2,
    durationMinutes: 24 * 60,
    iconPath: "/img/icon/icon_boost_exp_20_1day.png"
  },
  {
    itemId: "paid_boost_exp_20_72h_01",
    title: "EXPブースト 72時間",
    description: "72時間だけ獲得EXPが20%アップします。",
    price: 300,
    currencyType: "paid_coin",
    boostRate: 0.2,
    durationMinutes: 72 * 60,
    iconPath: "/img/icon/icon_boost_exp_20_3day.png"
  }
].map((item) => applyBoosterMaster(item as ShopBoosterItem));

export const SHOP_PAID_BACKGROUNDS: ShopPaidBackgroundItem[] = [];

export const SHOP_PAID_FRAMES: ShopPaidFrameItem[] = [
  {
    itemId: "paid_frame_starlight_01",
    title: "星灯りフレーム",
    description: "星と青い光をまとった通年販売フレームです。",
    price: 400,
    currencyType: "paid_coin",
    previewClassName: "frame-preview-starlight",
    imagePath: "/img/deco_frame/frame_starlight_01_aligned_01.png"
  }
].map((item) => applyFrameMaster(item as ShopPaidFrameItem));

export const SHOP_PAID_BUNDLES: ShopPaidBundleItem[] = [
  {
    itemId: "paid_bundle_spring_deco_01",
    title: "春のかざりセット",
    description: "ピクニックバスケットと花灯りランタン、春の芽吹きたまごが入った春イベント向けセットです。",
    price: 500,
    currencyType: "paid_coin",
    imagePath: "/img/icon/icon_bundle_spring_deco_01.png",
    bundleType: "spring_deco"
  }
].map((item) => applyBundleMaster(item as ShopPaidBundleItem));

export const SHOP_DECORATIONS: ShopDecorationItem[] = [
  {
    itemId: "paid_deco_sakura_petals_01",
    title: "花びらのかざり",
    description: "ホームにふわっと春感を足す花びらデコです。",
    price: 500,
    currencyType: "paid_coin",
    imagePath: "/img/decoration/deco_sakura_petals_01.png",
    availability: "event_limited"
  },
  {
    itemId: "paid_deco_picnic_basket_01",
    title: "ピクニックバスケット",
    description: "モンスターのそばに置ける春の小物デコです。",
    price: 600,
    currencyType: "paid_coin",
    imagePath: "/img/decoration/deco_picnic_basket_01.png",
    availability: "event_limited"
  },
  {
    itemId: "paid_deco_flower_lantern_01",
    title: "花灯りランタン",
    description: "夜背景にも合う花模様のランタンデコです。",
    price: 500,
    currencyType: "paid_coin",
    imagePath: "/img/decoration/deco_flower_lantern_01.png",
    availability: "event_limited"
  }
].map((item) => applyDecorationMaster(item as ShopDecorationItem));

export const SHOP_EVERGREEN_BACKGROUNDS = SHOP_BACKGROUNDS.filter((item) => item.availability !== "event_limited");
export const SHOP_EVENT_BACKGROUNDS = SHOP_BACKGROUNDS.filter((item) => item.availability === "event_limited");
export const SHOP_EVERGREEN_FRAMES = SHOP_FRAMES.filter((item) => item.availability !== "event_limited");
export const SHOP_EVENT_FRAMES = SHOP_FRAMES.filter((item) => item.availability === "event_limited");
export const SHOP_EVERGREEN_DECORATIONS = SHOP_DECORATIONS.filter((item) => item.availability !== "event_limited");
export const SHOP_EVENT_DECORATIONS = SHOP_DECORATIONS.filter((item) => item.availability === "event_limited");
export const SHOP_EVENT_BUNDLES = SHOP_PAID_BUNDLES.filter((item) => item.bundleType === "spring_deco");
export const SHOP_EVERGREEN_BUNDLES = SHOP_PAID_BUNDLES.filter((item) => !SHOP_EVENT_BUNDLES.some((bundle) => bundle.itemId === item.itemId));
export const SHOP_COMING_SOON_ITEMS: ShopComingSoonItem[] = [];

export function getPaidCoinShopItem(itemId: string): ShopPaidCoinItem | null {
  return SHOP_PAID_COIN_ITEMS.find((item) => item.itemId === itemId && item.status === "confirmed") ?? null;
}

export function getPaidCoinShopItemByAppStoreProductId(appStoreProductId: string): ShopPaidCoinItem | null {
  return SHOP_PAID_COIN_ITEMS.find(
    (item) => item.appStoreProductId === appStoreProductId && item.status === "confirmed"
  ) ?? null;
}

export function getPaidCoinShopItemByGooglePlayProductId(googlePlayProductId: string): ShopPaidCoinItem | null {
  return SHOP_PAID_COIN_ITEMS.find(
    (item) => item.googlePlayProductId === googlePlayProductId && item.status === "confirmed"
  ) ?? null;
}

export function getBackgroundShopItem(backgroundId: string): ShopBackgroundItem | null {
  return SHOP_BACKGROUNDS.find((item) => item.itemId === backgroundId) ?? null;
}

export function getFrameShopItem(frameId: string): ShopFrameItem | null {
  return SHOP_FRAMES.find((item) => item.itemId === frameId) ?? null;
}

export function getFramePreviewImagePath(frameId: string): string | null {
  return SHOP_FRAMES.find((item) => item.itemId === frameId)?.imagePath
    ?? SHOP_PAID_FRAMES.find((item) => item.itemId === frameId)?.imagePath
    ?? null;
}

export function getAttributeCharmItem(itemId: string): ShopAttributeCharmItem | null {
  return [...SHOP_ATTRIBUTE_CHARMS, ...SHOP_PAID_ATTRIBUTE_CHARMS].find((item) => item.itemId === itemId) ?? null;
}

export function getBoosterShopItem(itemId: string): ShopBoosterItem | null {
  return SHOP_BOOSTER_ITEMS.find((item) => item.itemId === itemId) ?? null;
}

export function getPaidBackgroundShopItem(itemId: string): ShopPaidBackgroundItem | null {
  return SHOP_PAID_BACKGROUNDS.find((item) => item.itemId === itemId) ?? null;
}

export function getPaidFrameShopItem(itemId: string): ShopPaidFrameItem | null {
  return SHOP_PAID_FRAMES.find((item) => item.itemId === itemId) ?? null;
}

export function getPaidBundleShopItem(itemId: string): ShopPaidBundleItem | null {
  return SHOP_PAID_BUNDLES.find((item) => item.itemId === itemId) ?? null;
}

export function getDecorationShopItem(itemId: string): ShopDecorationItem | null {
  return SHOP_DECORATIONS.find((item) => item.itemId === itemId) ?? null;
}

export function getBackgroundImagePath(backgroundId: string): string {
  return SHOP_BACKGROUNDS.find((item) => item.itemId === backgroundId)?.imagePath
    ?? SHOP_PAID_BACKGROUNDS.find((item) => item.itemId === backgroundId)?.imagePath
    ?? SHOP_BACKGROUNDS[0].imagePath;
}

export function getFrameThemeClass(frameId: string): string {
  switch (frameId) {
    case "sky_crystal":
      return "theme-frame-sky";
    case "rose_charm":
      return "theme-frame-rose";
    case "spring_clover":
      return "theme-frame-clover";
    case "spring_sakura":
      return "theme-frame-sakura";
    case "spring_rain":
      return "theme-frame-june-rain";
    case "june_shrine_azisai":
      return "theme-frame-june-azisai";
    case "july_shell":
      return "theme-frame-july-shell";
    case "july_hibiscus":
      return "theme-frame-july-hibiscus";
    case "august_yatai_frame":
      return "theme-frame-august-yatai";
    case "august_morningglory":
      return "theme-frame-august-morningglory";
    case "paid_frame_starlight_01":
      return "theme-frame-starlight";
    case "classic_gold":
      return "theme-frame-gold";
    default:
      return "";
  }
}
