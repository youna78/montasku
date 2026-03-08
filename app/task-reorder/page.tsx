"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { playSfx } from "@/lib/game/sfx";
import { getTaskLimitInfo } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";
import type { TaskMaster } from "@/types/master";

export default function TaskReorderPage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, moveTask } = useGame();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!gameState) return;
    if (gameState.birthEventPending && !gameState.hasCompletedInitialBirth) {
      router.replace("/birth-event");
      return;
    }
    if (!gameState.hasCompletedInitialBirth) {
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
    <main className="page-shell">
      <div className="title-panel">タスク並び替え</div>

      <section className="card decorated-card">
        <div>
          タスク数: {limits.current} / {limits.max}
        </div>
        <div className="settings-links rpg-link-grid">
          <Link href="/task-settings" className="ui-link-button quest-btn quest-btn-secondary">
            タスク設定へ戻る
          </Link>
        </div>
      </section>

      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card">
        <h2>並び替え対象クエスト</h2>
        <ul className="quest-list">
          {activeTasks.map((task, index) => (
            <li className="row quest-item task-row" key={task.taskId}>
              <div className="row-tight">
                <img src="/img/icon/icon_egg_01.png" alt="quest" className="quest-icon" />
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
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
