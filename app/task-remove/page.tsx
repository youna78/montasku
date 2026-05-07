"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { playSfx } from "@/lib/game/sfx";
import { getTaskLimitInfo, shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";
import type { TaskMaster } from "@/types/master";

export default function TaskRemovePage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, removeTask } = useGame();
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

  const onRemoveTask = (taskId: number) => {
    const result = removeTask(taskId);
    if (!result) {
      setMessage("削除に失敗しました");
      return;
    }
    if (result.removed) {
      playSfx("s_delete");
      setMessage("タスクを削除しました");
      return;
    }
    if (result.reason === "min_reached") {
      setMessage("最低3件は残す必要があります");
      return;
    }
    setMessage("タスクが見つかりません");
  };

  return (
    <main
      className={`page-shell page-rpg ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">タスク削除</div>
      <section className="card decorated-card">
        <div className="task-global-menu">
          <Link href="/task-add" className="ui-link-button task-global-menu-button task-global-menu-button-primary">
            追加
          </Link>
          <span
            className="ui-link-button task-global-menu-button task-global-menu-button-secondary task-global-menu-button-active task-global-menu-button-current"
            aria-current="page"
          >
            削除
          </span>
          <Link href="/task-reorder" className="ui-link-button task-global-menu-button task-global-menu-button-accent">
            並び替え
          </Link>
        </div>
      </section>

      <section className="card decorated-card screen-summary-card">
        <img src="/img/icon/generated_sfc/icon_sfc_treasure_01.png" alt="" className="screen-summary-monster" />
        <div className="screen-summary-copy">
          <strong>クエストを整理</strong>
          <span>今の生活に合わないタスクを外せます。</span>
          <div className="task-progress-strip">
            <span>タスク数 {limits.current}/{limits.max}</span>
            <span>最低 {limits.min}件は必要</span>
          </div>
        </div>
        <div className="settings-links rpg-link-grid">
          <Link href="/task-settings" className="ui-link-button quest-btn quest-btn-secondary">
            タスク設定へ戻る
          </Link>
        </div>
      </section>

      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card task-board-card">
        <h2 className="screen-section-title">削除対象クエスト</h2>
        <ul className="quest-list">
          {activeTasks.map((task, index) => (
            <li className="row quest-item task-row task-row-rpg" key={task.taskId}>
              <div className="row-tight">
                <img src="/img/icon/generated_sfc/icon_sfc_tasks_01.png" alt="" className="quest-icon quest-icon-large" />
                <span>
                  {index + 1}. {task.name}
                </span>
              </div>
              <button className="quest-btn quest-btn-primary" onClick={() => onRemoveTask(task.taskId)} disabled={limits.current <= limits.min}>
                削除
              </button>
            </li>
          ))}
        </ul>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
