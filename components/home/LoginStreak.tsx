"use client";

import { useId, useRef } from "react";

export function LoginStreak({ days }: { days: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  return <div className="home-login-streak">
    <button type="button" className="home-records-link home-streak-button" onClick={() => dialogRef.current?.showModal()}>
      <span aria-hidden="true">🔥</span><span>連続ログイン <strong>{days}日</strong></span>
    </button>
    <dialog ref={dialogRef} className="growth-help-content growth-help-dialog" aria-labelledby={headingId}>
      <strong id={headingId}>連続ログイン</strong>
      <p className="home-streak-count">現在 <b>{days}日</b> 連続！</p>
      <p>毎日ログインすると1日ずつ増えます。ログインしない日があると、次のログインは1日目から再スタートします。</p>
      <p>イベントの「累計ログイン日数」とは別の記録です。モンスターが交代しても引き継がれます。</p>
      <button type="button" className="quest-btn" onClick={() => dialogRef.current?.close()}>閉じる</button>
    </dialog>
  </div>;
}
