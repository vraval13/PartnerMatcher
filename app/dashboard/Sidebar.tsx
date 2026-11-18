"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { useTheme } from "@/app/components/ThemeProvider";

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
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
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
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42m11.3 11.3 1.42 1.42M3 12h2m16 0h2M4.22 19.78l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6.5 6.5 0 0 0 8.268 8.268c.344-.215.825-.003.803.401" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  const navigationItems = [
    { label: "Dashboard", href: "/dashboard", icon: "home" },
    { label: "Study Partners", href: "/partners", icon: "users" },
    { label: "Availability", href: "/availability", icon: "clock" },
    { label: "Requests", href: "/requests", icon: "inbox" },
    { label: "My Courses", href: "/profile/courses", icon: "book" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const displayName = String(
    user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split("@")[0] ??
      "Student"
  );

  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 border-r flex flex-col"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-card)",
      }}
    >
      {/* ── Top: Logo + Nav ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center gap-2.5 flex-shrink-0 ml-1">
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
              stroke="var(--brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17"
              stroke="var(--brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.65"
            />
            <path
              d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17"
              stroke="var(--brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.35"
            />
          </svg>
          <span
            className="text-[16px] font-bold tracking-tight"
            style={{ color: "var(--text-heading)" }}
          >
            Partner<span style={{ color: "var(--brand)" }}>Matcher</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
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
      </div>

      {/* ── Bottom: Profile · Theme · Sign out ── */}
      <div
        className="shrink-0 border-t px-4 py-4 space-y-1"
        style={{ borderColor: "var(--border-card)" }}
      >
        {/* Profile row */}
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
          style={{
            backgroundColor: isActive("/profile") ? "var(--bg-hover)" : "transparent",
            color: isActive("/profile") ? "var(--text-heading)" : "var(--text-muted)",
          }}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
            style={{ backgroundColor: "var(--brand-soft-bg)", color: "var(--brand-strong)" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p
              className="truncate text-sm font-semibold leading-tight"
              style={{ color: "var(--text-heading)" }}
            >
              {displayName}
            </p>
            <p
              className="truncate text-xs leading-tight mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              View profile
            </p>
          </div>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <Icon name="logout" size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
