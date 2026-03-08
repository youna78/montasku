"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { playSfx } from "@/lib/game/sfx";
import { getTaskLimitInfo } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function TaskAddPage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, addTask } = useGame();
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  const limits = gameState ? getTaskLimitInfo(gameState) : { min: 3, max: 15, current: 0 };
  const activeTaskIds = new Set((gameState?.activeTasks ?? []).filter((t) => t.enabled).map((t) => t.taskId));
  const isAtMaxTasks = limits.current >= limits.max;

  const addableTasks = useMemo(
    () =>
      tasks
        .filter((task) => !activeTaskIds.has(task.taskId))
        .sort((a, b) => a.recommendedOrder - b.recommendedOrder),
    [tasks, gameState?.activeTasks]
  );

  const onAddTask = (taskId: number) => {
    try {
      setErrorMessage("");
      const result = addTask(taskId);
      if (!result) {
        const msg = "タスク追加処理に失敗しました。状態が未初期化です。";
        console.error("[task-add] addTask returned null", { taskId });
        setErrorMessage(msg);
        return;
      }

      if (result.added) {
        playSfx("s_add");
        setMessage("タスクを追加しました。");
        return;
      }

      if (result.reason === "max_reached") {
        setMessage("上限15件のため追加できません");
        return;
      }
      setMessage("すでに追加済みです");
    } catch (error) {
      const msg = "タスク追加時にエラーが発生しました。";
      console.error("[task-add] failed to add task", { taskId, error });
      setErrorMessage(msg);
      return;
    }
  };

  if (isLoading || !gameState) {
    return <main>Loading...</main>;
  }

  return (
    <main className="page-shell">
      <div className="title-panel">タスク追加</div>

      <section className="card decorated-card">
        <p>公式タスク一覧から追加できます。</p>
        <div>
          タスク数: {limits.current} / {limits.max}
        </div>
        {isAtMaxTasks && <div>上限に達しているため追加できません。</div>}
        <div className="settings-links rpg-link-grid">
          <Link href="/task-settings" className="ui-link-button quest-btn quest-btn-secondary">
            タスク設定へ戻る
          </Link>
        </div>
      </section>

      {message && <div className="toast">{message}</div>}
      {errorMessage && <div className="toast">{errorMessage}</div>}

      <section className="card decorated-card">
        <h2>追加可能クエスト</h2>
        {addableTasks.length === 0 ? (
          <div>追加可能なタスクがありません。</div>
        ) : (
          <ul className="quest-list">
            {addableTasks.map((task) => (
              <li className="row quest-item task-row" key={task.taskId}>
                <div className="row-tight">
                  <img src="/img/icon/icon_egg_01.png" alt="quest" className="quest-icon" />
                  <div>
                    <div>{task.name}</div>
                    <small>{task.category}</small>
                  </div>
                </div>
                <button className="quest-btn quest-btn-primary" onClick={() => onAddTask(task.taskId)} disabled={isAtMaxTasks}>
                  追加
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
