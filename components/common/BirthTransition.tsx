import { BirthEventFrame } from "./BirthEventFrame";
import { getMonsterImage } from "@/lib/game/assets";
import { getBirthEggMonster } from "@/lib/game/birthEgg";
import type { MonsterMaster } from "@/types/master";

export function BirthTransition({ currentMonsterId, monsters = [] }: { currentMonsterId?: number; monsters?: MonsterMaster[] }) {
  const egg = getBirthEggMonster(currentMonsterId, monsters);
  return (
    <BirthEventFrame busy>
      <div className="hatch-scene phase-egg">
        {egg && <img src={getMonsterImage(egg.monsterId)} alt={egg.name} className="hatch-egg" />}
      </div>
      <p role="status" className="birth-event-status">{egg ? `${egg.name}が孵化するよ！` : "誕生の準備をしています…"}</p>
      <p className="birth-event-guide" aria-hidden="true" style={{ visibility: "hidden" }}>タスクを達成すると、この子が育つよ。</p>
      <div className="centered-button-wrap">
        <button className="primary ui-image-button" disabled>もうすぐ生まれるよ…</button>
      </div>
    </BirthEventFrame>
  );
}
