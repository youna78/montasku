"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_ICON_BY_KEY } from "@/lib/game/assets";

const items = [
  { href: "/home", label: "ホーム", iconKey: "home" },
  { href: "/tasks", label: "タスク", iconKey: "tasks" },
  { href: "/dex", label: "図鑑", iconKey: "dex" },
  { href: "/settings", label: "設定", iconKey: "settings" }
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? "active" : ""}>
          <img src={TAB_ICON_BY_KEY[item.iconKey]} alt={item.label} className="tab-icon" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
