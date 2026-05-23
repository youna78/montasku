"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { playSfx } from "@/lib/game/sfx";
import { getTaskLimitInfo, shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";
import type { TaskMaster } from "@/types/master";

export default function TaskReorderPage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, moveTask } = useGame();
  const [message, setMessage] = useState("");

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

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  const limits = getTaskLimitInfo(gameState);
  const activeTasks = gameState.activeTasks
    .filter((t) => t.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((active) => tasks.find((task) => task.taskId === active.taskId))
    .filter((task): task is TaskMaster => Boolean(task));
  const currentMonster = monsters.find((monster) => monster.monsterId === gameState.currentMonsterId);

  const onMove = (taskId: number, direction: "up" | "down") => {
    const result = moveTask(taskId, direction);
    if (!result) {
      setMessage("並び替えに失敗しました");
      return;
    }
    if (result.moved) {
      playSfx("irekae");
      setMessage("並び順を更新しました");
      return;
    }
    if (result.reason === "boundary") {
      setMessage("これ以上移動できません");
      return;
    }
    setMessage("タスクが見つかりません");
  };

  return (
    <main
      className={`page-shell page-rpg page-tasks page-task-reorder ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">タスク並び替え</div>

      <section className="card decorated-card screen-summary-card task-reorder-summary-card">
        <img src={getMonsterImage(currentMonster?.monsterId)} alt="" className="screen-summary-monster" />
        <div className="screen-summary-copy">
          <strong>クエストの順番を変える</strong>
          <span>よく使うタスクを上にして、毎日の確認をしやすくできます。</span>
          <div className="task-progress-strip">
            <span>登録 {limits.current}/{limits.max}</span>
            <span>上下で移動</span>
          </div>
        </div>
      </section>

      <section className="card decorated-card">
        <div className="task-global-menu">
          <Link href="/task-add" className="ui-link-button task-global-menu-button task-global-menu-button-primary">
            追加
          </Link>
          <Link href="/task-remove" className="ui-link-button task-global-menu-button task-global-menu-button-secondary">
            削除
          </Link>
          <span
            className="ui-link-button task-global-menu-button task-global-menu-button-accent task-global-menu-button-active task-global-menu-button-current"
            aria-current="page"
          >
            並び替え
          </span>
        </div>
      </section>

      <section className="card decorated-card task-reorder-guide-card">
        <h2 className="screen-section-title">並び替えルール</h2>
        <p>上へ・下へボタンで、ホームやタスク画面に表示される順番を変更できます。</p>
        <div className="settings-links rpg-link-grid">
          <Link href="/task-settings" className="ui-link-button quest-btn quest-btn-secondary">
            タスク設定へ戻る
          </Link>
        </div>
      </section>

      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card task-board-card task-reorder-board-card">
        <h2 className="screen-section-title">並び替え対象クエスト</h2>
        <ul className="quest-list">
          {activeTasks.map((task, index) => (
            <li className="quest-item task-row-rpg task-reorder-row" key={task.taskId}>
              <div className="task-row-main">
                <img src="/img/icon/sfc/sfc_task_01.png" alt="" className="quest-icon quest-icon-large" />
                <div>
                  <div className="task-row-title">
                    {index + 1}. {task.name}
                  </div>
                  <small className="task-meta">
                    <span className="task-reward-line">
                      <span className="task-reward-chip">{task.category}</span>
                      <span className="task-reward-chip">EXP +{task.baseExp}</span>
                    </span>
                  </small>
                </div>
              </div>
              <div className="task-reorder-actions">
                <button className="quest-btn quest-btn-primary task-reorder-button" onClick={() => onMove(task.taskId, "up")} disabled={index === 0}>
                  上へ
                </button>
                <button className="quest-btn quest-btn-primary task-reorder-button" onClick={() => onMove(task.taskId, "down")} disabled={index === activeTasks.length - 1}>
                  下へ
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="settings-links rpg-link-grid section-bottom-action">
          <Link href="/task-settings" className="ui-link-button quest-btn quest-btn-secondary">
            タスク設定へ戻る
          </Link>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
