import type { GameState } from "@/types/game";
import { NOVEMBER_KOYO_ONSEN_EVENT } from "./config";

export const NOVEMBER_LETTER_TEMPLATES = [
  {
    title: "もみじいろの おもいで",
    body: "いっしょに あるいた もみじみち、いまも きらきら おぼえているよ。\nきみが がんばった まいにちは、いちまいずつ たいせつな たからもの。\nつぎの きせつも、きみの ぺーすで すすんでね。",
    imagePath: "/img/letter/letter_november_maple_01.png"
  },
  {
    title: "ゆけむりの おたより",
    body: "あったかい おゆに つかるみたいに、ときどき こころも ひとやすみ。\nきょうまで たくさん がんばった きみを、これからも おうえんしているよ。\nまた いっしょに、すてきな けしきを みにいこう。",
    imagePath: "/img/letter/letter_november_onsen_01.png"
  },
  {
    title: "また たびに でようね",
    body: "バスに のって、もみじを みて、あたたかい ゆげの なかで わらったね。\nきみと すごした あきの たびは、ずっと わすれないよ。\nつぎに あうひまで、げんきでいてね。",
    imagePath: "/img/letter/letter_november_trip_01.png"
  }
] as const;

/** Keep the scene preview and the acquired letter identical across reloads. */
export function getNovemberFarewellTemplate(state: Pick<GameState, "currentMonsterId" | "currentMonsterExp" | "lastPlayedDate">) {
  if (!NOVEMBER_KOYO_ONSEN_EVENT.rewardPreviewMonsterIds.includes(state.currentMonsterId)) return null;
  const key = `${state.currentMonsterId}:${state.lastPlayedDate}:${state.currentMonsterExp}`;
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return NOVEMBER_LETTER_TEMPLATES[hash % NOVEMBER_LETTER_TEMPLATES.length];
}
