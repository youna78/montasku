"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { TaskCategory, TaskMaster } from "@/types/master";
import { CUSTOM_TASK_IDS } from "@/lib/game/customTasks";
import { isHandleTaskReorderEnabled } from "@/lib/game/taskEditingUi";

const TASK_CATEGORY_ORDER: TaskCategory[] = ["生活", "健康", "成長", "メンタル", "創作"];
const TASK_CATEGORY_ICONS: Record<TaskCategory, string> = {
  "生活": "/img/icon/sfc/sfc_home_01.png",
  "健康": "/img/icon/icon_attr_heal_01.png",
  "成長": "/img/icon/icon_attr_knowledge_01.png",
  "メンタル": "/img/icon/sfc/sfc_flower_01.png",
  "創作": "/img/icon/icon_attr_create_01.png"
};

type Props = {
  tasks: TaskMaster[];
  activeTasks: TaskMaster[];
  completedIds: number[];
  onComplete: (id: number) => void;
  onAdd: (id: number) => { added: boolean } | null;
  onRemove: (id: number) => { removed: boolean } | null;
  onMove: (id: number, direction: "up" | "down") => unknown;
  onMoveTo: (id: number, index: number) => unknown;
  onSaveCustom: (id: number, name: string) => boolean;
};

type DragPreview = {
  top: number;
  left: number;
  width: number;
};

export function EditableTaskBoard({tasks, activeTasks, completedIds, onComplete, onAdd, onRemove, onMove, onMoveTo, onSaveCustom}: Props) {
  const handleOnly = isHandleTaskReorderEnabled();
  const [draftTasks, setDraftTasks] = useState<TaskMaster[] | null>(null);
  const lastScrollTime = useRef<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [names, setNames] = useState<Record<number, string>>({});
  const board = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef({x: 0, y: 0});
  const dragPointerOffsetY = useRef(0);
  const dragPreviewElement = useRef<HTMLDivElement>(null);
  const dragPreviewStartTop = useRef(0);
  const dragPreviewLiftY = useRef(0);
  const dragPointerPosition = useRef({x: 0, y: 0});
  const autoScrollFrame = useRef<number | null>(null);
  const draggingRef = useRef<number | null>(null);
  const capturedPointer = useRef<{ element: HTMLElement; id: number } | null>(null);
  const order = useRef(activeTasks);
  const cancelHold = () => { if (hold.current) clearTimeout(hold.current); hold.current = null; };
  useEffect(() => {
    document.documentElement.classList.toggle("task-drag-scroll", handleOnly && dragging !== null);
    return () => document.documentElement.classList.remove("task-drag-scroll");
  }, [handleOnly, dragging]);
  useEffect(() => () => {
    cancelHold();
    if (autoScrollFrame.current !== null) cancelAnimationFrame(autoScrollFrame.current);
  }, []);
  useEffect(() => { if (draggingRef.current === null) order.current = activeTasks; }, [activeTasks]);
  useEffect(() => {
    const root = board.current;
    document.documentElement.classList.toggle("task-reorder-active", editing);
    if (!editing || !root || handleOnly) {
      return () => document.documentElement.classList.remove("task-reorder-active");
    }

    const preventNativeLongPress = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".task-row-editable") && !target.closest("button")) {
        event.preventDefault();
      }
    };
    const preventContextMenu = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".task-row-editable")) event.preventDefault();
    };

    root.addEventListener("touchstart", preventNativeLongPress, { passive: false });
    root.addEventListener("touchmove", preventNativeLongPress, { passive: false });
    root.addEventListener("contextmenu", preventContextMenu, true);
    return () => {
      document.documentElement.classList.remove("task-reorder-active");
      root.removeEventListener("touchstart", preventNativeLongPress);
      root.removeEventListener("touchmove", preventNativeLongPress);
      root.removeEventListener("contextmenu", preventContextMenu, true);
    };
  }, [editing, handleOnly]);
  useEffect(() => {
    if (window.location.hash === "#task-add-custom") setAdding(true);
  }, []);
  useEffect(() => {
    if (!adding) {
      dialog.current?.close();
      return;
    }
    dialog.current?.showModal();
    if (window.location.hash === "#task-add-custom") {
      window.requestAnimationFrame(() => scrollToAddSection("task-add-custom"));
    }
  }, [adding]);
  const add = (id: number) => {
    if (activeTasks.length >= 15) {
      setLimitReached(true);
      return;
    }
    const result = onAdd(id);
    if (result?.added) {
      setMessage("タスクを追加しました");
      if (activeTasks.length + 1 >= 15) setLimitReached(true);
      return;
    }
    setMessage("タスクを追加できませんでした");
  };
  const closeAddDialog = () => {
    setLimitReached(false);
    setAdding(false);
    if (window.location.hash === "#task-add-custom") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };
  const openEditingFromLimit = () => {
    setLimitReached(false);
    setAdding(false);
    setEditing(true);
    setMessage("編集モードです。×でタスクを外すと、新しいタスクを追加できます。");
  };
  const moveTowardPointer = (id: number, target: number, pointerY: number, targetElement: HTMLElement) => {
    const ids = order.current.map(task => task.taskId);
    const from = ids.indexOf(id), to = ids.indexOf(target);
    if (from < 0 || to < 0 || from === to) return;
    const targetRect = targetElement.getBoundingClientRect();
    const targetCenter = targetRect.top + targetRect.height / 2;
    const direction = to < from ? "up" : "down";
    const desiredIndex = direction === "up"
      ? (pointerY < targetCenter ? to : to + 1)
      : (pointerY > targetCenter ? to : to - 1);
    const moveCount = Math.abs(desiredIndex - from);
    for (let step = 0; step < moveCount; step += 1) {
      const currentIndex = order.current.findIndex(task => task.taskId === id);
      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= order.current.length) break;
      const nextOrder = [...order.current];
      [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
      order.current = nextOrder;
      if (!handleOnly) onMove(id, direction);
    }
    if (handleOnly && moveCount > 0) setDraftTasks(order.current);
  };
  const stopAutoScroll = () => {
    if (autoScrollFrame.current !== null) cancelAnimationFrame(autoScrollFrame.current);
    autoScrollFrame.current = null;
    lastScrollTime.current = null;
  };
  const moveAtPointer = (id: number, x: number, y: number) => {
    if (!handleOnly) {
      const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-task-id]");
      if (target) moveTowardPointer(id, Number(target.dataset.taskId), y, target);
      return;
    }
    // Use vertical row geometry, including gaps; the finger may cover the
    // navigation or leave the narrow handle column during a vertical drag.
    const rows = Array.from(board.current?.querySelectorAll<HTMLElement>("[data-task-id]") ?? []);
    let nearest: HTMLElement | undefined;
    let distance = Infinity;
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const nextDistance = Math.abs(y - (rect.top + rect.height / 2));
      if (nextDistance < distance) { nearest = row; distance = nextDistance; }
    }
    if (nearest) moveTowardPointer(id, Number(nearest.dataset.taskId), y, nearest);
  };
  const runAutoScroll = (timestamp: number) => {
    if (draggingRef.current === null) {
      stopAutoScroll();
      return;
    }
    const elapsed = lastScrollTime.current === null ? 16.67 : Math.min(32, timestamp - lastScrollTime.current);
    lastScrollTime.current = timestamp;
    const {x, y} = dragPointerPosition.current;
    const summaryBottom = handleOnly ? document.querySelector(".page-tasks .screen-summary-card")?.getBoundingClientRect().bottom : undefined;
    const topEdge = summaryBottom === undefined ? 100 : Math.max(60, summaryBottom + 72);
    const navTop = handleOnly ? document.querySelector(".bottom-nav")?.getBoundingClientRect().top : undefined;
    const bottomEdge = navTop === undefined ? window.innerHeight - 110 : Math.min(window.innerHeight, navTop) - 96;
    const speed = y < topEdge
      ? -Math.min(16, Math.max(3, (topEdge - y) / 5))
      : y > bottomEdge
        ? Math.min(16, Math.max(3, (y - bottomEdge) / 5))
        : 0;
    if (speed !== 0) {
      window.scrollBy({ top: handleOnly ? speed * elapsed / 16.67 : speed, behavior: "instant" });
      moveAtPointer(draggingRef.current, x, y);
    }
    autoScrollFrame.current = requestAnimationFrame(runAutoScroll);
  };
  const beginDrag = (id: number, element: HTMLElement, pointerId: number, pointerY: number, captureElement = element) => {
    if (draggingRef.current !== null) return;
    cancelHold();
    order.current = activeTasks;
    if (handleOnly) setDraftTasks(activeTasks);
    captureElement.setPointerCapture(pointerId);
    capturedPointer.current = { element: captureElement, id: pointerId };
    const rect = element.getBoundingClientRect();
    const liftY = handleOnly ? 0 : Math.min(58, Math.max(0, rect.top - 8));
    dragPointerOffsetY.current = pointerY - rect.top;
    dragPreviewLiftY.current = liftY;
    dragPreviewStartTop.current = rect.top - liftY;
    dragPointerPosition.current = {x: rect.left + rect.width / 2, y: pointerY};
    draggingRef.current = id;
    setDragging(id);
    setDragPreview({ top: rect.top - liftY, left: rect.left, width: rect.width });
    stopAutoScroll();
    autoScrollFrame.current = requestAnimationFrame(runAutoScroll);
  };
  const moveDrag = (id: number, event: ReactPointerEvent<HTMLElement>) => {
    if (draggingRef.current !== id || capturedPointer.current?.id !== event.pointerId) return;
    dragPointerPosition.current = {x: event.clientX, y: event.clientY};
    const previewY = event.clientY - dragPointerOffsetY.current - dragPreviewLiftY.current - dragPreviewStartTop.current;
    if (dragPreviewElement.current) {
      dragPreviewElement.current.style.transform = `translate3d(0, ${previewY}px, 0) scale(1.015)`;
    }
    moveAtPointer(id, event.clientX, event.clientY);
  };
  const endDrag = (commit = true) => {
    const draggedId = draggingRef.current;
    const completedDrag = draggedId !== null;
    if (handleOnly && draggedId !== null && commit) {
      const index = order.current.findIndex(task => task.taskId === draggedId);
      if (index !== activeTasks.findIndex(task => task.taskId === draggedId)) onMoveTo(draggedId, index);
    }
    cancelHold();
    stopAutoScroll();
    draggingRef.current = null;
    const captured = capturedPointer.current;
    capturedPointer.current = null;
    if (captured?.element.hasPointerCapture(captured.id)) captured.element.releasePointerCapture(captured.id);
    setDragging(null);
    setDragPreview(null);
    setDraftTasks(null);
    order.current = activeTasks;
    if (completedDrag) setMessage(commit ? "並び順を保存しました" : "移動を取り消しました");
  };
  const availableTasks = tasks.filter(task => !CUSTOM_TASK_IDS.some(id => id === task.taskId) && !activeTasks.some(active => active.taskId === task.taskId));
  const availableCategories = TASK_CATEGORY_ORDER.filter(category => availableTasks.some(task => task.category === category));
  const scrollToAddSection = (sectionId: string) => {
    dialog.current?.querySelector<HTMLElement>(`#${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return <section ref={board}
    onPointerMove={event => { if (handleOnly && draggingRef.current !== null) { event.preventDefault(); moveDrag(draggingRef.current, event); } }}
    onPointerUp={event => { if (handleOnly && capturedPointer.current?.id === event.pointerId) endDrag(); }}
    onPointerCancel={event => { if (handleOnly && capturedPointer.current?.id === event.pointerId) endDrag(false); }}
    onLostPointerCapture={event => { if (handleOnly && capturedPointer.current?.id === event.pointerId) endDrag(false); }}
    onKeyDown={event => { if (handleOnly && event.key === "Escape" && draggingRef.current !== null) { event.preventDefault(); endDrag(false); } }}
    className={`card decorated-card task-board-card task-edit-board ${handleOnly ? "task-handle-reorder" : ""} ${editing ? "task-edit-mode" : ""} ${dragging !== null ? "task-is-dragging" : ""}`}>
    <div className="task-edit-toolbar"><h2 className="screen-section-title">クエスト一覧</h2><button className="quest-btn" onClick={() => setEditing(!editing)}>{editing ? "完了" : "編集"}</button><button className="quest-btn quest-btn-primary" aria-label="タスクを追加" onClick={() => {setLimitReached(false); setAdding(true); setMessage("");}}>＋</button></div>
    <p className="task-edit-hint"><span className="task-edit-hint-icon" aria-hidden="true">?</span><span>{editing ? (handleOnly ? "カードはスワイプでスクロール。「移動」をつかんで上下に並び替え、×で一覧から外せます。" : "カードを長押ししてドラッグ。≡でも並び替え、×で一覧から外せます。") : "「編集」を押すと、タスクの並び替え・削除ができます。"}</span></p>
    <p role="status" className="task-edit-hint">{message}</p>
    <ul className="quest-list">{(draftTasks ?? activeTasks).map((task) => {
      const completed = completedIds.includes(task.taskId);
      return <li key={task.taskId} data-task-id={task.taskId} className={`quest-item task-row-rpg ${editing ? "task-row-editable" : ""} ${completed ? "task-row-completed" : ""} ${dragging === task.taskId ? "task-row-dragging" : ""}`}
        onContextMenu={event => event.preventDefault()}
        onDragStart={event => event.preventDefault()}
        onPointerDown={event => {
          if (handleOnly || !editing || !event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
          event.preventDefault();
          origin.current = {x: event.clientX, y: event.clientY};
          const element = event.currentTarget;
          const pointerId = event.pointerId;
          cancelHold();
          hold.current = setTimeout(() => {
            beginDrag(task.taskId, element, pointerId, origin.current.y);
            setMessage("そのまま上下に動かして並び替えできます");
          }, 250);
        }}
        onPointerMove={event => {
          if (handleOnly) return;
          if (draggingRef.current === task.taskId) {
            event.preventDefault();
            moveDrag(task.taskId, event);
          }
          else if (Math.hypot(event.clientX-origin.current.x, event.clientY-origin.current.y)>10) cancelHold();
        }}
        onPointerUp={() => { if (!handleOnly) endDrag(); }} onPointerCancel={() => { if (!handleOnly) endDrag(); }}>
        <div className="task-row-main"><div><div className="task-row-title">{task.name}</div><small>EXP +{task.baseExp} · コイン +2</small><small className="task-edit-attributes">Power {task.power} · Heal {task.heal}<br />Knowledge {task.knowledge} · Create {task.create}</small></div></div>
        {editing ? <div className="task-edit-controls"><button className="task-drag-handle" aria-label={`${task.name}を並び替え`} title={handleOnly ? "つかんで上下に移動（キーボードは↑↓）" : undefined}
          onKeyDown={event => {
            if (!handleOnly || draggingRef.current !== null || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            onMove(task.taskId, event.key === "ArrowUp" ? "up" : "down");
          }}
          onPointerDown={event => {if (!event.isPrimary || event.button !== 0) return; event.preventDefault(); event.stopPropagation(); const card = event.currentTarget.closest<HTMLElement>("[data-task-id]"); if (card) beginDrag(task.taskId, card, event.pointerId, event.clientY, handleOnly ? board.current ?? card : card);}}
          onPointerMove={event => {event.stopPropagation(); moveDrag(task.taskId, event);}} onPointerUp={event => {event.stopPropagation(); if (capturedPointer.current?.id === event.pointerId) endDrag();}} onPointerCancel={event => {event.stopPropagation(); if (capturedPointer.current?.id === event.pointerId) endDrag();}}
          onLostPointerCapture={event => {if (capturedPointer.current?.id === event.pointerId) endDrag();}}>{handleOnly ? <><img src="/img/icon/task_reorder_vertical.svg" alt="" draggable={false} /><span>移動</span></> : "≡"}</button><button className="task-remove-cross" aria-label={`${task.name}を削除`} onClick={() => setMessage(onRemove(task.taskId)?.removed ? "一覧から外しました。＋から再追加できます。" : "タスクは3件以上残してください。")}>×</button></div>
          : <button className="quest-btn quest-btn-primary" disabled={completed} onClick={() => onComplete(task.taskId)}>{completed ? "達成済み" : "達成"}</button>}
      </li>;
    })}</ul>
    {dragging !== null && dragPreview && (() => {
      const task = activeTasks.find((item) => item.taskId === dragging);
      if (!task) return null;
      return createPortal(<div
        ref={dragPreviewElement}
        className="quest-item task-row-rpg task-drag-preview"
        style={{ top: dragPreview.top, left: dragPreview.left, width: dragPreview.width }}
        aria-hidden="true"
      >
        <div className="task-row-main"><div><div className="task-row-title">{task.name}</div><small>EXP +{task.baseExp} · コイン +2</small><small className="task-edit-attributes">Power {task.power} · Heal {task.heal}<br />Knowledge {task.knowledge} · Create {task.create}</small></div></div>
        <span className="task-drag-preview-handle">{handleOnly ? <img src="/img/icon/task_reorder_vertical.svg" width="32" height="32" alt="" /> : "≡"}</span>
      </div>, document.body);
    })()}
    <dialog ref={dialog} className="task-add-dialog" aria-label="タスクを追加" onCancel={closeAddDialog}>
      <div className="task-edit-toolbar"><h2>タスクを追加</h2><button className="quest-btn" onClick={closeAddDialog}>閉じる</button></div>
      <p>登録 {activeTasks.length}/15件 · 各タスクは1日1回</p>
      <p className="task-add-guide">追加したいタスクを「追加」ボタンで追加してね。</p>
      <nav className="task-add-category-nav" aria-label="タスクカテゴリー">
        {availableCategories.map(category => <button type="button" key={category} onClick={() => scrollToAddSection(`task-add-${category}`)}><img src={TASK_CATEGORY_ICONS[category]} alt="" /><span>{category}</span></button>)}
        <button type="button" onClick={() => scrollToAddSection("task-add-custom")}><img src="/img/icon/sfc/sfc_task_01.png" alt="" /><span>自由記述</span></button>
      </nav>
      <p role="status">{message}</p>
      <h3>未登録のタスク</h3>
      {availableCategories.map(category => <section className="task-add-category-section" key={category} aria-labelledby={`task-add-${category}`}>
        <h4 id={`task-add-${category}`}>{category}</h4>
        <ul className="quest-list">{availableTasks.filter(task => task.category === category).map(task => <li className="quest-item" key={task.taskId}><span>{task.name}<small> EXP +{task.baseExp}</small></span><button className="quest-btn" onClick={() => add(task.taskId)}>追加</button></li>)}</ul>
      </section>)}
      <h3 id="task-add-custom" className="task-add-section-anchor">自由記述のタスク（3枠）</h3><p>一覧にないタスクを3つまで登録できます。各枠 EXP＋2・コイン＋2、属性は増えません。</p>
      {CUSTOM_TASK_IDS.map((id, index) => {
        const saved = tasks.find(task => task.taskId === id);
        const active = activeTasks.some(task => task.taskId === id);
        return <form key={id} className="custom-task-slot" onSubmit={event => {event.preventDefault(); if (onSaveCustom(id, names[id] ?? saved?.name ?? "")) {if (!active) add(id); else setMessage("タスク名を保存しました");}}}>
          <label htmlFor={`custom-${id}`}>自由記述 {index + 1}</label><input id={`custom-${id}`} required maxLength={40} placeholder="例：植物に水をあげる" value={names[id] ?? saved?.name ?? ""} onChange={event => setNames({...names, [id]: event.target.value})} /><button className="quest-btn" type="submit">名前を保存して追加</button>
        </form>;
      })}
      <div className="task-add-dialog-footer">
        <button type="button" className="quest-btn" onClick={closeAddDialog}>閉じる</button>
      </div>
      {limitReached && <div className="task-limit-popup" role="presentation">
        <section className="task-limit-popup-panel" role="dialog" aria-modal="true" aria-labelledby="task-limit-title">
          <h3 id="task-limit-title">タスクを最大数設置しました。</h3>
          <p>再度追加するには、設置したタスクの削除が必要です。</p>
          <div className="task-limit-popup-actions">
            <button type="button" className="quest-btn" onClick={() => setLimitReached(false)}>閉じる</button>
            <button type="button" className="quest-btn quest-btn-primary" onClick={openEditingFromLimit}>編集画面へ</button>
          </div>
        </section>
      </div>}
    </dialog>
  </section>;
}
