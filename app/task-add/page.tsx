"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { playSfx } from "@/lib/game/sfx";
import { getTaskLimitInfo, shouldRouteToDailyReview } from "@/lib/game/state";
import { useGame } from "@/lib/game/useGame";

export default function TaskAddPage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, addTask } = useGame();
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
    <main
      className={`page-shell page-rpg ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">タスク追加</div>
      <section className="card decorated-card">
        <div className="task-global-menu">
          <span
            className="ui-link-button task-global-menu-button task-global-menu-button-primary task-global-menu-button-active task-global-menu-button-current"
            aria-current="page"
          >
            追加
          </span>
          <Link href="/task-remove" className="ui-link-button task-global-menu-button task-global-menu-button-secondary">
            削除
          </Link>
          <Link href="/task-reorder" className="ui-link-button task-global-menu-button task-global-menu-button-accent">
            並び替え
          </Link>
        </div>
      </section>

      <section className="card decorated-card screen-summary-card">
        <img src="/img/icon/generated_sfc/icon_sfc_tasks_01.png" alt="" className="screen-summary-monster" />
        <div className="screen-summary-copy">
          <strong>公式クエストを追加</strong>
          <span>生活に合うタスクを選んで、毎日のクエストに入れましょう。</span>
          <div className="task-progress-strip">
            <span>タスク数 {limits.current}/{limits.max}</span>
            <span>{isAtMaxTasks ? "上限です" : "追加できます"}</span>
          </div>
        </div>
      </section>

      <section className="card decorated-card">
        <p>公式タスク一覧から追加できます。</p>
        {isAtMaxTasks && <div>上限に達しているため追加できません。</div>}
        <div className="settings-links rpg-link-grid">
          <Link href="/task-settings" className="ui-link-button quest-btn quest-btn-secondary">
            タスク設定へ戻る
          </Link>
        </div>
      </section>

      {message && <div className="toast">{message}</div>}
      {errorMessage && <div className="toast">{errorMessage}</div>}

      <section className="card decorated-card task-board-card">
        <h2 className="screen-section-title">追加可能クエスト</h2>
        {addableTasks.length === 0 ? (
          <div>追加可能なタスクがありません。</div>
        ) : (
          <ul className="quest-list">
            {addableTasks.map((task) => (
              <li className="row quest-item task-row task-row-rpg" key={task.taskId}>
                <div className="row-tight">
                  <img src="/img/icon/generated_sfc/icon_sfc_tasks_01.png" alt="" className="quest-icon quest-icon-large" />
                  <div>
                    <div>{task.name}</div>
                    <small>{task.category}</small>
                  </div>
                </div>
                <button className="quest-btn quest-btn-primary" onClick={() => onAddTask(task.taskId)} disabled={isAtMaxTasks}>
                  このタスクを追加
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
