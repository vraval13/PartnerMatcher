"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/app/components/ThemeProvider";
import { Sidebar } from "./Sidebar";
import { RightSidebar } from "./RightSidebar";

export type ProfileSummary = {
  university: string | null;
  major: string | null;
  year_of_study: number | null;
  study_style: string | null;
  comm_pref: string | null;
  timezone: string | null;
};

export type ConnectionRow = {
  id: string;
  requester_id: string;
  session_topic: string | null;
  proposed_start: string | null;
  proposed_end: string | null;
  message: string | null;
  created_at: string;
};

export type SentConnectionRow = {
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
        new Map(allMatches.map((match) => [match.candidate_goal_id, match])).values()
      );

      setMatches(uniqueMatches.sort((a, b) => b.final_score - a.final_score).slice(0, 5));
    } catch (error) {
      setMatchesError(error instanceof Error ? error.message : "Unable to load matches.");
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
      setFavoritesError(error instanceof Error ? error.message : "Unable to load favorites.");
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
    !profile?.university?.trim() || !profile?.major?.trim() || !profile?.year_of_study;

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
      {/* Left Sidebar */}
      <Sidebar user={user} onSignOut={handleSignOut} />

      {/* Main Content */}
      <main
        className="ml-64 mr-72 min-h-screen px-8 py-12"
        style={{
          backgroundColor: "var(--bg-page)",
        }}
      >
        <div className="max-w-4xl">
          {/* Welcome Section */}
          <section className="mb-10">
            <div
              className="rounded-3xl border p-8 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white"
              style={{
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <p className="text-sm font-semibold opacity-90 mb-2">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {displayName.split(" ")[0]}!
              </h1>
              <p className="text-indigo-100 text-lg">
                You have {visibleReceivedCount} pending connection request
                {visibleReceivedCount !== 1 ? "s" : ""}.
              </p>
            </div>
          </section>

          {/* Stats Overview */}
          <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border p-5" style={cardStyle}>
              <p className="text-xs font-semibold text-center" style={secondaryText}>
                Courses
              </p>
              <p
                className="mt-3 text-3xl font-bold text-center"
                style={{ color: "var(--text-heading)" }}
              >
                {courseCount}
              </p>
            </div>
            <div className="rounded-2xl border p-5" style={cardStyle}>
              <p className="text-xs font-semibold text-center" style={secondaryText}>
                Availability
              </p>
              <p
                className="mt-3 text-3xl font-bold text-center"
                style={{ color: "var(--text-heading)" }}
              >
                {availabilityCount}
              </p>
            </div>
            <div className="rounded-2xl border p-5" style={cardStyle}>
              <p className="text-xs font-semibold text-center" style={secondaryText}>
                Connections
              </p>
              <p
                className="mt-3 text-3xl font-bold text-center"
                style={{ color: "var(--text-heading)" }}
              >
                {acceptedConnectionsCount}
              </p>
            </div>
            <div className="rounded-2xl border p-5" style={cardStyle}>
              <p className="text-xs font-semibold text-center" style={secondaryText}>
                Requests
              </p>
              <p
                className="mt-3 text-3xl font-bold text-center"
                style={{ color: "var(--text-heading)" }}
              >
                {visibleReceivedCount}
              </p>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/partners"
              className="flex items-center gap-4 rounded-2xl border p-5 transition hover:opacity-85"
              style={cardStyle}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                <Icon name="users" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>
                  Find Study Partners
                </p>
                <p className="text-xs" style={secondaryText}>
                  Search goals and see ranked matches
                </p>
              </div>
            </Link>
            <Link
              href="/availability"
              className="flex items-center gap-4 rounded-2xl border p-5 transition hover:opacity-85"
              style={cardStyle}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                <Icon name="clock" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>
                  Manage Availability
                </p>
                <p className="text-xs" style={secondaryText}>
                  Update your weekly time slots
                </p>
              </div>
            </Link>
          </section>

          {/* My Matching Goals / Study Plans */}
          <section className="mb-10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold" style={{ color: "var(--text-heading)" }}>
                My Study Plans
              </h2>
              <p className="mt-1 text-sm" style={secondaryText}>
                Your active matching goals
              </p>
            </div>

            {!needsSetup && matches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {matches.slice(0, 4).map((match) => (
                  <Link
                    key={match.candidate_goal_id}
                    href={`/partners/profile/${match.candidate_goal_id}`}
                    className="rounded-2xl border p-6 transition hover:opacity-85 cursor-pointer"
                    style={cardStyle}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3
                          className="text-base font-bold"
                          style={{ color: "var(--text-heading)" }}
                        >
                          {match.display_name}
                        </h3>
                        <p className="mt-2 text-sm" style={secondaryText}>
                          Study partner match
                        </p>
                      </div>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                        {Math.round(match.final_score)}%
                      </span>
                    </div>
                    <div
                      className="mt-4 flex items-center justify-between pt-4 border-t"
                      style={{ borderColor: "var(--border-card)" }}
                    >
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        View profile →
                      </span>
                      <div
                        className="w-full h-1 mx-2 bg-gradient-to-r from-indigo-200 to-indigo-100 dark:from-indigo-800 dark:to-indigo-900 rounded-full"
                        style={{
                          width: `${Math.round(match.final_score)}%`,
                        }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : needsSetup ? (
              <div className="text-center py-12 rounded-2xl border p-6" style={cardStyle}>
                <p className="text-sm" style={secondaryText}>
                  Complete your profile and add availability to discover study partners
                </p>
                <Link
                  href="/profile"
                  className="mt-4 inline-block rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white"
                >
                  Complete Profile →
                </Link>
              </div>
            ) : (
              <div className="text-center py-12 rounded-2xl border p-6" style={cardStyle}>
                <p className="text-sm" style={secondaryText}>
                  No matches yet. Add a matching goal to get started
                </p>
                <Link
                  href="/partners"
                  className="mt-4 inline-block rounded-xl border px-6 py-2 text-sm font-semibold"
                  style={cardStyle}
                >
                  Browse Partners →
                </Link>
              </div>
            )}
          </section>

          {/* Active Connections & Requests Grid */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                <Link
                  href="/requests"
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-sub)" }}
                >
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
                <Link
                  href="/requests#sent"
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-sub)" }}
                >
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
                    <div
                      key={request.id}
                      className="flex items-center justify-between gap-3 rounded-xl border p-4"
                      style={cardStyle}
                    >
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

          {/* Achievements / Accomplishments */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text-heading)" }}>
              Your Achievements
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {acceptedConnectionsCount > 0 && (
                <div
                  className="rounded-2xl border p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                  style={{
                    borderColor: "var(--border-card)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                        Study Partner Badge
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        {acceptedConnectionsCount} active connection
                        {acceptedConnectionsCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-3xl">🤝</div>
                  </div>
                  <button className="mt-4 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white">
                    View Badge
                  </button>
                </div>
              )}

              {courseCount >= 3 && (
                <div
                  className="rounded-2xl border p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
                  style={{
                    borderColor: "var(--border-card)",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                        Multi-Course Scholar
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        Studying across {courseCount} courses
                      </p>
                    </div>
                    <div className="text-3xl">📚</div>
                  </div>
                  <button className="mt-4 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
                    View Badge
                  </button>
                </div>
              )}

              {!acceptedConnectionsCount && !courseCount && (
                <div className="rounded-2xl border p-6" style={cardStyle}>
                  <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                    Complete connections and add courses to unlock achievements
                  </p>
                </div>
              )}
            </div>
          </section>

          <footer
            className="mt-12 border-t pt-6 text-center text-xs"
            style={{ borderColor: "var(--border-nav)", color: "var(--text-muted)" }}
          >
            PartnerMatcher · Your study community
          </footer>
        </div>
      </main>

      {/* Right Sidebar */}
      <RightSidebar
        user={user}
        profile={profile}
        pendingRequests={pendingRequests}
        pendingSentRequests={pendingSentRequests}
        recentConnections={recentConnections}
      />
    </div>
  );
}
