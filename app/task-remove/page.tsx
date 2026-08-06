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

export default function TaskRemovePage() {
  const router = useRouter();
  const { tasks, monsters, gameState, isLoading, removeTask, waitForPendingSave } = useGame();
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
  const isAtMinTasks = limits.current <= limits.min;

  const onRemoveTask = async (taskId: number) => {
    if (isSaving) return;
    const result = removeTask(taskId);
    if (!result) {
      setMessage("削除に失敗しました");
      return;
    }
    if (result.removed) {
      playSfx("s_delete");
      setMessage("タスクを削除しました");
      setIsSaving(true);
      await waitForPendingSave();
      setIsSaving(false);
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
      className={`page-shell page-rpg page-tasks page-task-remove ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">タスク削除</div>

      <section className="card decorated-card screen-summary-card task-remove-summary-card">
        <img src={getMonsterImage(currentMonster?.monsterId)} alt="" className="screen-summary-monster" />
        <div className="screen-summary-copy">
          <strong>クエストを整理する</strong>
          <span>毎日のクエストから、使わないタスクを外せます。</span>
          <div className="task-progress-strip">
            <span>登録 {limits.current}/{limits.max}</span>
            <span>最低 {limits.min}</span>
          </div>
        </div>
      </section>

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

      <section className="card decorated-card task-remove-guide-card">
        <h2 className="screen-section-title">削除ルール</h2>
        <p>タスクは最低{limits.min}件必要です。削除したタスクは追加画面から戻せます。</p>
        {isAtMinTasks && <div className="task-remove-limit-note">最低件数のため、これ以上削除できません。</div>}
        <div className="settings-links rpg-link-grid">
          <Link href="/task-settings" className="ui-link-button quest-btn quest-btn-secondary">
            タスク設定へ戻る
          </Link>
        </div>
      </section>

      {message && <div className="toast">{message}</div>}

      <section className="card decorated-card task-board-card task-remove-board-card">
        <h2 className="screen-section-title">削除対象クエスト</h2>
        <ul className="quest-list">
          {activeTasks.map((task, index) => (
            <li className="quest-item task-row-rpg task-remove-row" key={task.taskId}>
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
              <button className="quest-btn quest-btn-primary task-remove-button" onClick={() => onRemoveTask(task.taskId)} disabled={isAtMinTasks || isSaving}>
                削除
              </button>
            </li>
          ))}
        </ul>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
      {isSaving && (
        <div className="auth-email-modal-overlay purchase-processing-overlay" role="status" aria-live="polite">
          <div className="card decorated-card auth-email-modal-card">
            <p className="auth-email-modal-title">保存しています...</p>
          </div>
        </div>
      )}
    </main>
  );
}
