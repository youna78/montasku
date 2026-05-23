"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/common/BottomNav";
import { DevDebugPanel } from "@/components/debug/DevDebugPanel";
import { getMonsterImage } from "@/lib/game/assets";
import { getBackgroundImagePath, getFrameThemeClass } from "@/lib/game/shop";
import { getTaskLimitInfo, shouldRouteToDailyReview } from "@/lib/game/state";
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

  return (
    <main
      className={`page-shell page-rpg page-tasks page-task-settings ${getFrameThemeClass(gameState.selectedFrameId)}`}
      style={{ backgroundImage: `url("${getBackgroundImagePath(gameState.selectedBackgroundId)}")` }}
    >
      <div className="title-panel">タスク設定</div>

      <section className="card decorated-card screen-summary-card task-settings-summary-card">
        <img src={getMonsterImage(currentMonster?.monsterId)} alt="" className="screen-summary-monster" />
        <div className="screen-summary-copy">
          <strong>クエスト管理</strong>
          <span>毎日のタスクを追加・削除・並び替えできます。</span>
          <div className="task-progress-strip">
            <span>登録 {limits.current}/{limits.max}</span>
            <span>最低 {limits.min}</span>
          </div>
        </div>
      </section>

      <section className="card decorated-card task-settings-menu-card">
        <h2 className="screen-section-title">管理メニュー</h2>
        <div className="task-global-menu">
          <Link href="/task-add" className="ui-link-button task-global-menu-button task-global-menu-button-primary">
            追加
          </Link>
          <Link href="/task-remove" className="ui-link-button task-global-menu-button task-global-menu-button-secondary">
            削除
          </Link>
          <Link href="/task-reorder" className="ui-link-button task-global-menu-button task-global-menu-button-accent">
            並び替え
          </Link>
        </div>
      </section>

      <section className="card decorated-card task-board-card task-settings-board-card">
        <h2 className="screen-section-title">現在設定中クエスト</h2>
        <ul className="quest-list">
          {activeTasks.map((task, index) => (
            <li key={task.taskId} className="quest-item task-row-rpg task-settings-row">
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
            </li>
          ))}
        </ul>
        <div className="task-global-menu section-bottom-action">
          <Link href="/task-add" className="ui-link-button task-global-menu-button task-global-menu-button-primary">
            追加
          </Link>
          <Link href="/task-remove" className="ui-link-button task-global-menu-button task-global-menu-button-secondary">
            削除
          </Link>
          <Link href="/task-reorder" className="ui-link-button task-global-menu-button task-global-menu-button-accent">
            並び替え
          </Link>
        </div>
      </section>

      <DevDebugPanel gameState={gameState} monsters={monsters} />
      <BottomNav />
    </main>
  );
}
