"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { ConnectionRow, SentConnectionRow, AcceptedConnectionRow } from "./DashboardClient";

const yearLabels = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Graduate", "PhD"];

type ProfileSummary = {
  university: string | null;
  major: string | null;
  year_of_study: number | null;
  study_style: string | null;
  comm_pref: string | null;
  timezone: string | null;
};

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
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      );
    default:
      return null;
  }
}

function SimpleCalendar() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDate = now.getDate();

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const prevLastDay = new Date(currentYear, currentMonth, 0);

  const daysInMonth = lastDay.getDate();
  const daysInPrevMonth = prevLastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: daysInPrevMonth - i,
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: i,
      isCurrentMonth: true,
      isToday: i === currentDate,
    });
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: i,
      isCurrentMonth: false,
    });
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: "var(--bg-page)",
        borderColor: "var(--border-card)",
      }}
    >
      <h3 className="mb-4 text-sm font-bold text-center" style={{ color: "var(--text-heading)" }}>
        {monthNames[currentMonth]} {currentYear}
      </h3>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <div
            key={`day-${index}`}
            className="text-center text-xs font-semibold"
            style={{ color: "var(--text-muted)" }}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div
            key={index}
            className="aspect-square flex items-center justify-center text-xs rounded-lg font-medium"
            style={{
              backgroundColor: day.isToday
                ? "#4f46e5"
                : day.isCurrentMonth
                  ? "transparent"
                  : "var(--bg-card)",
              color: day.isToday
                ? "#fff"
                : day.isCurrentMonth
                  ? "var(--text-heading)"
                  : "var(--text-muted)",
            }}
          >
            {day.date}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RightSidebar({
  user,
  profile,
  pendingRequests,
  pendingSentRequests,
  recentConnections,
}: {
  user: User;
  profile: ProfileSummary | null;
  pendingRequests: ConnectionRow[];
  pendingSentRequests: SentConnectionRow[];
  recentConnections: AcceptedConnectionRow[];
}) {
  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Student";

  const initials = displayName
    .split(" ")
    .map((word: string) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const upcomingTasks = [
    ...pendingRequests.slice(0, 2).map((req) => ({
      type: "incoming",
      id: req.id,
      title: req.session_topic || "New study request",
      time: req.created_at,
    })),
    ...recentConnections.slice(0, 1).map((conn) => ({
      type: "connection",
      id: conn.id,
      title: `Study session: ${conn.session_topic || "TBD"}`,
      time: conn.proposed_start,
    })),
  ];

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <aside
      className="fixed right-0 top-0 h-screen w-72 border-l overflow-y-auto p-6 space-y-6"
      style={{
        backgroundColor: "var(--bg-page)",
        borderColor: "var(--border-card)",
      }}
    >
      {/* User Profile Card */}
      <div
        className="rounded-2xl border p-4"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-card)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--text-heading)" }}>
              {displayName}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {profile?.year_of_study ? yearLabels[profile.year_of_study - 1] : "Student"}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span style={{ color: "var(--text-muted)" }}>University</span>
            <span className="text-right" style={{ color: "var(--text-heading)" }}>
              {profile?.university || "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-muted)" }}>Programme</span>
            <span className="text-right" style={{ color: "var(--text-heading)" }}>
              {profile?.major || "Not set"}
            </span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div>
        <h3
          className="mb-3 text-sm font-bold flex items-center gap-2"
          style={{ color: "var(--text-heading)" }}
        >
          <Icon name="calendar" size={16} />
          My Schedule
        </h3>
        <SimpleCalendar />
      </div>

      {/* Upcoming Tasks */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3
            className="text-sm font-bold flex items-center gap-2"
            style={{ color: "var(--text-heading)" }}
          >
            <Icon name="bell" size={16} />
            Upcoming Tasks
          </h3>
          <Link
            href="/requests"
            className="text-xs font-semibold"
            style={{ color: "var(--text-sub)" }}
          >
            See All
          </Link>
        </div>

        {upcomingTasks.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
            No upcoming tasks
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <Link
                key={task.id}
                href={task.type === "incoming" ? "/requests#received" : "/requests#received"}
                className="block rounded-xl border p-3 transition hover:opacity-75"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                }}
              >
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: "var(--text-heading)" }}
                >
                  {task.title}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {task.time ? timeAgo(task.time) : "Soon"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div
        className="rounded-2xl border p-4 text-center"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-card)",
        }}
      >
        <p className="text-2xl font-bold" style={{ color: "var(--text-heading)" }}>
          {pendingRequests.length}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Pending Requests
        </p>
      </div>
    </aside>
  );
}
