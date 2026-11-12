"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/app/components/ThemeProvider";

type ProfileSummary = {
  university: string | null;
  major: string | null;
  year_of_study: number | null;
  study_style: string | null;
  comm_pref: string | null;
  timezone: string | null;
};

type ConnectionRow = {
  id: string;
  requester_id: string;
  session_topic: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  message: string | null;
  created_at: string;
};

const yearLabels = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Graduate", "PhD"];

const readable = (value: string | null | undefined) =>
  value ? value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Not set";

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
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      );

    case "moon":
      return (
        <svg {...common}>
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
        </svg>
      );

    case "school":
      return (
        <svg {...common}>
          <path d="m3 10 9-5 9 5-9 5-9-5Z" />
          <path d="M7 12.5v4c3 2 7 2 10 0v-4M21 10v6" />
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

    case "edit":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z" />
        </svg>
      );

    case "message":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-4.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 4H13a8.5 8.5 0 0 1 8 7.5Z" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "inbox":
      return (
        <svg {...common}>
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );

    default:
      return null;
  }
}

export function DashboardClient({
  user,
  profile,
  courseCount,
  availabilityCount,
  pendingRequests,
}: {
  user: User;
  profile: ProfileSummary | null;
  courseCount: number;
  availabilityCount: number;
  pendingRequests: ConnectionRow[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

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

  const cardStyle = {
    backgroundColor: "var(--bg-card)",
    borderColor: "var(--border-card)",
  };

  const secondaryText = { color: "var(--text-muted)" };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg-page)",
        color: "var(--text-page)",
      }}
    >
      {/* Navigation */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          backgroundColor: "var(--bg-nav)",
          borderColor: "var(--border-nav)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Icon name="users" size={19} />
            </div>

            <span
              className="text-base font-bold tracking-tight"
              style={{ color: "var(--text-heading)" }}
            >
              PartnerMatcher
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
              title={`Switch to ${dark ? "light" : "dark"} mode`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border transition hover:opacity-70"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-card)",
                color: "var(--text-heading)",
              }}
            >
              <Icon name={dark ? "sun" : "moon"} size={19} />
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-white">
              {initials}
            </div>

            <span
              className="hidden max-w-32 truncate text-sm font-medium sm:block"
              style={{ color: "var(--text-sub)" }}
            >
              {displayName}
            </span>

            <button
              onClick={handleSignOut}
              className="rounded-xl border px-4 py-2 text-xs font-semibold transition hover:opacity-70"
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

      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
        {/* Welcome */}
        <section className="mb-9">
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-[0.16em]"
            style={secondaryText}
          >
            Student workspace
          </p>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ color: "var(--text-heading)" }}
              >
                Welcome back, {displayName.split(" ")[0]}.
              </h1>

              <p className="mt-2 text-sm sm:text-base" style={secondaryText}>
                Your space to connect, collaborate and study together.
              </p>
            </div>

            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 dark:bg-white dark:text-slate-900"
            >
              <Icon name="edit" size={16} />
              Edit profile
            </Link>
          </div>
        </section>

        {/* Overview cards */}
        <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border p-5 sm:p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={secondaryText}>
                Courses added
              </span>

              <div
                className="rounded-xl p-2.5"
                style={{
                  backgroundColor: "var(--bg-row)",
                  color: "var(--text-heading)",
                }}
              >
                <Icon name="book" />
              </div>
            </div>

            <p
              className="mt-5 text-3xl font-bold tracking-tight"
              style={{ color: "var(--text-heading)" }}
            >
              {courseCount}
            </p>

            <Link
              href="/profile/courses"
              className="mt-2 inline-block text-xs font-semibold underline-offset-4 hover:underline"
              style={{ color: "var(--text-sub)" }}
            >
              Manage courses →
            </Link>
          </div>

          <div className="rounded-2xl border p-5 sm:p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={secondaryText}>
                University
              </span>

              <div
                className="rounded-xl p-2.5"
                style={{
                  backgroundColor: "var(--bg-row)",
                  color: "var(--text-heading)",
                }}
              >
                <Icon name="school" />
              </div>
            </div>

            <p className="mt-5 truncate text-lg font-bold" style={{ color: "var(--text-heading)" }}>
              {profile?.university || "Not set"}
            </p>

            <p className="mt-2 text-xs" style={secondaryText}>
              Your academic community
            </p>
          </div>

          <div className="rounded-2xl border p-5 sm:p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={secondaryText}>
                Study level
              </span>

              <div
                className="rounded-xl p-2.5"
                style={{
                  backgroundColor: "var(--bg-row)",
                  color: "var(--text-heading)",
                }}
              >
                <Icon name="users" />
              </div>
            </div>

            <p className="mt-5 text-lg font-bold" style={{ color: "var(--text-heading)" }}>
              {profile?.year_of_study
                ? (yearLabels[profile.year_of_study - 1] ?? "Not set")
                : "Not set"}
            </p>

            <p className="mt-2 text-xs" style={secondaryText}>
              {profile?.major || "Programme not set"}
            </p>
          </div>

          <div className="rounded-2xl border p-5 sm:p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={secondaryText}>
                Availability
              </span>

              <div
                className="rounded-xl p-2.5"
                style={{
                  backgroundColor: "var(--bg-row)",
                  color: "var(--text-heading)",
                }}
              >
                <Icon name="clock" />
              </div>
            </div>

            <p
              className="mt-5 text-3xl font-bold tracking-tight"
              style={{ color: "var(--text-heading)" }}
            >
              {availabilityCount}
            </p>

            <Link
              href="/availability"
              className="mt-2 inline-block text-xs font-semibold underline-offset-4 hover:underline"
              style={{ color: "var(--text-sub)" }}
            >
              {availabilityCount ? "Manage availability →" : "Set availability →"}
            </Link>
          </div>
        </section>

        {/* Main content */}
        <section className="grid gap-6 lg:grid-cols-5">
          {/* Student profile */}
          <div className="rounded-2xl border p-6 lg:col-span-2" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
                Your academic profile
              </h2>

              <Link
                href="/profile"
                className="text-xs font-semibold underline-offset-4 hover:underline"
                style={{ color: "var(--text-sub)" }}
              >
                Edit →
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white dark:bg-white dark:text-slate-900">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold" style={{ color: "var(--text-heading)" }}>
                  {displayName}
                </p>

                <p className="mt-1 truncate text-xs" style={secondaryText}>
                  {user.email}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {[
                ["University", profile?.university || "Not set"],
                ["Programme", profile?.major || "Not set"],
                [
                  "Year",
                  profile?.year_of_study
                    ? (yearLabels[profile.year_of_study - 1] ?? "Not set")
                    : "Not set",
                ],
                ["Study style", readable(profile?.study_style)],
                ["Communication", readable(profile?.comm_pref)],
                ["Timezone", profile?.timezone || "Not set"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
                  style={{ borderColor: "var(--border-row)" }}
                >
                  <span className="text-xs" style={secondaryText}>
                    {label}
                  </span>

                  <span
                    className="max-w-[60%] text-right text-xs font-semibold"
                    style={{ color: "var(--text-sub)" }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested partners */}
          <div
            className="flex min-h-[380px] flex-col rounded-2xl border p-6 lg:col-span-3"
            style={cardStyle}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
                  Suggested study partners
                </h2>

                <p className="mt-1 text-xs" style={secondaryText}>
                  Students with similar academic interests
                </p>
              </div>

              <div
                className="rounded-xl p-2.5"
                style={{
                  backgroundColor: "var(--bg-row)",
                  color: "var(--text-heading)",
                }}
              >
                <Icon name="users" />
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: "var(--bg-row)",
                  color: "var(--text-heading)",
                }}
              >
                <Icon name="users" size={27} />
              </div>

              <h3 className="mt-5 text-base font-bold" style={{ color: "var(--text-heading)" }}>
                Find your next study partner
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6" style={secondaryText}>
                Create a course or assignment goal and add your availability to find compatible
                study partners.
              </p>

              <Link
                href="/partners"
                className="mt-5 rounded-xl border px-5 py-2.5 text-xs font-semibold transition hover:opacity-70"
                style={{
                  backgroundColor: "var(--bg-btn-outline)",
                  borderColor: "var(--border-btn-outline)",
                  color: "var(--text-btn-outline)",
                }}
              >
                Find partners
              </Link>
            </div>
          </div>
        </section>

        {/* Connection Requests */}
        <section className="mt-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
                Connection Requests
              </h2>
              {pendingRequests.length > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: "var(--text-heading)" }}
                >
                  {pendingRequests.length}
                </span>
              )}
            </div>
            <p className="text-xs" style={secondaryText}>
              Incoming study session proposals
            </p>
          </div>

          <div className="rounded-2xl border" style={cardStyle}>
            {pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "var(--bg-row)", color: "var(--text-heading)" }}
                >
                  <Icon name="inbox" size={24} />
                </div>
                <h3 className="mt-4 text-sm font-bold" style={{ color: "var(--text-heading)" }}>
                  No pending requests
                </h3>
                <p className="mt-1 max-w-xs text-xs leading-5" style={secondaryText}>
                  When another student sends you a connection request it will appear here.
                </p>
              </div>
            ) : (
              <ul role="list">
                {pendingRequests.map((req) => {
                  const startDate = req.proposed_start ? new Date(req.proposed_start) : null;
                  const endDate = req.proposed_end ? new Date(req.proposed_end) : null;
                  const timeWindow =
                    startDate && endDate
                      ? `${startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${startDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} – ${endDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
                      : null;
                  const receivedOn = new Date(req.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <li
                      key={req.id}
                      className="flex items-start gap-4 border-b p-5 last:border-0"
                      style={{ borderColor: "var(--border-row)" }}
                    >
                      <div
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: "var(--bg-row)", color: "var(--text-heading)" }}
                      >
                        <Icon name="message" size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>
                            {req.session_topic || "Study session"}
                          </p>
                          <span
                            className="rounded-full border px-2 py-0.5 text-xs font-medium"
                            style={{
                              borderColor: "var(--border-card)",
                              color: "var(--text-muted)",
                            }}
                          >
                            pending
                          </span>
                        </div>
                        {timeWindow && (
                          <p className="mt-1 text-xs" style={secondaryText}>
                            {timeWindow}
                          </p>
                        )}
                        {req.message && (
                          <p className="mt-1 line-clamp-2 text-xs italic" style={secondaryText}>
                            &ldquo;{req.message}&rdquo;
                          </p>
                        )}
                        <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          Received {receivedOn}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
              Quick access
            </h2>

            <p className="mt-1 text-xs" style={secondaryText}>
              Your PartnerMatcher workspace
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "book",
                title: "My courses",
                description: "Manage your academic subjects",
                href: "/profile/courses",
              },
              {
                icon: "users",
                title: "Study partners",
                description: "Find students with similar interests",
                href: "/partners",
              },
              {
                icon: "clock",
                title: "Availability",
                description: "Manage weekly matching times",
                href: "/availability",
              },
              {
                icon: "message",
                title: "Messages",
                description: "Connect with your study partners",
                href: "/dashboard",
              },
            ].map((action) => (
              <Link
                href={action.href}
                key={action.title}
                className="group rounded-2xl border p-5 transition duration-200 hover:-translate-y-1"
                style={cardStyle}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: "var(--bg-row)",
                    color: "var(--text-heading)",
                  }}
                >
                  <Icon name={action.icon} />
                </div>

                <h3 className="mt-4 text-sm font-bold" style={{ color: "var(--text-heading)" }}>
                  {action.title}
                </h3>

                <p className="mt-1 text-xs leading-5" style={secondaryText}>
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <footer
          className="mt-12 border-t pt-6 text-center text-xs"
          style={{
            borderColor: "var(--border-nav)",
            color: "var(--text-muted)",
          }}
        >
          PartnerMatcher · Your study community
        </footer>
      </main>
    </div>
  );
}
