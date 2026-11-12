"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReceivedRequest, SentRequest, ConnectionStatus } from "@/lib/connections/http";

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
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<ConnectionStatus, { bg: string; color: string; border: string }> = {
  pending: { bg: "rgba(217,119,6,0.1)", color: "#b45309", border: "rgba(217,119,6,0.35)" },
  accepted: { bg: "rgba(22,163,74,0.1)", color: "#15803d", border: "rgba(22,163,74,0.35)" },
  rejected: { bg: "rgba(220,38,38,0.1)", color: "#b91c1c", border: "rgba(220,38,38,0.35)" },
  blocked: { bg: "rgba(100,116,139,0.1)", color: "#64748b", border: "rgba(100,116,139,0.35)" },
  cancelled: { bg: "rgba(100,116,139,0.07)", color: "#94a3b8", border: "rgba(100,116,139,0.2)" },
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

// ── filter config ─────────────────────────────────────────────────────────────

type Filter = "all" | ConnectionStatus;

const RECEIVED_FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Declined" },
  { key: "blocked", label: "Blocked" },
];

const SENT_FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Declined" },
  { key: "cancelled", label: "Cancelled" },
];

// ── filter + sort bar ─────────────────────────────────────────────────────────

function FilterBar({
  filters,
  filter,
  counts,
  sort,
  onFilter,
  onSort,
}: {
  filters: { key: Filter; label: string }[];
  filter: Filter;
  counts: Record<Filter, number>;
  sort: "desc" | "asc";
  onFilter: (f: Filter) => void;
  onSort: (s: "desc" | "asc") => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter requests by status">
        {filters.map(({ key, label }) => {
          const active = filter === key;
          const count = counts[key] ?? 0;
          if (key !== "all" && count === 0) return null;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => onFilter(key)}
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

      <div
        className="flex gap-1 rounded-xl border p-1"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
      >
        {(["desc", "asc"] as const).map((dir) => (
          <button
            key={dir}
            onClick={() => onSort(dir)}
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
  );
}

// ── stat tiles ────────────────────────────────────────────────────────────────

function StatTiles({ tiles }: { tiles: { label: string; count: number; accent: string }[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map(({ label, count, accent }) => (
        <div
          key={label}
          className="rounded-2xl border p-4"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
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
  );
}

// ── loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border p-5"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
        >
          <div className="h-4 w-48 rounded" style={{ backgroundColor: "var(--bg-row)" }} />
          <div className="mt-3 h-3 w-72 rounded" style={{ backgroundColor: "var(--bg-row)" }} />
          <div className="mt-2 h-3 w-56 rounded" style={{ backgroundColor: "var(--bg-row)" }} />
        </div>
      ))}
    </div>
  );
}

// ── empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border py-16 text-center"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
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
        {message}
      </h2>
      <p className="mt-2 max-w-xs text-xs leading-6" style={{ color: "var(--text-muted)" }}>
        {sub}
      </p>
    </div>
  );
}

// ── received request card ─────────────────────────────────────────────────────

function ReceivedCard({ req }: { req: ReceivedRequest }) {
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
        {timeWindow && (
          // suppressHydrationWarning: locale-formatted time differs between Node.js (server) and browser
          <p
            suppressHydrationWarning
            className="shrink-0 text-right text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {timeWindow}
          </p>
        )}
      </div>
      {req.message && (
        <blockquote
          className="mt-3 border-l-2 pl-3 text-xs italic"
          style={{ borderColor: "var(--border-card)", color: "var(--text-muted)" }}
        >
          {req.message}
        </blockquote>
      )}
      <p suppressHydrationWarning className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
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

// ── sent request card ─────────────────────────────────────────────────────────

function SentCard({
  req,
  confirmingId,
  cancelBusy,
  onStartConfirm,
  onConfirm,
  onKeep,
}: {
  req: SentRequest;
  confirmingId: string | null;
  cancelBusy: boolean;
  onStartConfirm: (id: string) => void;
  onConfirm: (id: string) => void;
  onKeep: () => void;
}) {
  const timeWindow = formatTimeWindow(req.proposed_start, req.proposed_end);
  const isPending = req.status === "pending";
  const confirming = confirmingId === req.id;

  return (
    <article
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: confirming ? "rgba(220,38,38,0.4)" : "var(--border-card)",
        opacity: req.status === "cancelled" ? 0.7 : 1,
        transition: "border-color 0.15s, opacity 0.15s",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>
              {req.session_topic || "Study session"}
            </h3>
            <StatusBadge status={req.status} />
          </div>
          <p className="mt-1 text-xs font-medium" style={{ color: "var(--text-sub)" }}>
            To:{" "}
            <span style={{ color: "var(--text-heading)" }}>
              {req.receiver_display_name ?? "A student"}
            </span>
          </p>
        </div>
        {timeWindow && (
          <p
            suppressHydrationWarning
            className="shrink-0 text-right text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {timeWindow}
          </p>
        )}
      </div>

      {req.message && (
        <blockquote
          className="mt-3 border-l-2 pl-3 text-xs italic"
          style={{ borderColor: "var(--border-card)", color: "var(--text-muted)" }}
        >
          {req.message}
        </blockquote>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p suppressHydrationWarning className="text-xs" style={{ color: "var(--text-muted)" }}>
          Sent {formatDate(req.created_at)}
          {req.status === "cancelled" && (
            <span className="ml-2 opacity-70">· Withdrawn by you</span>
          )}
        </p>

        {/* AC3: cancel only shown to sender (this component is only rendered in the Sent tab) */}
        {isPending &&
          (confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: "#b91c1c" }}>
                Withdraw this request?
              </span>
              <button
                onClick={() => onConfirm(req.id)}
                disabled={cancelBusy}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                style={{ backgroundColor: "#dc2626", color: "#fff", opacity: cancelBusy ? 0.6 : 1 }}
              >
                {cancelBusy ? "Cancelling…" : "Yes, cancel"}
              </button>
              <button
                onClick={onKeep}
                disabled={cancelBusy}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                  color: "var(--text-sub)",
                  opacity: cancelBusy ? 0.6 : 1,
                }}
              >
                Keep it
              </button>
            </div>
          ) : (
            <button
              onClick={() => onStartConfirm(req.id)}
              disabled={cancelBusy}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-card)",
                color: "var(--text-sub)",
              }}
            >
              Cancel request
            </button>
          ))}
      </div>
    </article>
  );
}

// ── main component ────────────────────────────────────────────────────────────

type View = "received" | "sent";

export default function RequestsClient() {
  const [view, setView] = useState<View>(() => {
    // Open Sent tab directly when arriving via /requests#sent
    if (typeof window !== "undefined" && window.location.hash === "#sent") return "sent";
    return "received";
  });

  // received
  const [requests, setRequests] = useState<ReceivedRequest[] | null>(null);
  const [recvError, setRecvError] = useState("");
  const [recvFilter, setRecvFilter] = useState<Filter>("all");
  const [recvSort, setRecvSort] = useState<"desc" | "asc">("desc");

  // sent
  const [sentRequests, setSentRequests] = useState<SentRequest[] | null>(null);
  const [sentError, setSentError] = useState("");
  const [sentFilter, setSentFilter] = useState<Filter>("all");
  const [sentSort, setSentSort] = useState<"desc" | "asc">("desc");

  // cancel flow
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/v1/connections", { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((data) => {
        if (!live) return;
        if (data.error) setRecvError(data.error);
        else setRequests(data.requests ?? []);
      })
      .catch(() => {
        if (live) setRecvError("Unable to load requests. Please try again.");
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    fetch("/api/v1/connections/sent", { headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((data) => {
        if (!live) return;
        if (data.error) setSentError(data.error);
        else setSentRequests(data.requests ?? []);
      })
      .catch(() => {
        if (live) setSentError("Unable to load sent requests. Please try again.");
      });
    return () => {
      live = false;
    };
  }, []);

  async function cancelRequest(id: string) {
    setCancelBusy(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/v1/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error ?? "Unable to cancel. Please try again.");
        setConfirmingId(null);
        return;
      }
      setSentRequests((prev) =>
        (prev ?? []).map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r))
      );
      setConfirmingId(null);
    } catch {
      setCancelError("Unable to cancel. Please try again.");
      setConfirmingId(null);
    } finally {
      setCancelBusy(false);
    }
  }

  // ── computed ──────────────────────────────────────────────────────────────

  const recvFiltered = (
    recvFilter === "all"
      ? (requests ?? [])
      : (requests ?? []).filter((r) => r.status === recvFilter)
  ).sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return recvSort === "desc" ? -diff : diff;
  });

  const recvCounts: Record<Filter, number> = {
    all: requests?.length ?? 0,
    pending: requests?.filter((r) => r.status === "pending").length ?? 0,
    accepted: requests?.filter((r) => r.status === "accepted").length ?? 0,
    rejected: requests?.filter((r) => r.status === "rejected").length ?? 0,
    blocked: requests?.filter((r) => r.status === "blocked").length ?? 0,
    cancelled: 0,
  };

  const sentFiltered = (
    sentFilter === "all"
      ? (sentRequests ?? [])
      : (sentRequests ?? []).filter((r) => r.status === sentFilter)
  ).sort((a, b) => {
    const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sentSort === "desc" ? -diff : diff;
  });

  const sentCounts: Record<Filter, number> = {
    all: sentRequests?.length ?? 0,
    pending: sentRequests?.filter((r) => r.status === "pending").length ?? 0,
    accepted: sentRequests?.filter((r) => r.status === "accepted").length ?? 0,
    rejected: sentRequests?.filter((r) => r.status === "rejected").length ?? 0,
    blocked: 0,
    cancelled: sentRequests?.filter((r) => r.status === "cancelled").length ?? 0,
  };

  const pendingRecvCount = recvCounts.pending;
  const pendingSentCount = sentCounts.pending;

  return (
    <main
      className="min-h-screen px-5 py-8"
      style={{ background: "var(--bg-page)", color: "var(--text-page)" }}
    >
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-sm font-semibold" style={{ color: "#6366f1" }}>
          ← Dashboard
        </Link>

        <div className="mt-5 mb-7">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-heading)" }}
          >
            Connection Requests
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Manage incoming and outgoing study session proposals.
          </p>
        </div>

        {/* View tabs */}
        <div
          className="mb-6 flex gap-1 rounded-2xl border p-1"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border-card)",
            width: "fit-content",
          }}
        >
          {(["received", "sent"] as View[]).map((v) => {
            const isActive = view === v;
            const badge = v === "received" ? pendingRecvCount : pendingSentCount;
            return (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  if (typeof window !== "undefined") window.location.hash = v;
                  setCancelError("");
                  setConfirmingId(null);
                }}
                className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition"
                style={{
                  backgroundColor: isActive ? "var(--text-heading)" : "transparent",
                  color: isActive ? "var(--bg-page)" : "var(--text-sub)",
                }}
              >
                {v === "received" ? "Received" : "Sent"}
                {badge > 0 && (
                  <span
                    className="inline-flex items-center justify-center rounded-full text-xs"
                    style={{
                      minWidth: "18px",
                      height: "18px",
                      padding: "0 4px",
                      backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "#6366f1",
                      color: isActive ? "inherit" : "#fff",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── RECEIVED VIEW ───────────────────────────────────────────────── */}
        {view === "received" && (
          <>
            {recvError && (
              <p
                role="alert"
                className="mb-6 rounded-xl border border-red-400 bg-red-500/10 p-4 text-sm"
              >
                {recvError}
              </p>
            )}

            {requests !== null && requests.length > 0 && (
              <StatTiles
                tiles={[
                  { label: "Total", count: recvCounts.all, accent: "var(--text-heading)" },
                  { label: "Pending", count: recvCounts.pending, accent: "#d97706" },
                  { label: "Accepted", count: recvCounts.accepted, accent: "#16a34a" },
                  { label: "Declined", count: recvCounts.rejected, accent: "#dc2626" },
                ]}
              />
            )}

            {requests !== null && (
              <FilterBar
                filters={RECEIVED_FILTERS}
                filter={recvFilter}
                counts={recvCounts}
                sort={recvSort}
                onFilter={setRecvFilter}
                onSort={setRecvSort}
              />
            )}

            {requests === null && !recvError && <Skeleton />}

            {requests !== null && recvFiltered.length === 0 && (
              <EmptyState
                message={
                  recvFilter === "all"
                    ? "No connection requests yet"
                    : `No ${STATUS_LABEL[recvFilter as ConnectionStatus]?.toLowerCase()} requests`
                }
                sub={
                  recvFilter === "all"
                    ? "When another student sends you a study session request it will appear here."
                    : "Switch to All to see requests in other states."
                }
              />
            )}

            {recvFiltered.length > 0 && (
              <div className="space-y-4">
                {recvFiltered.map((req) => (
                  <ReceivedCard key={req.id} req={req} />
                ))}
                <p className="pt-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  Showing {recvFiltered.length} of {requests?.length} request
                  {requests?.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── SENT VIEW ───────────────────────────────────────────────────── */}
        {view === "sent" && (
          <>
            {cancelError && (
              <p
                role="alert"
                className="mb-6 rounded-xl border border-red-400 bg-red-500/10 p-4 text-sm"
              >
                {cancelError}
              </p>
            )}
            {sentError && (
              <p
                role="alert"
                className="mb-6 rounded-xl border border-red-400 bg-red-500/10 p-4 text-sm"
              >
                {sentError}
              </p>
            )}

            {sentRequests !== null && sentRequests.length > 0 && (
              <StatTiles
                tiles={[
                  { label: "Total", count: sentCounts.all, accent: "var(--text-heading)" },
                  { label: "Pending", count: sentCounts.pending, accent: "#d97706" },
                  { label: "Accepted", count: sentCounts.accepted, accent: "#16a34a" },
                  { label: "Cancelled", count: sentCounts.cancelled, accent: "#94a3b8" },
                ]}
              />
            )}

            {sentRequests !== null && (
              <FilterBar
                filters={SENT_FILTERS}
                filter={sentFilter}
                counts={sentCounts}
                sort={sentSort}
                onFilter={setSentFilter}
                onSort={setSentSort}
              />
            )}

            {sentRequests === null && !sentError && <Skeleton />}

            {sentRequests !== null && sentFiltered.length === 0 && (
              <EmptyState
                message={
                  sentFilter === "all"
                    ? "No sent requests yet"
                    : `No ${STATUS_LABEL[sentFilter as ConnectionStatus]?.toLowerCase()} requests`
                }
                sub={
                  sentFilter === "all"
                    ? "When you send a study session request to a partner it will appear here."
                    : "Switch to All to see requests in other states."
                }
              />
            )}

            {sentFiltered.length > 0 && (
              <div className="space-y-4">
                {sentFiltered.map((req) => (
                  <SentCard
                    key={req.id}
                    req={req}
                    confirmingId={confirmingId}
                    cancelBusy={cancelBusy}
                    onStartConfirm={(id) => {
                      setConfirmingId(id);
                      setCancelError("");
                    }}
                    onConfirm={cancelRequest}
                    onKeep={() => setConfirmingId(null)}
                  />
                ))}
                <p className="pt-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  Showing {sentFiltered.length} of {sentRequests?.length} request
                  {sentRequests?.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
