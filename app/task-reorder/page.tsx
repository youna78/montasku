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
      className={`page-shell page-rpg ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">タスク並び替え</div>
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

      <section className="card decorated-card screen-summary-card">
        <img src="/img/icon/generated_sfc/icon_sfc_tasks_01.png" alt="" className="screen-summary-monster" />
        <div className="screen-summary-copy">
          <strong>表示順を変更</strong>
          <span>ホームやタスク画面に出る順番を整えます。</span>
          <div className="task-progress-strip">
            <span>タスク数 {limits.current}/{limits.max}</span>
            <span>上から順に表示</span>
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
        <h2 className="screen-section-title">並び替え対象クエスト</h2>
        <ul className="quest-list">
          {activeTasks.map((task, index) => (
            <li className="row quest-item task-row task-row-rpg" key={task.taskId}>
              <div className="row-tight">
                <img src="/img/icon/generated_sfc/icon_sfc_tasks_01.png" alt="" className="quest-icon quest-icon-large" />
                <span>
                  {index + 1}. {task.name}
                </span>
              </div>
              <div className="row-tight">
                <button className="quest-btn quest-btn-primary quest-btn-icon" onClick={() => onMove(task.taskId, "up")} disabled={index === 0}>
                  ↑
                </button>
                <button className="quest-btn quest-btn-primary quest-btn-icon" onClick={() => onMove(task.taskId, "down")} disabled={index === activeTasks.length - 1}>
                  ↓
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
