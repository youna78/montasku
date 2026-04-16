"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function AccountDeletionSection() {
  const { user, isConfigured, errorMessage, deleteAccount, clearError } = useAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [hasConfirmedDelete, setHasConfirmedDelete] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const onDeleteAccount = async () => {
    if (!hasConfirmedDelete) return;

    setIsDeletingAccount(true);
    const ok = await deleteAccount();
    setIsDeletingAccount(false);
    if (ok) {
      setHasConfirmedDelete(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (!isConfigured) return null;

  return (
    <div className="legal-section account-delete-section">
      <h2>アカウント削除について</h2>
      <p>
        退会・アカウント削除を希望する場合は、ログイン中の状態で下のボタンから手続きできます。
      </p>
      <p>
        削除すると、クラウドに保存しているユーザー情報、ゲームデータ、購入履歴などが削除されます。
      </p>
      {!user ? (
        <p className="auth-card-subnote">アカウント削除は、ログイン中のみ実行できます。</p>
      ) : (
        <div className="legal-actions">
          <button
            className="quest-btn quest-btn-danger settings-menu-button"
            onClick={() => {
              clearError();
              setHasConfirmedDelete(false);
              setIsDeleteModalOpen(true);
            }}
          >
            退会・アカウント削除
          </button>
        </div>
      )}

      {isDeleteModalOpen && user && (
        <div className="auth-email-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-delete-modal-title">
          <div className="card decorated-card auth-email-modal-card">
            <h3 id="auth-delete-modal-title" className="auth-email-modal-title">
              退会・アカウント削除
            </h3>
            <div className="auth-delete-warning">
              <p>
                アカウントを削除すると、クラウドに保存しているユーザー情報、ゲームデータ、購入履歴などを削除します。
              </p>
              <p>
                この操作は取り消せません。内容を確認したらチェックを入れてください。
              </p>
            </div>
            <div className="auth-form-grid">
              <label className="auth-delete-checkbox-row">
                <input
                  type="checkbox"
                  checked={hasConfirmedDelete}
                  onChange={(event) => setHasConfirmedDelete(event.target.checked)}
                />
                <span>内容を確認しました。アカウントを削除します。</span>
              </label>
              <button
                className="quest-btn quest-btn-danger auth-card-button"
                disabled={!hasConfirmedDelete || isDeletingAccount}
                onClick={() => void onDeleteAccount()}
              >
                {isDeletingAccount ? "削除しています..." : "アカウントを削除する"}
              </button>
              <button
                className="quest-btn quest-btn-secondary auth-card-button"
                disabled={isDeletingAccount}
                onClick={() => {
                  clearError();
                  setHasConfirmedDelete(false);
                  setIsDeleteModalOpen(false);
                }}
              >
                キャンセル
              </button>
            </div>
            {errorMessage && <div className="auth-card-error">{errorMessage}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
