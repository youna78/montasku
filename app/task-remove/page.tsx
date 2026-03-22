"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
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
    <main className="page-shell">
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

      <section className="card decorated-card">
        <div>
          タスク数: {limits.current} / {limits.max}
        </div>
        <div>最低必要数: {limits.min}</div>
        <div className="settings-links rpg-link-grid">
          <Link href="/task-settings" className="ui-link-button quest-btn quest-btn-secondary">
            タスク設定へ戻る
          </Link>
        </div>
      </section>

      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card">
        <h2>削除対象クエスト</h2>
        <ul className="quest-list">
          {activeTasks.map((task, index) => (
            <li className="row quest-item task-row" key={task.taskId}>
              <div className="row-tight">
                <img src="/img/icon/icon_quest_task_01.png" alt="quest" className="quest-icon" />
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
