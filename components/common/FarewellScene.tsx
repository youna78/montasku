import { getLetterItemImage, LETTER_ITEM_IMAGES } from "@/lib/game/assets";

export function FarewellScene({ phase, imagePath = LETTER_ITEM_IMAGES[0] }: { phase: "farewell" | "letter"; imagePath?: string }) {
  return <div className={`end-scene phase-${phase}`}>
    <img src="/img/effect/fx_smoke_01.png" alt="" className="end-smoke" />
    <img src={getLetterItemImage(imagePath)} alt="モンスターからの手紙" className="end-letter" />
  </div>;
}
