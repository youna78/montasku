"use client";
import Link from "next/link";
import { useState } from "react";
import type { MonsterMaster } from "@/types/master";
import { GAME_EVENTS, isEventMonster } from "@/lib/game/events";
import { getMonsterImage } from "@/lib/game/assets";

const events = [...GAME_EVENTS].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
export function DexCollection({ monsters, discoveredIds }: { monsters: MonsterMaster[]; discoveredIds: number[] }) {
  const [category, setCategory] = useState<"normal" | "seasonal">("seasonal");
  const [eventId, setEventId] = useState(events[0]?.eventId);
  const [page, setPage] = useState(0);
  const event = events.find(item => item.eventId === eventId);
  const seasonal = category === "seasonal";
  const list = monsters.filter(monster => seasonal ? event?.rewardPreviewMonsterIds.includes(monster.monsterId) : !isEventMonster(monster.monsterId));
  const pages = Math.max(1, Math.ceil(list.length / 9));
  const visible = list.slice(page * 9, (page + 1) * 9);
  return <>
    <div className="dex-book-tabs" role="group" aria-label="図鑑の表示切り替え">
      <button aria-pressed={!seasonal} onClick={() => { setCategory("normal"); setPage(0); }}>通常</button>
      <button aria-pressed={seasonal} onClick={() => { setCategory("seasonal"); setPage(0); }}>季節限定</button>
    </div>
    <section className="card decorated-card dex-book">
      <h2>{seasonal ? "季節イベント一覧" : "通常のモンスター"}</h2>
      <p className="dex-book-intro">{seasonal ? "新しいイベント順です。イベントを選ぶと仲間一覧を見られます。" : "出会った仲間をタップして、記録を見返そう。"}</p>
      <div className={seasonal ? "dex-book-spread" : ""}>
        {seasonal && <nav className="dex-event-index" aria-label="季節イベント一覧">{events.map(item => <button key={item.eventId} aria-pressed={eventId === item.eventId} onClick={() => { setEventId(item.eventId); setPage(0); }}><img src={item.shopIconImagePath || getMonsterImage(item.freeEggMonsterId)} alt="" /><span>{item.name}<small>{new Date(item.startsAt).getFullYear()}年{new Date(item.startsAt).getMonth() + 1}月</small></span><b aria-hidden="true">›</b></button>)}</nav>}
        <div>
          {seasonal && <h3 className="dex-event-title">{event?.name}の仲間</h3>}
          <p className="dex-category-summary" role="status">{list.filter(monster => discoveredIds.includes(monster.monsterId)).length}/{list.length}体 発見</p>
          <div className={`dex-character-grid ${seasonal ? "dex-character-grid-seasonal" : ""}`}>
            {visible.map(monster => {
              const found = discoveredIds.includes(monster.monsterId);
              const content = <><small className="dex-character-number">#{monster.monsterId}</small><img src={found ? getMonsterImage(monster.monsterId) : "/img/ui/ui_shadow_fallback_01.png"} alt={found ? monster.name : "未発見"} /><strong>{found ? monster.name : "？？？"}</strong><span>{found ? "タップで詳細 ›" : "未発見"}</span></>;
              return found ? <Link key={monster.monsterId} className="dex-character-card" href={`/dex/${monster.monsterId}`}>{content}</Link> : <div key={monster.monsterId} className="dex-character-card dex-character-locked">{content}</div>;
            })}
          </div>
          {pages > 1 && <nav className="dex-book-pages" aria-label="図鑑のページ"><button disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="前のページ">‹</button><span>{page + 1} / {pages}</span><button disabled={page === pages - 1} onClick={() => setPage(page + 1)} aria-label="次のページ">›</button></nav>}
        </div>
      </div>
    </section>
  </>;
}
