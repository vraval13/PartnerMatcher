"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" />
          <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h7" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const pathname = usePathname();

  const navigationItems = [
    { label: "Dashboard", href: "/dashboard", icon: "home" },
    { label: "Study Partners", href: "/partners", icon: "users" },
    { label: "Requests", href: "/requests", icon: "inbox" },
    { label: "My Courses", href: "/profile/courses", icon: "book" },
    { label: "Settings", href: "/profile", icon: "settings" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 border-r p-6 overflow-y-auto"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-card)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2.5 flex-shrink-0 ml-3">
        <svg
          width="26"
          height="22"
          viewBox="0 0 26 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 17C1 9.268 6.373 3 13 3C19.627 3 25 9.268 25 17"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.35"
          />
        </svg>
        <span
          className="text-[16px] font-bold tracking-tight"
          style={{ color: "var(--text-heading)" }}
        >
          Partner<span className="text-indigo-500">Matcher</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="space-y-2 mb-8">
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
              style={{
                backgroundColor: active ? "var(--bg-hover)" : "transparent",
                color: active ? "var(--text-heading)" : "var(--text-muted)",
              }}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mb-6 h-px" style={{ backgroundColor: "var(--border-card)" }} />

      {/* Sign out */}
      <button
        onClick={onSignOut}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
        style={{
          color: "var(--text-muted)",
        }}
      >
        <Icon name="logout" size={18} />
        Sign out
      </button>
    </aside>
  );
}
