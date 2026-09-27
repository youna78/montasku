import type { CSSProperties } from "react";
import { getMonsterImage } from "@/lib/game/assets";

export type TaskGrowthReward = {
  monsterId: number;
  monsterName: string;
  exp: number;
  coins: number;
  level: number;
  levelUp: boolean;
  beforePercent: number;
  current: number;
  required: number;
  birthRemaining: number | null;
};

export function TaskGrowthFeedback({ reward }: { reward: TaskGrowthReward }) {
  const percent = reward.required ? Math.min(100, reward.current / reward.required * 100) : 100;
  return <aside className="task-growth-feedback" role="status" aria-live="polite" aria-atomic="true">
    <img className="task-growth-monster" src={getMonsterImage(reward.monsterId)} alt="" />
    <div className="task-growth-copy">
      <strong>{reward.monsterName}に EXP＋{reward.exp}！</strong>
      <span>コイン＋{reward.coins}{reward.levelUp ? ` · Lv.${reward.level}にアップ！` : ` · Lv.${reward.level}`}</span>
      <div className="task-growth-track" role="progressbar" aria-label="モンスターの成長" aria-valuemin={0} aria-valuemax={reward.required || 1} aria-valuenow={reward.required ? reward.current : 1}>
        <div style={{ width: `${percent}%`, "--growth-before": `${reward.beforePercent}%` } as CSSProperties} />
      </div>
      <b>{reward.birthRemaining !== null ? `あと${reward.birthRemaining}件で誕生！` : reward.required ? `次のレベルまであと${Math.max(0, reward.required - reward.current)}EXP` : "最後の成長段階まで育ちました！"}</b>
    </div>
  </aside>;
}
