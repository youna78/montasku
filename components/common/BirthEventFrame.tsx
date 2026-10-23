import type { ReactNode } from "react";
import { preload } from "react-dom";

/** Keep the title, card and backdrop identical during every birth phase. */
export function BirthEventFrame({ children, footer, busy = false }: {
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
}) {
  preload("/img/background/bg_birth_event_01.png", { as: "image" });
  return (
    <main className="page-shell page-birth">
      <div className="title-panel">誕生イベント</div>
      <section className="card decorated-card birth-event-card" aria-busy={busy}>
        {children}
      </section>
      {footer}
    </main>
  );
}
