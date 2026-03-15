"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getTaskLimitInfo } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";
import type { TaskMaster } from "@/types/master";

export default function TaskSettingsPage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading } = useGame();

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

  return (
    <main className="page-shell">
      <div className="title-panel">タスク設定</div>
      <section className="card decorated-card">
        <div>
          タスク数: {limits.current} / {limits.max}
        </div>
        <div>最小必要数: {limits.min}</div>
      </section>

      <section className="card decorated-card">
        <h2>現在設定中クエスト</h2>
        <ul className="quest-list">
          {activeTasks.map((task, index) => (
            <li key={task.taskId} className="quest-item">
              <img src="/img/icon/icon_egg_01.png" alt="quest" className="quest-icon" />
              <span>
                {index + 1}. {task.name}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card decorated-card">
        <p>タスクは公式タスクから選択して追加できます。</p>
        <div className="settings-links rpg-link-grid centered-actions">
          <Link href="/task-add" className="ui-link-button quest-btn quest-btn-secondary">タスクを追加へ</Link>
          <Link href="/task-remove" className="ui-link-button quest-btn quest-btn-secondary">タスク削除へ</Link>
          <Link href="/task-reorder" className="ui-link-button quest-btn quest-btn-secondary">タスク並び替えへ</Link>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
