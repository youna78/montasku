/** November ground monsters with legs. The egg deliberately keeps its sway animation. */
export const NOVEMBER_GROUND_WALKS = [
  { id: 108, name: "もみじポン", slug: "108_momiji_pon", gait: "biped", previousSize: 61, previousY: 37 },
  { id: 110, name: "おけネコ", slug: "110_oke_neko", gait: "biped", previousSize: 59, previousY: 37 },
  { id: 112, name: "旅するミニビースト", slug: "112_travel_mini_beast", gait: "quadruped", previousSize: 60, previousY: 37 },
  { id: 113, name: "湯けむりネコ又", slug: "113_yukemuri_nekomata", gait: "biped", previousSize: 142, previousY: 0 },
  { id: 114, name: "紅葉ノ白鹿", slug: "114_momiji_white_deer", gait: "quadruped", previousSize: 142, previousY: 0 },
  { id: 115, name: "秋風タヌキ武者", slug: "115_akikaze_tanuki_musha", gait: "biped", previousSize: 142, previousY: 0 },
  { id: 117, name: "湯守ノ猫神", slug: "117_yumori_neko_gami", gait: "biped", previousSize: 142, previousY: 0 },
  { id: 118, name: "紅葉ノ神鹿", slug: "118_momiji_shinroku", gait: "quadruped", previousSize: 142, previousY: 0 },
  { id: 119, name: "秋嵐ノ化狸王", slug: "119_akiarashi_bakedanuki_oh", gait: "biped", previousSize: 142, previousY: 0 }
] as const;

export function getNovemberGroundWalk(monsterId: number) {
  return NOVEMBER_GROUND_WALKS.find(walk => walk.id === monsterId);
}

export function getNovemberGroundWalkImagePath(slug: string) {
  return `/img/monster/monster_renewal_${slug}_walk_v3_4f.png`;
}
