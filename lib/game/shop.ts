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
