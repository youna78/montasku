"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { FarewellScene } from "@/components/common/FarewellScene";
import { DevWalkProposals } from "@/components/debug/DevWalkProposals";
import { NOVEMBER_LETTER_TEMPLATES } from "@/lib/game/events/novemberLetters";
import { NOVEMBER_KOYO_ONSEN_EVENT } from "@/lib/game/events/config";
import { LoginStreak } from "@/components/home/LoginStreak";
import { getMonsterImage, getMonsterMotionAsset, type MonsterMotionKind } from "@/lib/game/assets";

const PAIRS = [
  { label: "Egg", normal: 1, event: 107 },
  { label: "Baby / もみじポン", normal: 2, event: 108 },
  { label: "Baby / ゆけむりプチ", normal: 3, event: 109 },
  { label: "Child / おけネコ", normal: 7, event: 110 },
  { label: "Child / バスガイドミニフェアリー", normal: 6, event: 111 },
  { label: "Child / 旅するミニビースト", normal: 8, event: 112 }
];

function Sprite({ id, kind }: { id: number; kind: MonsterMotionKind }) {
  const motion = getMonsterMotionAsset(id, kind);
  const size = motion?.displaySize ?? 142;
  return <div className="dev-monster-preview-stage">
    {motion ? <div role="img" aria-label={`モンスター ${id} ${kind}`}
      className="monster-img monster-sprite"
      style={{ "--monster-sprite-size": `${size}px`, transform: `translateY(${motion.offsetY ?? 0}px)`, backgroundImage: `url("${motion.imagePath}")`, animationDuration: `${motion.durationMs}ms` } as CSSProperties} />
      : <img src={getMonsterImage(id)} className="monster-img" alt={`モンスター ${id}`} />}
  </div>;
}

export function DevNovemberClient() {
  const [happy, setHappy] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(0);
  return <main className="page-shell dev-november-review">
    <div className="title-panel">11月イベント 表示確認</div>
    <p className="card decorated-card">このページは見本表示です。育成中のモンスターやセーブデータは変更しません。</p>
    <section className="card decorated-card" id="november-banners">
      <h2>文字入りイベント画像</h2>
      <h3>ホームのイベントバナー</h3>
      <img src={NOVEMBER_KOYO_ONSEN_EVENT.homeBannerImagePath} alt="紅葉バスツアーと湯けむり温泉。タスクを達成して限定アイテムを手に入れよう！イベントへ" style={{ width: "100%", height: "auto", display: "block", marginBottom: 12 }} />
      <img src={NOVEMBER_KOYO_ONSEN_EVENT.heroImagePath} alt="紅葉バスツアーと湯けむり温泉。開催期間：11月1日〜11月30日" style={{ width: "100%", height: "auto", display: "block" }} />
      <img src={NOVEMBER_KOYO_ONSEN_EVENT.shopPromoBannerImagePath} alt="11月限定。紅葉バスツアーと湯けむり温泉。限定アイテムが登場！ショップへ" style={{ width: "100%", height: "auto", display: "block", marginTop: 12 }} />
      <h3>イベントショップのヘッダー</h3>
      <div className="event-shop-banner-image-wrap" style={{ aspectRatio: NOVEMBER_KOYO_ONSEN_EVENT.shopBannerAspectRatio }}>
        <img src={NOVEMBER_KOYO_ONSEN_EVENT.shopBannerImagePath} alt="期間限定ショップ。11月1日〜11月30日" className="event-shop-banner-image" />
      </div>
    </section>
    <nav className="dev-review-links" aria-label="見本へ移動"><a href="#walk-proposals" className="home-records-link">新しい歩行案へ</a><a href="#november-letters" className="home-records-link">11月の手紙へ</a></nav>
    <section className="card decorated-card">
      <h2>通常モンスターとのサイズ比較</h2>
      <button type="button" className="quest-btn quest-btn-primary" onClick={() => setHappy(!happy)}>{happy ? "通常の動きに戻す" : "喜ぶ動きを確認"}</button>
      {PAIRS.map(pair => <div key={pair.event} className="dev-monster-comparison">
        <h3>{pair.label}</h3>
        <div><span>通常</span><Sprite id={pair.normal} kind={happy ? "happy" : pair.normal === 1 ? "sway" : "walk"} /></div>
        <div><span>11月</span><Sprite id={pair.event} kind={happy ? "happy" : pair.event === 107 ? "sway" : "walk"} /></div>
      </div>)}
    </section>
    <DevWalkProposals />
    <section className="card decorated-card">
      <h2>連続ログイン表示（7日の見本）</h2>
      <LoginStreak days={7} />
    </section>
    <section className="card decorated-card" id="november-letters">
      <h2>11月限定の手紙</h2>
      <p>既存のリボン付き便箋と石畳の雰囲気を引き継いだ、3種類の手紙です。</p>
      <div className="dev-letter-gallery">
        {NOVEMBER_LETTER_TEMPLATES.map((letter, index) => <article key={letter.imagePath}>
          <a href={letter.imagePath} target="_blank" rel="noreferrer"><img src={letter.imagePath} alt={letter.title} /></a>
          <h3>{letter.title}</h3><p className="letter-body">{letter.body}</p>
          <button type="button" className="quest-btn quest-btn-primary" aria-pressed={selectedLetter === index} onClick={() => setSelectedLetter(index)}>{selectedLetter === index ? "下のお別れ見本に表示中" : "お別れ見本に表示"}</button>
        </article>)}
      </div>
    </section>
    <section className="card decorated-card">
      <h2>お別れ：手紙のみ</h2>
      <FarewellScene key={selectedLetter} phase="letter" imagePath={NOVEMBER_LETTER_TEMPLATES[selectedLetter].imagePath} />
      <div className="rpg-dialogue-box"><p className="rpg-dialogue-text">てがみを てにいれた。<br />紅葉ノ神鹿 との おもいでが つまっている。</p></div>
    </section>
    <Link href="/dev/calendar" className="ui-link-button">検証カレンダーへ</Link>
  </main>;
}
