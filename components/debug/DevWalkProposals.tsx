"use client";

import { useState, type CSSProperties } from "react";
import { getMonsterMotionAsset } from "@/lib/game/assets";
import { NOVEMBER_GROUND_WALKS, getNovemberGroundWalkImagePath } from "@/lib/game/events/novemberGroundWalks";

const PROPOSALS = NOVEMBER_GROUND_WALKS.map(walk => ({
  ...walk,
  referenceId: walk.id === 108 ? 7 : walk.id === 112 ? 8 : walk.gait === "biped" ? 108 : 112,
  reference: walk.id === 108 ? "プチドラ" : walk.id === 112 ? "プチビースト" : walk.gait === "biped" ? "もみじポン" : "旅するミニビースト",
  description: walk.gait === "biped" ? "二足の接地と踏み出しを切り替える歩行です。" : "前後の足の接地を切り替える、四つ足の歩行です。",
  imagePath: getNovemberGroundWalkImagePath(walk.slug)
}));
const POSITIONS = ["0 0", "100% 0", "0 100%", "100% 100%"];

export function DevWalkProposals() {
  const [playing, setPlaying] = useState(true);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [duration, setDuration] = useState(1600);
  const [travel, setTravel] = useState(false);
  const [visibleMonsterId, setVisibleMonsterId] = useState("all");

  const renderSprite = (imagePath: string, label: string, size = 142, offsetY = 0) => <div className="dev-walk-stage" style={{ height: zoom === 2 ? 320 : 190 }}>
    <div className={travel ? "dev-walk-travel" : undefined} style={{ animationPlayState: playing ? "running" : "paused" }}>
      <div role="img" aria-label={label} className="monster-img monster-sprite" style={{
        "--monster-sprite-size": `${size}px`, backgroundImage: `url("${imagePath}")`,
        transform: `translateY(${offsetY * zoom}px) scale(${zoom})`,
        animationDuration: `${duration}ms`, animationPlayState: playing ? "running" : "paused",
        ...(selectedFrame !== null ? { animationName: "none", backgroundPosition: POSITIONS[selectedFrame] } : {})
      } as CSSProperties} />
    </div>
  </div>;

  return <section className="card decorated-card" id="walk-proposals">
    <h2>採用した walk の比較</h2>
    <p>承認済みの歩行をゲーム本体に反映しました。通常・変更前・採用後を同じ速度で比較できます。</p>
    <div className="dev-walk-controls">
      <button type="button" className="quest-btn quest-btn-primary" onClick={() => { setPlaying(!playing); setSelectedFrame(null); }}>{playing ? "一時停止" : "再生"}</button>
      <label>大きさ<select value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value={1}>ゲームと同じ</option><option value={2}>2倍で確認</option></select></label>
      <label>1周の速さ<select value={duration} onChange={event => setDuration(Number(event.target.value))}><option value={1600}>ゲームと同じ（1.6秒）</option><option value={800}>軽快（0.8秒）</option></select></label>
      <label><input type="checkbox" checked={travel} onChange={event => setTravel(event.target.checked)} />横移動も見る</label>
      <label>表示対象<select value={visibleMonsterId} onChange={event => setVisibleMonsterId(event.target.value)}><option value="all">すべて</option>{PROPOSALS.map(walk => <option key={walk.id} value={walk.id}>{walk.name}</option>)}</select></label>
    </div>
    <div className="dev-walk-frame-controls" aria-label="コマを確認">{POSITIONS.map((_, index) => <button key={index} type="button" aria-pressed={selectedFrame === index} onClick={() => { setPlaying(false); setSelectedFrame(index); }}>{index + 1}コマ目</button>)}</div>
    {PROPOSALS.filter(walk => visibleMonsterId === "all" || String(walk.id) === visibleMonsterId).map(proposal => {
      const normal = getMonsterMotionAsset(proposal.referenceId, "walk");
      const adopted = getMonsterMotionAsset(proposal.id, "walk");
      const previous = {
        imagePath: proposal.imagePath.replace("_walk_v3_4f.png", "_walk_4f.png"),
        displaySize: proposal.previousSize,
        offsetY: proposal.previousY
      };
      return <article key={proposal.id} className="dev-walk-proposal">
        <h3>{proposal.name}</h3><p>{proposal.description}</p>
        <div className={`dev-walk-columns${zoom === 2 ? " dev-walk-columns-zoomed" : ""}`}>
          <div><strong>参考：{proposal.reference}</strong>{normal && renderSprite(normal.imagePath, `${proposal.reference} 参考歩行`, normal.displaySize, normal.offsetY)}</div>
          <div><strong>変更前のシート</strong>{renderSprite(previous.imagePath, `${proposal.name} 変更前の歩行`, previous.displaySize, previous.offsetY)}</div>
          <div><strong>採用した歩行</strong>{adopted && renderSprite(adopted.imagePath, `${proposal.name} 採用した歩行`, adopted.displaySize, adopted.offsetY)}</div>
        </div>
        <a href={proposal.imagePath} target="_blank" rel="noreferrer" className="home-records-link">採用シートを開く</a>
      </article>;
    })}
  </section>;
}
