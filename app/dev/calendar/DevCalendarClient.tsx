"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/common/BottomNav";
import { GAME_EVENTS, getEventStatusLabel, getRemainingDaysLabel, getVisibleHomeEvents } from "@/lib/game/events";
import { clearVirtualGameNow, getGameNow, getVirtualGameNow, setVirtualGameNow } from "@/lib/game/virtualTime";

const PRESETS = [
  { label: "告知開始", value: "2026-05-28T00:00:00+09:00" },
  { label: "6月開始", value: "2026-06-01T00:00:00+09:00" },
  { label: "6月最終日", value: "2026-06-30T12:00:00+09:00" },
  { label: "終了後", value: "2026-07-01T00:00:00+09:00" }
];

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toJapanIso(value: string): string {
  return `${value}:00+09:00`;
}

export function DevCalendarClient() {
  const [inputValue, setInputValue] = useState("2026-06-01T00:00");
  const [virtualNow, setVirtualNow] = useState<string | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const currentNow = getGameNow();
  const visibleEvents = getVisibleHomeEvents(currentNow);
  const isRenewalActive = currentNow.getTime() >= new Date("2026-06-01T00:00:00+09:00").getTime();

  useEffect(() => {
    const saved = getVirtualGameNow();
    setVirtualNow(saved);
    setInputValue(toDateTimeLocalValue(saved ?? new Date().toISOString()));
  }, []);

  const refresh = (value: string | null) => {
    setVirtualNow(value);
    setRenderKey((current) => current + 1);
  };

  const applyValue = (value: string) => {
    setVirtualGameNow(value);
    setInputValue(toDateTimeLocalValue(value));
    refresh(value);
  };

  const clearValue = () => {
    clearVirtualGameNow();
    setInputValue(toDateTimeLocalValue(new Date().toISOString()));
    refresh(null);
  };

  return (
    <main className="page-shell" key={renderKey}>
      <div className="title-panel">検証カレンダー</div>

      <section className="card decorated-card notification-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-info">DEV</span>
          <h2>仮想日時</h2>
        </div>
        <p className="shop-note">このブラウザだけで、イベント期間などの判定に使う日時を上書きします。</p>
        <div className="settings-menu-grid">
          <input
            type="datetime-local"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            className="task-input"
          />
          <button className="quest-btn task-global-menu-button task-global-menu-button-primary" onClick={() => applyValue(toJapanIso(inputValue))}>
            この日時にする
          </button>
          <button className="quest-btn task-global-menu-button task-global-menu-button-secondary" onClick={clearValue}>
            実日時に戻す
          </button>
        </div>
        <div className="event-progress-grid">
          <div className="event-progress-item">
            <span>現在の判定日時</span>
            <strong>{currentNow.toLocaleString("ja-JP")}</strong>
          </div>
          <div className="event-progress-item">
            <span>上書き</span>
            <strong>{virtualNow ? "有効" : "なし"}</strong>
          </div>
          <div className="event-progress-item">
            <span>6月リニューアル</span>
            <strong>{isRenewalActive ? "有効" : "無効"}</strong>
          </div>
        </div>
      </section>

      <section className="card decorated-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-event">プリセット</span>
          <h2>6月イベント確認</h2>
        </div>
        <div className="task-global-menu">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              className="quest-btn task-global-menu-button task-global-menu-button-secondary"
              onClick={() => applyValue(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card decorated-card">
        <div className="notification-card-head">
          <span className="notification-badge notification-badge-info">イベント状態</span>
          <h2>判定結果</h2>
        </div>
        <div className="event-progress-grid">
          {GAME_EVENTS.map((eventConfig) => (
            <div className="event-progress-item" key={eventConfig.eventId}>
              <span>{eventConfig.name}</span>
              <strong>
                {getEventStatusLabel(eventConfig, currentNow)} / {getRemainingDaysLabel(eventConfig, currentNow)}
              </strong>
            </div>
          ))}
        </div>
        <p className="shop-note">ホーム表示対象: {visibleEvents.map((eventConfig) => eventConfig.name).join(" / ") || "なし"}</p>
      </section>

      <section className="card decorated-card">
        <div className="settings-menu-grid centered-actions">
          <Link href="/home" className="ui-link-button settings-menu-button settings-menu-button-primary">
            ホームで確認
          </Link>
          <Link href="/event/june-shrine" className="ui-link-button settings-menu-button settings-menu-button-secondary">
            6月イベントを見る
          </Link>
          <Link href="/shop/events/june-shrine" className="ui-link-button settings-menu-button settings-menu-button-neutral">
            6月ショップを見る
          </Link>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
