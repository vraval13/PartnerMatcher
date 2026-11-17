"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type SentConnectionRow = {
  id: string;
  receiver_id: string;
  session_topic: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  created_at: string;
};

export type AcceptedConnectionRow = {
  id: string;
  partner_id: string;
  partner_display_name: string | null;
  session_topic: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  created_at: string;
};

type Match = {
  candidate_goal_id: string;
  display_name: string;
  final_score: number;
};

type Favorite = {
  display_name: string;
  candidate_goal_ids: string[];
  created_at?: string;
};

const yearLabels = [
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
  "5th year",
  "Graduate",
  "PhD",
];

const readable = (value: string | null | undefined) =>
  value
    ? value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : "Not set";

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
    case "send":
      return (
        <svg {...common}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
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
  pendingRequestsCount,
  pendingSentRequests,
  acceptedConnectionsCount,
  recentConnections,
}: {
  user: User;
  profile: ProfileSummary | null;
  courseCount: number;
  availabilityCount: number;
  pendingRequests: ConnectionRow[];
  pendingRequestsCount: number;
  pendingSentRequests: SentConnectionRow[];
  acceptedConnectionsCount: number;
  recentConnections: AcceptedConnectionRow[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  const [matches, setMatches] = useState<Match[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const [matchesLoading, setMatchesLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState("");
  const [favoritesError, setFavoritesError] = useState("");

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [cancelBusy, setCancelBusy] = useState(false);

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [respondBusy, setRespondBusy] = useState(false);

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "there";

  const initials = displayName
    .split(" ")
    .map((word: string) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const visibleSent = pendingSentRequests.filter((r) => !cancelledIds.has(r.id));
  const visibleReceived = pendingRequests.filter((r) => !respondedIds.has(r.id));
  const visibleReceivedCount = Math.max(0, pendingRequestsCount - respondedIds.size);

  const cardStyle = {
    backgroundColor: "var(--bg-card)",
    borderColor: "var(--border-card)",
  };

  const secondaryText = { color: "var(--text-muted)" };

  async function loadMatches() {
    setMatchesLoading(true);
    setMatchesError("");

    try {
      const goalsResponse = await fetch("/api/v1/matching-goals");

      if (!goalsResponse.ok) {
        throw new Error("Unable to load your matching goals.");
      }

      const goalsData = await goalsResponse.json();
      const savedGoals = goalsData.goals ?? [];

      if (savedGoals.length === 0) {
        setMatches([]);
        return;
      }

      const results = await Promise.all(
        savedGoals.map(async (goal: { id: string }) => {
          const response = await fetch("/api/v1/matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ goal_id: goal.id }),
          });

          if (!response.ok) {
            throw new Error("Unable to load matching results.");
          }

          const data = await response.json();
          return (data.matches ?? []) as Match[];
        })
      );

      const allMatches = results.flat();

      const uniqueMatches = Array.from(
        new Map(
          allMatches.map((match) => [match.candidate_goal_id, match])
        ).values()
      );

      setMatches(
        uniqueMatches
          .sort((a, b) => b.final_score - a.final_score)
          .slice(0, 5)
      );
    } catch (error) {
      setMatchesError(
        error instanceof Error ? error.message : "Unable to load matches."
      );
    } finally {
      setMatchesLoading(false);
    }
  }

  async function loadFavorites() {
    setFavoritesLoading(true);
    setFavoritesError("");

    try {
      const response = await fetch("/api/v1/favorites");

      if (!response.ok) {
        throw new Error("Unable to load favorites.");
      }

      const data = await response.json();
      setFavorites(data.favorites ?? []);
    } catch (error) {
      setFavoritesError(
        error instanceof Error ? error.message : "Unable to load favorites."
      );
    } finally {
      setFavoritesLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      void loadMatches();
      void loadFavorites();
    });
  }, []);

  async function respondToReceived(id: string, action: "accept" | "decline") {
    setRespondingId(id);
    setRespondBusy(true);

    try {
      const response = await fetch(`/api/v1/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error("Unable to update this request.");
      }

      setRespondedIds((previous) => new Set(previous).add(id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to update request.");
    } finally {
      setRespondBusy(false);
      setRespondingId(null);
    }
  }

  async function cancelSent(id: string) {
    setCancelBusy(true);

    try {
      const response = await fetch(`/api/v1/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Unable to cancel this request.");
      }

      setCancelledIds((previous) => new Set(previous).add(id));
      setConfirmingId(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to cancel request.");
    } finally {
      setCancelBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  const profileIncomplete =
    !profile?.university?.trim() ||
    !profile?.major?.trim() ||
    !profile?.year_of_study;

  const availabilityIncomplete = availabilityCount === 0;

  const needsSetup = profileIncomplete || availabilityIncomplete;

  const profileCompletionLink = "/profile";
  const availabilityCompletionLink = "/availability";

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg-page)",
        color: "var(--text-page)",
      }}
    >
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
            <span className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
              PartnerMatcher
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
              className="flex h-10 w-10 items-center justify-center rounded-xl border"
              style={cardStyle}
            >
              <Icon name={dark ? "sun" : "moon"} size={19} />
            </button>

            <Link
              href="/requests"
              aria-label={`${visibleReceivedCount} pending connection requests`}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border"
              style={cardStyle}
            >
              <Icon name="inbox" size={19} />
              {visibleReceivedCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
                  {visibleReceivedCount > 9 ? "9+" : visibleReceivedCount}
                </span>
              )}
            </Link>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-white">
              {initials}
            </div>

            <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
              {displayName}
            </span>

            <button
              onClick={handleSignOut}
              className="rounded-xl border px-4 py-2 text-xs font-semibold"
              style={cardStyle}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
        <section className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em]" style={secondaryText}>
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              <Icon name="edit" size={16} />
              Edit profile
            </Link>
          </div>
        </section>

        {/* Setup prompt */}
        {needsSetup && (
          <section
            className="mb-7 rounded-2xl border p-5 sm:p-6"
            style={{
              ...cardStyle,
              borderColor: "var(--border-card)",
            }}
          >
            <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
              Your next step
            </h2>

            <p className="mt-2 text-sm" style={secondaryText}>
              Complete the missing steps below to get the most out of PartnerMatcher.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              {profileIncomplete && (
                <Link
                  href={profileCompletionLink}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                >
                  Complete your profile →
                </Link>
              )}

              {availabilityIncomplete && (
                <Link
                  href={availabilityCompletionLink}
                  className="rounded-xl border px-4 py-3 text-center text-sm font-semibold"
                  style={cardStyle}
                >
                  Add your availability →
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Overview */}
        <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Courses added",
              value: courseCount,
              link: "/profile/courses",
              action: "Manage courses →",
              icon: "book",
            },
            {
              title: "Connections",
              value: acceptedConnectionsCount,
              link: "/requests",
              action: "View connections →",
              icon: "check",
            },
            {
              title: "Study level",
              value: profile?.year_of_study
                ? yearLabels[profile.year_of_study - 1] ?? "Not set"
                : "Not set",
              link: "/profile",
              action: profile?.major || "Programme not set",
              icon: "users",
            },
            {
              title: "Availability",
              value: availabilityCount,
              link: "/availability",
              action: availabilityCount ? "Manage availability →" : "Set availability →",
              icon: "clock",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border p-5 sm:p-6" style={cardStyle}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={secondaryText}>
                  {item.title}
                </span>
                <Icon name={item.icon} />
              </div>
              <p className="mt-5 text-2xl font-bold" style={{ color: "var(--text-heading)" }}>
                {item.value}
              </p>
              <Link
                href={item.link}
                className="mt-2 inline-block text-xs font-semibold underline-offset-4 hover:underline"
                style={{ color: "var(--text-sub)" }}
              >
                {item.action}
              </Link>
            </div>
          ))}
        </section>

        {/* Main dashboard: one column on mobile, two on desktop */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Academic profile */}
          <div className="rounded-2xl border p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
                Your academic profile
              </h2>
              <Link href="/profile" className="text-xs font-semibold" style={{ color: "var(--text-sub)" }}>
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
                    ? yearLabels[profile.year_of_study - 1] ?? "Not set"
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
                  <span className="max-w-[60%] text-right text-xs font-semibold" style={{ color: "var(--text-sub)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top matches */}
          {!needsSetup && (
          <div className="rounded-2xl border p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
                  Top study partners
                </h2>
                <p className="mt-1 text-xs" style={secondaryText}>
                  Your highest-scoring matches
                </p>
              </div>
              <Icon name="users" />
            </div>

            {matchesLoading ? (
              <p className="py-12 text-center text-sm" style={secondaryText}>
                Loading your matches…
              </p>
            ) : matchesError ? (
              <div className="py-10 text-center">
                <p className="text-sm" style={{ color: "#dc2626" }}>
                  {matchesError}
                </p>
                <button
                  onClick={() => void loadMatches()}
                  className="mt-3 rounded-lg border px-4 py-2 text-xs font-semibold"
                  style={cardStyle}
                >
                  Retry
                </button>
              </div>
            ) : matches.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                  No matches yet
                </p>
                <p className="mt-2 text-xs" style={secondaryText}>
                  Add a matching goal and availability to discover study partners.
                </p>
                <Link
                  href="/partners"
                  className="mt-4 inline-block rounded-xl border px-4 py-2 text-xs font-semibold"
                  style={cardStyle}
                >
                  Find partners →
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {matches.map((match) => (
                  <Link
                    key={match.candidate_goal_id}
                    href={`/partners/profile/${match.candidate_goal_id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border p-4 transition hover:opacity-75"
                    style={cardStyle}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                        {match.display_name}
                      </p>
                      <p className="mt-1 text-xs" style={secondaryText}>
                        View partner profile →
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      {Math.round(match.final_score)}% match
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Favorites */}
          <div className="rounded-2xl border p-6" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
                Favorite partners
              </h2>
              <Icon name="heart" />
            </div>

            {favoritesLoading ? (
              <p className="py-10 text-center text-sm" style={secondaryText}>
                Loading favorites…
              </p>
            ) : favoritesError ? (
              <div className="py-10 text-center">
                <p className="text-sm" style={{ color: "#dc2626" }}>
                  {favoritesError}
                </p>
                <button
                  onClick={() => void loadFavorites()}
                  className="mt-3 rounded-lg border px-4 py-2 text-xs font-semibold"
                  style={cardStyle}
                >
                  Retry
                </button>
              </div>
            ) : favorites.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                  No favorites saved yet
                </p>
                <p className="mt-2 text-xs" style={secondaryText}>
                  Save study partners to find them easily later.
                </p>
                <Link
                  href="/partners"
                  className="mt-4 inline-block rounded-xl border px-4 py-2 text-xs font-semibold"
                  style={cardStyle}
                >
                  Browse partners →
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {favorites.map((favorite, index) => (
                  <div
                    key={`${favorite.display_name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border p-4"
                    style={cardStyle}
                  >
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                      {favorite.display_name}
                    </p>
                    {favorite.candidate_goal_ids[0] ? (
                      <Link
                        href={`/partners/profile/${favorite.candidate_goal_ids[0]}`}
                        className="shrink-0 text-xs font-semibold"
                        style={{ color: "var(--text-sub)" }}
                      >
                        View →
                      </Link>
                    ) : (
                      <span className="text-xs" style={secondaryText}>
                        Profile unavailable
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending incoming requests */}
          <div className="rounded-2xl border p-6" style={cardStyle}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
                  Connection Requests
                </h2>
                {visibleReceivedCount > 0 && (
                  <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-bold text-white">
                    {visibleReceivedCount}
                  </span>
                )}
              </div>
              <Link href="/requests" className="text-xs font-semibold" style={{ color: "var(--text-sub)" }}>
                View all →
              </Link>
            </div>

            {visibleReceivedCount === 0 ? (
              <p className="py-10 text-center text-sm" style={secondaryText}>
                No pending connection requests.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {visibleReceived.map((request) => (
                  <div key={request.id} className="rounded-xl border p-4" style={cardStyle}>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                      {request.session_topic || "Study session"}
                    </p>
                    {request.message && (
                      <p className="mt-1 text-xs" style={secondaryText}>
                        {request.message}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => void respondToReceived(request.id, "accept")}
                        disabled={respondBusy}
                        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {respondingId === request.id && respondBusy ? "…" : "Accept"}
                      </button>
                      <button
                        onClick={() => void respondToReceived(request.id, "decline")}
                        disabled={respondBusy}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                        style={cardStyle}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent requests */}
          <div className="rounded-2xl border p-6" style={cardStyle}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
                Awaiting Response
              </h2>
              <Link href="/requests#sent" className="text-xs font-semibold" style={{ color: "var(--text-sub)" }}>
                View sent →
              </Link>
            </div>

            {visibleSent.length === 0 ? (
              <p className="py-10 text-center text-sm" style={secondaryText}>
                No pending outgoing requests.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {visibleSent.map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl border p-4" style={cardStyle}>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                      {request.session_topic || "Study session"}
                    </p>
                    {confirmingId === request.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => void cancelSent(request.id)}
                          disabled={cancelBusy}
                          className="text-xs font-semibold text-red-600"
                        >
                          {cancelBusy ? "…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-xs"
                          style={secondaryText}
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(request.id)}
                        className="text-xs font-semibold text-red-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active connections */}
          <div className="rounded-2xl border p-6" style={cardStyle}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
                Active Connections
              </h2>
              <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                {acceptedConnectionsCount}
              </span>
            </div>

            {recentConnections.length === 0 ? (
              <p className="py-10 text-center text-sm" style={secondaryText}>
                No active connections yet.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {recentConnections.map((connection) => (
                  <div key={connection.id} className="rounded-xl border p-4" style={cardStyle}>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                      {connection.session_topic || "Study session"}
                    </p>
                    <p className="mt-1 text-xs" style={secondaryText}>
                      With {connection.partner_display_name || "A student"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Quick access */}
        <section className="mt-8">
          <h2 className="text-base font-bold" style={{ color: "var(--text-heading)" }}>
            Quick access
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "book", title: "My courses", href: "/profile/courses" },
              { icon: "users", title: "Study partners", href: "/partners" },
              { icon: "clock", title: "Availability", href: "/availability" },
              { icon: "inbox", title: "Requests", href: "/requests" },
            ].map((item) => (
              <Link
                href={item.href}
                key={item.title}
                className="flex items-center gap-3 rounded-2xl border p-5 transition hover:opacity-75"
                style={cardStyle}
              >
                <Icon name={item.icon} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                  {item.title}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer
          className="mt-12 border-t pt-6 text-center text-xs"
          style={{ borderColor: "var(--border-nav)", color: "var(--text-muted)" }}
        >
          PartnerMatcher · Your study community
        </footer>
      </main>
    </div>
  );
}