import Link from "next/link";
import type { ReactNode } from "react";

type LegalLink = {
  href: string;
  label: string;
};

type LegalPageLayoutProps = {
  title: string;
  children: ReactNode;
};

const legalLinks: LegalLink[] = [
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/terms", label: "利用規約" },
  { href: "/contact", label: "お問い合わせ" },
  { href: "/commerce", label: "特定商取引法に基づく表記" }
];

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <main className="page-shell page-home">
      <div className="title-panel">{title}</div>

      <section className="card decorated-card legal-card">
        <nav className="legal-nav" aria-label="法務ページ">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="ui-link-button settings-menu-button settings-menu-button-neutral">
              {link.label}
            </Link>
          ))}
        </nav>

        {children}

        <div className="legal-actions">
          <Link href="/settings" className="ui-link-button settings-menu-button settings-menu-button-secondary">
            設定へ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
