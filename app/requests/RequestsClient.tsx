"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReceivedRequest, ConnectionStatus } from "@/lib/connections/http";

// ── helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTimeWindow(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const startT = s.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const endT = e.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${startT} – ${endT}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── status badge ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Declined",
  blocked: "Blocked",
};

const STATUS_STYLE: Record<ConnectionStatus, { bg: string; color: string; border: string }> = {
  pending: {
    bg: "rgba(217,119,6,0.1)",
    color: "#b45309",
    border: "rgba(217,119,6,0.35)",
  },
  accepted: {
    bg: "rgba(22,163,74,0.1)",
    color: "#15803d",
    border: "rgba(22,163,74,0.35)",
  },
  rejected: {
    bg: "rgba(220,38,38,0.1)",
    color: "#b91c1c",
    border: "rgba(220,38,38,0.35)",
  },
  blocked: {
    bg: "rgba(100,116,139,0.1)",
    color: "#64748b",
    border: "rgba(100,116,139,0.35)",
  },
};

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.blocked;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        borderRadius: "20px",
        padding: "2px 10px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── filter tabs ───────────────────────────────────────────────────────────────

type Filter = "all" | ConnectionStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Declined" },
  { key: "blocked", label: "Blocked" },
];

// ── request card ──────────────────────────────────────────────────────────────

function RequestCard({ req }: { req: ReceivedRequest }) {
  const timeWindow = formatTimeWindow(req.proposed_start, req.proposed_end);
  const isPending = req.status === "pending";

  return (
    <article
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-card)",
        opacity: isPending ? 1 : 0.85,
      }}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>
              {req.session_topic || "Study session"}
            </h3>
            <StatusBadge status={req.status} />
          </div>
          <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-sub)" }}>
            From:{" "}
            <span style={{ color: "var(--text-heading)" }}>
              {req.requester_display_name ?? "A student"}
            </span>
          </p>
        </div>

        {/* Proposed time (top-right on wide screens) */}
        {timeWindow && (
          <p className="shrink-0 text-right text-xs" style={{ color: "var(--text-muted)" }}>
            {timeWindow}
          </p>
        )}
      </div>

      {/* Message */}
      {req.message && (
        <blockquote
          className="mt-3 border-l-2 pl-3 text-xs italic"
          style={{
            borderColor: "var(--border-card)",
            color: "var(--text-muted)",
          }}
        >
          {req.message}
        </blockquote>
      )}

      {/* Footer */}
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        Received {formatDate(req.created_at)}
        {!isPending && (
          <span className="ml-2 opacity-70">
            · {STATUS_LABEL[req.status]} — no further action required
          </span>
        )}
      </p>
    </article>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function RequestsClient() {
  const [requests, setRequests] = useState<ReceivedRequest[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    let live = true;
    fetch("/api/v1/connections", { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((data) => {
        if (!live) return;
        if (data.error) setError(data.error);
        else setRequests(data.requests ?? []);
      })
      .catch(() => {
        if (live) setError("Unable to load requests. Please try again.");
      });
    return () => {
      live = false;
    };
  }, []);

  const filtered = (
    filter === "all" ? (requests ?? []) : (requests ?? []).filter((r) => r.status === filter)
  ).sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sort === "desc" ? -diff : diff;
  });

  // Count per filter for tab badges
  const counts: Record<Filter, number> = {
    all: requests?.length ?? 0,
    pending: requests?.filter((r) => r.status === "pending").length ?? 0,
    accepted: requests?.filter((r) => r.status === "accepted").length ?? 0,
    rejected: requests?.filter((r) => r.status === "rejected").length ?? 0,
    blocked: requests?.filter((r) => r.status === "blocked").length ?? 0,
  };

  return (
    <main
      className="min-h-screen px-5 py-8"
      style={{ background: "var(--bg-page)", color: "var(--text-page)" }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Back */}
        <Link href="/dashboard" className="text-sm font-semibold" style={{ color: "#6366f1" }}>
          ← Dashboard
        </Link>

        {/* Page heading */}
        <div className="mt-5 mb-7">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-heading)" }}
          >
            Connection Requests
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Incoming study session proposals addressed to you.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-red-400 bg-red-500/10 p-4 text-sm"
          >
            {error}
          </p>
        )}

        {/* Summary stat tiles */}
        {requests !== null && requests.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { label: "Total", count: counts.all, accent: "var(--text-heading)" },
                { label: "Pending", count: counts.pending, accent: "#d97706" },
                { label: "Accepted", count: counts.accepted, accent: "#16a34a" },
                { label: "Declined", count: counts.rejected, accent: "#dc2626" },
              ] as { label: string; count: number; accent: string }[]
            ).map(({ label, count, accent }) => (
              <div
                key={label}
                className="rounded-2xl border p-4"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {label}
                </p>
                <p
                  className="mt-1 text-2xl font-bold tracking-tight"
                  style={{ color: accent, fontVariantNumeric: "tabular-nums" }}
                >
                  {count}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs + sort toggle */}
        {requests !== null && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Filter requests by status"
            >
              {FILTERS.map(({ key, label }) => {
                const active = filter === key;
                const count = counts[key];
                if (key !== "all" && count === 0) return null;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(key)}
                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition"
                    style={{
                      backgroundColor: active ? "var(--text-heading)" : "var(--bg-card)",
                      color: active ? "var(--bg-page)" : "var(--text-sub)",
                      borderColor: active ? "var(--text-heading)" : "var(--border-card)",
                    }}
                  >
                    {label}
                    {count > 0 && (
                      <span
                        className="inline-flex items-center justify-center rounded-full text-xs"
                        style={{
                          minWidth: "18px",
                          height: "18px",
                          padding: "0 4px",
                          background: active ? "rgba(255,255,255,0.25)" : "var(--bg-row)",
                          color: active ? "inherit" : "var(--text-muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sort toggle — newest / oldest */}
            <div
              className="flex gap-1 rounded-xl border p-1"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
            >
              {(["desc", "asc"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setSort(dir)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    backgroundColor: sort === dir ? "var(--text-heading)" : "transparent",
                    color: sort === dir ? "var(--bg-page)" : "var(--text-muted)",
                  }}
                >
                  {dir === "desc" ? "Newest" : "Oldest"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {requests === null && !error && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border p-5"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                }}
              >
                <div className="h-4 w-48 rounded" style={{ backgroundColor: "var(--bg-row)" }} />
                <div
                  className="mt-3 h-3 w-72 rounded"
                  style={{ backgroundColor: "var(--bg-row)" }}
                />
                <div
                  className="mt-2 h-3 w-56 rounded"
                  style={{ backgroundColor: "var(--bg-row)" }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {requests !== null && filtered.length === 0 && (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border py-16 text-center"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-card)",
            }}
          >
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "var(--bg-row)", color: "var(--text-heading)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>
              {filter === "all"
                ? "No connection requests yet"
                : `No ${STATUS_LABEL[filter as ConnectionStatus]?.toLowerCase()} requests`}
            </h2>
            <p className="mt-2 max-w-xs text-xs leading-6" style={{ color: "var(--text-muted)" }}>
              {filter === "all"
                ? "When another student sends you a study session request it will appear here."
                : "Switch to All to see requests in other states."}
            </p>
          </div>
        )}

        {/* Request list */}
        {filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((req) => (
              <RequestCard key={req.id} req={req} />
            ))}
            <p className="pt-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>
              Showing {filtered.length} of {requests?.length} request
              {requests?.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
