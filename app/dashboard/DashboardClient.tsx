"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const stats = [
  { label: "Matches found",   value: "—",  icon: "🤝" },
  { label: "Sessions planned", value: "—",  icon: "📅" },
  { label: "Goals set",        value: "—",  icon: "🎯" },
];

const suggestedPartners = [
  { initials: "AK", name: "Aisha Khan",    course: "Data Structures",      bg: "#dbeafe", fg: "#1d4ed8" },
  { initials: "MR", name: "Marco Rivera",  course: "Algorithms",            bg: "#fef3c7", fg: "#d97706" },
  { initials: "SP", name: "Sara Park",     course: "Machine Learning",      bg: "#ede9fe", fg: "#7c3aed" },
];

export function DashboardClient({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "there";

  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-page)" }}
    >
      {/* ── Top nav ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-sm"
        style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-nav)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 border border-indigo-200">
              <svg width="16" height="13" viewBox="0 0 26 22" fill="none">
                <path d="M1 17C1 9.268 6.373 3 13 3C19.627 3 25 9.268 25 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>
                <path d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text-heading)" }}>
              Partner<span className="text-indigo-500">Matcher</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: "#eef2ff", color: "#4338ca" }}
            >
              {initials}
            </div>
            <span className="hidden text-sm font-medium sm:block" style={{ color: "var(--text-sub)" }}>
              {displayName}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:shadow-sm"
              style={{
                backgroundColor: "var(--bg-btn-outline)",
                borderColor: "var(--border-btn-outline)",
                color: "var(--text-btn-outline)",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">

        {/* ── Welcome ──────────────────────────────────────── */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-heading)" }}>
            Welcome, {displayName.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Here&apos;s your study partner overview.
          </p>
        </div>

        {/* ── Stats row ────────────────────────────────────── */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border p-5"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <span className="text-xl">{s.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-bold" style={{ color: "var(--text-heading)" }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Profile card ─────────────────────────────── */}
          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
          >
            <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Your profile</h2>

            <div className="flex flex-col items-center gap-3 py-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
                style={{ backgroundColor: "#eef2ff", color: "#4338ca" }}
              >
                {initials}
              </div>
              <div className="text-center">
                <p className="font-semibold" style={{ color: "var(--text-heading)" }}>{displayName}</p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</p>
              </div>
            </div>

            <div
              className="mt-3 rounded-xl border p-3 text-center text-xs"
              style={{ backgroundColor: "var(--bg-row)", borderColor: "var(--border-row)", color: "var(--text-muted)" }}
            >
              Complete your profile to get better matches
            </div>

            <button
              className="btn-glow mt-4 w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
              style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
            >
              Edit profile
            </button>
          </div>

          {/* ── Suggested partners ───────────────────────── */}
          <div
            className="rounded-2xl border p-6 lg:col-span-2"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>Suggested partners</h2>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: "var(--bg-tag)", color: "var(--text-tag)" }}
              >
                Demo
              </span>
            </div>

            <div className="space-y-3">
              {suggestedPartners.map((p) => (
                <div
                  key={p.initials}
                  className="flex items-center gap-4 rounded-xl border p-3.5 transition-all hover:-translate-y-px hover:shadow-sm cursor-pointer"
                  style={{ backgroundColor: "var(--bg-row)", borderColor: "var(--border-row)" }}
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ backgroundColor: p.bg, color: p.fg }}
                  >
                    {p.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--text-sub)" }}>{p.name}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{p.course}</p>
                  </div>
                  <button className="flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:shadow-sm"
                    style={{ backgroundColor: "var(--bg-btn-outline)", borderColor: "var(--border-btn-outline)", color: "var(--text-btn-outline)" }}
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
              Set your learning goals to see real matches →
            </p>
          </div>
        </div>

        {/* ── Quick actions ────────────────────────────────── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: "🎯", title: "Set goals",       desc: "Define what you want to study" },
            { icon: "🔍", title: "Browse partners", desc: "Explore students near you"     },
            { icon: "💬", title: "Messages",         desc: "Chat with your connections"    },
          ].map((action) => (
            <button
              key={action.title}
              className="rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ backgroundColor: "var(--bg-step)", borderColor: "var(--border-step)" }}
            >
              <span className="text-2xl">{action.icon}</span>
              <p className="mt-3 font-semibold text-sm" style={{ color: "var(--text-heading)" }}>{action.title}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{action.desc}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
