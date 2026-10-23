"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import type { summarizeRecords } from "@/lib/game/records";

type Summary = ReturnType<typeof summarizeRecords>;
type Props = { data: Summary; streakDays: number; discoveredCount: number; letterCount: number };
const ICONS = "/img/icon/sfc/";

function ActivityChart({ values, weekly = false }: { values: { label: string; value: number }[]; weekly?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const largest = Math.max(weekly ? 5 : 10, ...values.map(row => row.value));
  const roughStep = largest / 3;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10].map(n => n * magnitude).find(n => n >= roughStep) ?? magnitude * 10;
  const maximum = step * 3;
  useEffect(() => { if (!weekly && scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth; }, [weekly, values.length]);
  return <div className={`adventure-chart${weekly ? " adventure-chart-weekly" : ""}`}>
    <div className="adventure-chart-axis" aria-hidden="true">{[maximum, step * 2, step, 0].map(n => <span key={n}>{n}</span>)}</div>
    <div className="adventure-chart-scroll" ref={scrollRef} tabIndex={weekly ? undefined : 0} role="region" aria-label={weekly ? "月曜から日曜の達成タスク数" : "月ごとの達成タスク数。横にスクロールできます"}>
      <div className="adventure-chart-plot" style={{ "--chart-columns": values.length } as CSSProperties}>
        <div className="adventure-chart-grid" aria-hidden="true" />
        {values.map(row => <div className="adventure-chart-column" key={row.label}>
          <div className="adventure-chart-track"><div className="adventure-chart-bar" style={{ height: `${row.value / maximum * 100}%` }}>{row.value > 0 && <strong>{row.value}</strong>}</div></div>
          <span className="adventure-chart-label">{row.label}<span className="sr-only">：{row.value}件</span></span>
        </div>)}
      </div>
    </div>
  </div>;
}

export function AdventureRecords({ data, streakDays, discoveredCount, letterCount }: Props) {
  const weekTotal = data.week.reduce((sum, day) => sum + day.value, 0);
  const monthValues = data.monthly.map(([month, value]) => ({ label: `${month.slice(0, 4)}/${Number(month.slice(5))}`, value }));
  return <main className="page-shell page-rpg page-records adventure-records">
    <h1 className="title-panel">冒険の記録</h1>
    <section className="card decorated-card adventure-summary" aria-label="これまでの冒険の軌跡">
      <div className="adventure-greeting"><img src="/img/monster/monster_egg_01.png" alt="" /><p>これまでの冒険の軌跡だよ！<br />これからも、たくさんの思い出をつくろう！</p></div>
      <div className="adventure-totals">
        <div className="adventure-stat adventure-stat-streak"><span className="adventure-stat-icon" aria-hidden="true">🔥</span><div><span>現在の連続ログイン</span><strong>{streakDays.toLocaleString()}<small>日目</small></strong></div></div>
        <div className="adventure-stat adventure-stat-tasks"><img src={`${ICONS}sfc_task_01.png`} alt="" /><div><span>達成タスク</span><strong>{data.records.length.toLocaleString()}<small>件</small></strong></div></div>
        <div className="adventure-stat adventure-stat-exp"><span className="adventure-stat-icon" aria-hidden="true">✦</span><div><span>獲得EXP</span><strong>{data.exp.toLocaleString()}</strong></div></div>
        <div className="adventure-stat adventure-stat-monsters"><img src={`${ICONS}sfc_slime_01.png`} alt="" /><div><span>出会ったモンスター</span><strong>{discoveredCount.toLocaleString()}<small>体</small></strong></div></div>
        <div className="adventure-stat adventure-stat-coins"><img src={`${ICONS}sfc_free_coin_01.png`} alt="" /><div><span>獲得コイン</span><strong>{data.coins.toLocaleString()}</strong></div></div>
      </div>
      <p className="records-note adventure-note">ℹ 記録機能追加以前の一部データは含まれません。</p>
    </section>
    <section className="card decorated-card adventure-activity" aria-labelledby="weekly-heading">
      <div className="adventure-section-heading"><h2 id="weekly-heading">今週の活動</h2><div className="adventure-week-message"><p>今週は <strong>{weekTotal.toLocaleString()}</strong> 件の<br />タスクを達成したよ！</p><img src="/img/monster/monster_renewal_28_mini_rabbit_01.png" alt="" /></div></div>
      <ActivityChart values={data.week} weekly />
    </section>
    <section className="card decorated-card adventure-activity" aria-labelledby="monthly-heading">
      <div className="adventure-section-heading"><h2 id="monthly-heading">月ごとの冒険</h2><p className="adventure-month-description">これまでの達成記録を振り返ろう！<br />横にスクロールして、過去の月も確認できるよ。</p></div>
      {monthValues.length ? <ActivityChart values={monthValues} /> : <p className="adventure-empty">タスクを達成すると、ここに冒険の記録が増えていくよ。</p>}
    </section>
    <Link href="/letters" className="adventure-letter-link"><img src={`${ICONS}sfc_letter_01.png`} alt="" /><span>手紙一覧を見る（{letterCount.toLocaleString()}通）</span><span aria-hidden="true">›</span></Link>
    <Link href="/home" className="adventure-home-link"><span aria-hidden="true">←</span>ホームへ戻る</Link>
  </main>;
}
