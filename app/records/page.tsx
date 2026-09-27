"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/game/useGame";
import { summarizeRecords } from "@/lib/game/records";
import { isOctoberUiEnabled } from "@/lib/game/octoberUi";
import { BottomNav } from "@/components/common/BottomNav";
import { getMonsterImage } from "@/lib/game/assets";
import { getInitialRoute } from "@/lib/game/state";
function Bars({ values, gold = false }: { values: {label: string; value: number}[]; gold?: boolean }) {
  const max = Math.max(1, ...values.map(row => row.value));
  return <div className={`record-chart ${gold ? "record-chart-gold" : ""}`} role="img" aria-label={values.map(row => `${row.label}: ${row.value}件`).join("、")}>
    {values.map(row => <div className="record-chart-column" key={row.label}><strong>{row.value}</strong><div className="record-chart-track"><div style={{height: `${row.value / max * 100}%`}} /></div><span>{row.label}</span></div>)}
  </div>;
}
export default function RecordsPage() {
  const { gameState, monsters, isLoading } = useGame();
  const router = useRouter();
  const enabled = isOctoberUiEnabled();
  useEffect(() => { if (!enabled) { router.replace("/home"); return; } if (gameState) { const route = getInitialRoute(gameState); if (route !== "/home") router.replace(route); } }, [enabled, gameState, router]);
  if (isLoading || !gameState || !enabled) return <main>Loading...</main>;
  const data = summarizeRecords(gameState, gameState.lastPlayedDate);
  const known = data.records.filter(row => row.exp !== null).length;
  const monthValues = data.monthly.map(([label,value]) => ({label: `${label.slice(0,4)}/${Number(label.slice(5))}`,value}));
  return <main className="page-shell page-rpg page-records">
    <div className="title-panel">冒険の記録</div>
    <section className="card decorated-card">
      <div className="records-greeting"><img src={getMonsterImage(gameState.currentMonsterId)} alt="" /><p>これまでの頑張りを振り返ろう！<br />小さな達成が、冒険の記録になるよ。</p></div>
      <div className="records-totals">
        <div><span>記録された達成タスク</span><strong>{data.records.length.toLocaleString()}件</strong></div>
        <div><span>記録された獲得EXP</span><strong>{data.exp.toLocaleString()}</strong></div>
        <div><span>出会ったモンスター</span><strong>{monsters.filter(m => m.stage !== "egg" && gameState.discoveredMonsterIds.includes(m.monsterId)).length}体</strong></div>
        <div><span>いちばん達成した月</span><strong>{data.bestMonth?.replace("-", "年") ? `${data.bestMonth.replace("-", "年")}月` : "これから！"}</strong></div>
      </div>
      <p className="records-note">記録機能の追加以前の日別履歴は保存されていないため、過去の全達成数ではありません。引き継いだ当日の達成分を含み、EXP・獲得コインは記録開始後の確定分（{known}件）です。</p>
    </section>
    <section className="card decorated-card"><h2>月ごとの冒険</h2><p className="records-note">達成タスク数 · 横にスクロールして過去の月を確認</p>{monthValues.length ? <Bars values={monthValues} /> : <p>タスクを達成するとグラフが育ちます。</p>}</section>
    <section className="card decorated-card"><h2>今週の活動</h2><p className="records-note">月曜〜日曜の達成タスク数</p><Bars values={data.week} gold /></section>
    <section className="card decorated-card records-facts"><p>いちばん活動した曜日 <strong>{data.bestWeekday ? `${data.bestWeekday}曜日` : "これから！"}</strong></p><p>今月と先月の達成数の差 <strong>{data.difference >= 0 ? "+" : ""}{data.difference}件</strong></p><p className="records-note">今月の途中経過と先月全体の比較です。保存済みの記録のみを集計しています。</p><p>記録された獲得コイン <strong>{data.coins.toLocaleString()}</strong></p></section>
    <Link href="/letters" className="quest-btn records-letter-link">✉ 手紙一覧を見る（{gameState.acquiredLetters.length}通） ›</Link>
    <Link href="/home" className="records-home-link">ホームへ戻る</Link>
    <BottomNav />
  </main>;
}
