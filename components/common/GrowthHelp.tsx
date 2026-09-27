"use client";

import { useEffect, useId, useRef, useState } from "react";

const SEEN_KEY = "montask-growth-help-v1";

type Props = {
  compact?: boolean;
};

/** A brief introduction shared by the home and task screens. */
export function GrowthHelp({ compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  useEffect(() => {
    try { setOpen(localStorage.getItem(SEEN_KEY) !== "seen"); } catch { setOpen(true); }
  }, []);

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(SEEN_KEY, "seen"); } catch { /* Help remains usable when storage is unavailable. */ }
  };

  return <div className={`growth-help ${compact ? "growth-help-compact" : ""}`}>
    <button type="button" className={`growth-help-toggle ${compact ? "growth-help-toggle-icon" : ""}`} aria-label={compact ? "育て方・数字の意味" : undefined} aria-expanded={open} aria-controls={id} onClick={() => open ? close() : setOpen(true)}>{compact ? "?" : "？ 育て方・数字の意味"}</button>
    <dialog ref={dialogRef} id={id} className="growth-help-content growth-help-dialog" aria-label="育て方のヒント" onCancel={(event) => { event.preventDefault(); close(); }}>
      <strong>タスクを達成すると、モンスターが育つよ！</strong>
      <dl>
        <div><dt>EXP</dt><dd>成長のポイント。たまるとレベルアップ！</dd></div>
        <div><dt>4属性</dt><dd>Power・Heal・Knowledge・Createのバランスが、進化先に影響するよ。</dd></div>
        <div><dt>コイン</dt><dd>ショップでお買い物。タスク達成でもらえる無料コインと、購入するモンタコインがあるよ。</dd></div>
      </dl>
      <button type="button" className="quest-btn" onClick={close}>▶︎OK</button>
    </dialog>
  </div>;
}
