"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  balance: number | null;
  isLoading: boolean;
  onGrant: (amount: number) => Promise<number | null>;
};

export function DevPaidCoinPanel({ balance, isLoading, onGrant }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [isGrantingCoins, setIsGrantingCoins] = useState(false);
  const [coinMessage, setCoinMessage] = useState("");
  const grantingRef = useRef(false);

  useEffect(() => {
    setIsVisible(
      process.env.NODE_ENV === "development" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }, []);

  const handleGrantPaidCoins = async () => {
    if (grantingRef.current) return;
    grantingRef.current = true;
    setIsGrantingCoins(true);
    setCoinMessage("");
    try {
      const nextBalance = await onGrant(500);
      setCoinMessage(nextBalance === null
        ? "付与できませんでした。ログイン状態・通信状況・検証環境の設定を確認してください。"
        : `500モンタコインを付与しました。現在 ${nextBalance.toLocaleString()} コインです。`);
    } catch {
      setCoinMessage("付与結果を確認できませんでした。残高を再読み込みして確認してください。");
    } finally {
      grantingRef.current = false;
      setIsGrantingCoins(false);
    }
  };

  if (!isVisible) return null;

  return (
    <section className="card decorated-card dev-paid-coin-card">
      <div className="notification-card-head">
        <span className="notification-badge notification-badge-info">検証用</span>
        <h2>モンタコイン付与</h2>
      </div>
      <p className="shop-note">ショップ購入の確認に使うモンタコインを、この検証データへ追加します。</p>
      <div className="dev-paid-coin-balance" aria-live="polite">
        <img src="/img/icon/icon_paid_coin_01.png" alt="" />
        <span>現在のモンタコイン</span>
        <strong>{isLoading || balance === null ? "読込中" : balance.toLocaleString()}</strong>
      </div>
      <button
        type="button"
        className="quest-btn task-global-menu-button task-global-menu-button-accent dev-paid-coin-button"
        onClick={handleGrantPaidCoins}
        disabled={isLoading || balance === null || isGrantingCoins}
      >
        <img src="/img/icon/icon_paid_coin_pack_01.png" alt="" />
        <span>{isGrantingCoins ? "付与中..." : "500モンタコイン付与"}</span>
      </button>
      {coinMessage ? <p className="dev-paid-coin-message" role="status">{coinMessage}</p> : null}
    </section>
  );
}
