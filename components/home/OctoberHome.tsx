import Link from "next/link";
import { GrowthHelp } from "@/components/common/GrowthHelp";
import type { ReactNode } from "react";
import type { GameState } from "@/types/game";
import type { TaskMaster } from "@/types/master";
import type { GameEventConfig } from "@/types/event";
import { getMonsterImage } from "@/lib/game/assets";
import { getEventStatusLabel, getRemainingDaysLabel } from "@/lib/game/events";
import { tasksUntilBirth } from "@/lib/game/octoberUi";

type Props = {
  state: GameState;
  monsterName: string;
  progress: { current: number; required: number };
  remainingTasks: TaskMaster[];
  activeTaskCount: number;
  notificationCount: number;
  event: GameEventConfig | null;
  stage: ReactNode;
  attributes: ReactNode;
  onPet: () => void;
  onComplete: (taskId: number) => void;
};
const icon = (name: string) => `/img/icon/sfc/sfc_${name}_01.png`;

export function OctoberHome({ state, monsterName, progress, remainingTasks, activeTaskCount, notificationCount, event, stage, attributes, onPet, onComplete }: Props) {
  const remainingExp = Math.max(0, progress.required - progress.current);
  const completed = activeTaskCount - remainingTasks.length;
  const guidance = !state.hasCompletedCurrentBirth
    ? `あと${tasksUntilBirth(state.onboardingCompletedTaskCount)}件で誕生！`
    : progress.required === 0 ? "最後の成長段階まで育ちました！"
    : remainingTasks.length > 0 && remainingTasks.every(task => task.baseExp >= remainingExp)
      ? "あと1件でレベルアップ！" : `あと${remainingExp}EXPでレベルアップ！`;
  const eventState = event ? state.eventStates[event.eventId] : null;
  const loginDays = eventState?.loginDates.length ?? 0;

  return <>
    <section className="home-overview" aria-label="現在のステータス">
      <div className="home-overview-monster"><img src={getMonsterImage(state.currentMonsterId)} alt="" /><div><strong>{monsterName}</strong><span>Lv.{state.currentMonsterLevel}</span></div></div>
      <div className="home-overview-exp"><span>EXP <b>{progress.required ? `${progress.current}/${progress.required}` : "MAX"}</b></span><progress aria-label="次のレベルまでの成長" value={progress.current} max={progress.required || 1} /></div>
      <div className="home-overview-coins"><span><img src={icon("free_coin")} alt="" />無料 <b>{state.freeCoins.toLocaleString()}</b></span><span>★ モンタ <b>{state.paidCoinBalance.toLocaleString()}</b></span></div>
      <div className="home-overview-today">今日の達成 <strong>{completed}/{activeTaskCount}</strong></div>
      <div className="home-overview-actions">
        <Link href="/records" className="home-records-link"><span aria-hidden="true">📊</span> 達成グラフ</Link>
        <GrowthHelp />
      </div>
    </section>

    <nav className="home-quick-menu" aria-label="ホームのメニュー">
      <Link href="/notifications"><img src={icon("notification")} alt="" /><span>お知らせ</span>{notificationCount > 0 && <i aria-label={`${notificationCount}件の通知`}>{notificationCount}</i>}</Link>
      <Link href="/shop"><img src={icon("shop")} alt="" /><span>ショップ</span></Link>
      <Link href="/inventory"><img src={icon("inventory")} alt="" /><span>持ち物</span></Link>
      <button type="button" onClick={onPet}><span className="home-menu-symbol home-menu-heart" aria-hidden="true">♥</span><span>なでる</span></button>
    </nav>

    {event ? <Link id="home-event-guide" href={`/event/${event.slug}`} className="home-event-banner" aria-label={`${event.name}のイベントを見る`}>
      <img src={event.homeBannerImagePath || event.heroImagePath} alt="" />
      <span className="home-event-banner-status">{getEventStatusLabel(event)} · {getRemainingDaysLabel(event)}</span>
      <span className="home-event-banner-progress">ログイン {Math.min(loginDays,event.mission.loginDaysRequired)}/{event.mission.loginDaysRequired}日</span>
    </Link> : <section id="home-event-guide" className="home-event-guide" aria-labelledby="home-event-heading"><h2 id="home-event-heading">季節イベント</h2><p>次のイベントをお楽しみに！</p></section>}

    <section className="home-habitat" aria-label="モンスターのお部屋">
      {stage}
      <div className="home-growth-sign">
        <strong role="status">{guidance}</strong>
        <Link href="/tasks" className="quest-btn quest-btn-primary home-task-action"><img src={icon("task")} alt="" /><span>タスクを見る</span><span aria-hidden="true">›</span></Link>
      </div>
      <div className="home-habitat-attributes">{attributes}</div>
    </section>

    <section className="card decorated-card home-open-tasks" aria-labelledby="home-open-tasks-title">
      <h2 id="home-open-tasks-title">未達成タスク <small>{remainingTasks.length}件</small></h2>
      {remainingTasks.length ? <ul className="quest-list">{remainingTasks.slice(0,3).map(task => <li key={task.taskId} className="quest-item"><span><img src={icon("task")} alt="" />{task.name}</span><button className="quest-btn quest-btn-primary" onClick={() => onComplete(task.taskId)}>達成する</button></li>)}</ul> : <p>今日のタスクはすべて達成しました！</p>}
      <Link href="/tasks" className="home-all-tasks">すべてのタスクを見る ›</Link>
    </section>
  </>;
}
