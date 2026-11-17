"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/app/dashboard/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/app/components/ThemeProvider";
import type { ReceivedRequest, SentRequest, ConnectionStatus } from "@/lib/connections/http";

/* -------------------------------------------------------------------------- */
/*  Helpers & constants                                                        */
/* -------------------------------------------------------------------------- */

type View = "received" | "sent";
type Filter = "all" | ConnectionStatus;
type SortDir = "desc" | "asc";

function formatTimeWindow(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const startT = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endT = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${startT} – ${endT}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Declined",
  blocked: "Blocked",
  cancelled: "Cancelled",
};

const STATUS_STYLE: Record<
  ConnectionStatus,
  { bg: string; color: string; border: string; dot: string }
> = {
  pending: {
    bg: "rgba(217,119,6,0.1)",
    color: "#b45309",
    border: "rgba(217,119,6,0.35)",
    dot: "#d97706",
  },
  accepted: {
    bg: "rgba(22,163,74,0.1)",
    color: "#15803d",
    border: "rgba(22,163,74,0.35)",
    dot: "#16a34a",
  },
  rejected: {
    bg: "rgba(220,38,38,0.1)",
    color: "#b91c1c",
    border: "rgba(220,38,38,0.35)",
    dot: "#dc2626",
  },
  blocked: {
    bg: "rgba(100,116,139,0.1)",
    color: "#64748b",
    border: "rgba(100,116,139,0.35)",
    dot: "#64748b",
  },
  cancelled: {
    bg: "rgba(100,116,139,0.07)",
    color: "#94a3b8",
    border: "rgba(100,116,139,0.2)",
    dot: "#94a3b8",
  },
};

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

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const ghostStyle = {
  backgroundColor: "var(--bg-card)",
  borderColor: "var(--border-card)",
  color: "var(--text-sub)",
} as const;

function countBy(list: { status: ConnectionStatus }[] | null): Record<Filter, number> {
  const base: Record<Filter, number> = {
    all: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    blocked: 0,
    cancelled: 0,
  };
  for (const r of list ?? []) {
    base.all += 1;
    base[r.status] = (base[r.status] ?? 0) + 1;
  }
  return base;
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                      */
/* -------------------------------------------------------------------------- */

function Icon({ d, size = 16 }: { d: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}

const icons = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </>
  ),
  moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
  check: <path d="m5 12 5 5L20 7" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  refresh: <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />,
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  send: <path d="m22 2-7 20-4-9-9-4Zm0 0L11 13" />,
};

/* -------------------------------------------------------------------------- */
/*  Presentational components                                                  */
/* -------------------------------------------------------------------------- */

function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.blocked;
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Avatar({ name, status }: { name: string | null | undefined; status: ConnectionStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.blocked;
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

function Toast({
  kind,
  text,
  onDismiss,
}: {
  kind: "error" | "success";
  text: string;
  onDismiss: () => void;
}) {
  const isError = kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className="mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm"
      style={
        isError
          ? {
              borderColor: "rgba(220,38,38,0.35)",
              backgroundColor: "rgba(220,38,38,0.1)",
              color: "#b91c1c",
            }
          : {
              borderColor: "rgba(22,163,74,0.4)",
              backgroundColor: "rgba(22,163,74,0.08)",
              color: "#15803d",
            }
      }
    >
      <span className="mt-0.5">
        <Icon d={isError ? icons.close : icons.check} />
      </span>
      <p className="flex-1 font-medium">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="opacity-60 transition hover:opacity-100"
        aria-label="Dismiss"
      >
        <Icon d={icons.close} size={14} />
      </button>
    </div>
  );
}

function StatTiles({ tiles }: { tiles: { label: string; count: number; accent: string }[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map(({ label, count, accent }) => (
        <div
          key={label}
          className="relative overflow-hidden rounded-2xl border px-5 py-4"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
        >
          <span
            className="absolute inset-y-0 left-0 w-1"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </p>
          <p
            className="mt-1 text-2xl font-bold tabular-nums tracking-tight"
            style={{ color: "var(--text-heading)" }}
          >
            {count}
          </p>
        </div>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading requests">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border p-5"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
        >
          <div className="flex gap-4">
            <div className="h-11 w-11 rounded-full" style={{ backgroundColor: "var(--bg-row)" }} />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-48 rounded" style={{ backgroundColor: "var(--bg-row)" }} />
              <div
                className="h-3 w-72 max-w-full rounded"
                style={{ backgroundColor: "var(--bg-row)" }}
              />
              <div className="h-3 w-40 rounded" style={{ backgroundColor: "var(--bg-row)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  message,
  sub,
  action,
}: {
  message: string;
  sub: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "var(--brand-soft-bg)", color: "var(--brand-strong)" }}
      >
        <Icon d={icons.inbox} size={24} />
      </div>
      <h2 className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>
        {message}
      </h2>
      <p className="mt-2 max-w-xs text-xs leading-6" style={{ color: "var(--text-muted)" }}>
        {sub}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Toolbar({
  filters,
  filter,
  counts,
  sort,
  query,
  onFilter,
  onSort,
  onQuery,
}: {
  filters: { key: Filter; label: string }[];
  filter: Filter;
  counts: Record<Filter, number>;
  sort: SortDir;
  query: string;
  onFilter: (f: Filter) => void;
  onSort: (s: SortDir) => void;
  onQuery: (q: string) => void;
}) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50">
            <Icon d={icons.search} size={15} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search by name, topic or message…"
            aria-label="Search requests"
            className="w-full rounded-xl border py-2.5 pl-10 pr-3.5 text-sm outline-none transition placeholder:opacity-40 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft-bg)]"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-card)",
              color: "var(--text-heading)",
            }}
          />
        </div>

        <div
          className="flex gap-1 rounded-xl border p-1"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
          role="group"
          aria-label="Sort order"
        >
          {(["desc", "asc"] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => onSort(dir)}
              aria-pressed={sort === dir}
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

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter requests by status">
        {filters.map(({ key, label }) => {
          const active = filter === key;
          const count = counts[key] ?? 0;
          if (key !== "all" && count === 0 && !active) return null;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onFilter(key)}
              className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition hover:opacity-90"
              style={{
                backgroundColor: active ? "var(--text-heading)" : "var(--bg-card)",
                color: active ? "var(--bg-page)" : "var(--text-sub)",
                borderColor: active ? "var(--text-heading)" : "var(--border-card)",
              }}
            >
              {label}
              <span
                className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] tabular-nums"
                style={{
                  background: active ? "rgba(255,255,255,0.25)" : "var(--bg-row)",
                  color: active ? "inherit" : "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Request cards                                                              */
/* -------------------------------------------------------------------------- */

function CardShell({
  children,
  accent,
  dim = 1,
  highlight,
}: {
  children: ReactNode;
  accent: string;
  dim?: number;
  highlight?: string;
}) {
  return (
    <article
      className="relative overflow-hidden rounded-2xl border p-5 pl-6 transition hover:shadow-md"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: highlight ?? "var(--border-card)",
        opacity: dim,
      }}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      {children}
    </article>
  );
}

function CardHeader({
  name,
  prefix,
  topic,
  status,
  timeWindow,
}: {
  name: string;
  prefix: "From" | "To";
  topic: string;
  status: ConnectionStatus;
  timeWindow: string | null;
}) {
  return (
    <div className="flex items-start gap-4">
      <Avatar name={name} status={status} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold" style={{ color: "var(--text-heading)" }}>
            {topic}
          </h3>
          <StatusBadge status={status} />
        </div>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {prefix}{" "}
          <span className="font-semibold" style={{ color: "var(--text-sub)" }}>
            {name}
          </span>
        </p>
        {timeWindow && (
          // suppressHydrationWarning: locale-formatted time differs between Node.js (server) and browser
          <p
            suppressHydrationWarning
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: "var(--bg-row)", color: "var(--text-sub)" }}
          >
            <Icon d={icons.calendar} size={13} />
            {timeWindow}
          </p>
        )}
      </div>
    </div>
  );
}

function MessageQuote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <blockquote
      className="mt-4 rounded-r-lg border-l-2 px-3 py-2 text-xs italic leading-5"
      style={{
        borderColor: "var(--brand)",
        backgroundColor: "var(--bg-card-inner)",
        color: "var(--text-muted)",
      }}
    >
      {message}
    </blockquote>
  );
}

function ReceivedCard({
  req,
  respondBusy,
  respondingId,
  onAccept,
  onDecline,
}: {
  req: ReceivedRequest;
  respondBusy: boolean;
  respondingId: string | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const isPending = req.status === "pending";
  const isResponding = respondingId === req.id && respondBusy;
  const name = req.requester_display_name ?? "A student";

  return (
    <CardShell accent={STATUS_STYLE[req.status]?.dot ?? "#64748b"} dim={isPending ? 1 : 0.88}>
      <CardHeader
        name={name}
        prefix="From"
        topic={req.session_topic || "Study session"}
        status={req.status}
        timeWindow={formatTimeWindow(req.proposed_start, req.proposed_end)}
      />
      <MessageQuote message={req.message} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p
          suppressHydrationWarning
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
          title={formatDate(req.created_at)}
        >
          Received {timeAgo(req.created_at)}
          {!isPending && (
            <span className="ml-2 opacity-70">
              · {STATUS_LABEL[req.status]} — no further action required
            </span>
          )}
        </p>

        {/* Respond buttons are only shown to the receiver (this is the Received tab) */}
        {isPending && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDecline(req.id)}
              disabled={respondBusy}
              className={`${btnBase} border hover:border-red-400 hover:text-red-500`}
              style={ghostStyle}
            >
              {isResponding ? <Spinner /> : <Icon d={icons.close} size={13} />}
              Decline
            </button>
            <button
              type="button"
              onClick={() => onAccept(req.id)}
              disabled={respondBusy}
              className={`${btnBase} shadow-sm hover:opacity-90`}
              style={{ backgroundColor: "#16a34a", color: "#fff" }}
            >
              {isResponding ? <Spinner /> : <Icon d={icons.check} size={13} />}
              Accept
            </button>
          </div>
        )}
      </div>
    </CardShell>
  );
}

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
  const isPending = req.status === "pending";
  const confirming = confirmingId === req.id;
  const name = req.receiver_display_name ?? "A student";

  return (
    <CardShell
      accent={STATUS_STYLE[req.status]?.dot ?? "#64748b"}
      dim={req.status === "cancelled" ? 0.7 : 1}
      highlight={confirming ? "rgba(220,38,38,0.4)" : undefined}
    >
      <CardHeader
        name={name}
        prefix="To"
        topic={req.session_topic || "Study session"}
        status={req.status}
        timeWindow={formatTimeWindow(req.proposed_start, req.proposed_end)}
      />
      <MessageQuote message={req.message} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p
          suppressHydrationWarning
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
          title={formatDate(req.created_at)}
        >
          Sent {timeAgo(req.created_at)}
          {req.status === "cancelled" && (
            <span className="ml-2 opacity-70">· Withdrawn by you</span>
          )}
        </p>

        {/* Cancel is only shown to the sender (this component only renders in the Sent tab) */}
        {isPending &&
          (confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: "#b91c1c" }}>
                Withdraw this request?
              </span>
              <button
                type="button"
                onClick={() => onConfirm(req.id)}
                disabled={cancelBusy}
                className={btnBase}
                style={{ backgroundColor: "#dc2626", color: "#fff" }}
              >
                {cancelBusy && <Spinner />}
                {cancelBusy ? "Cancelling…" : "Yes, cancel"}
              </button>
              <button
                type="button"
                onClick={onKeep}
                disabled={cancelBusy}
                className={`${btnBase} border`}
                style={ghostStyle}
              >
                Keep it
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onStartConfirm(req.id)}
              disabled={cancelBusy}
              className={`${btnBase} border hover:border-red-400 hover:text-red-500`}
              style={ghostStyle}
            >
              Cancel request
            </button>
          ))}
      </div>
    </CardShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

function matchesQuery(q: string, ...fields: (string | null | undefined)[]) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

export default function RequestsClient({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggle } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  };

  const [view, setView] = useState<View>("received");

  // received
  const [requests, setRequests] = useState<ReceivedRequest[] | null>(null);
  const [recvError, setRecvError] = useState("");
  const [recvFilter, setRecvFilter] = useState<Filter>("all");
  const [recvSort, setRecvSort] = useState<SortDir>("desc");
  const [recvQuery, setRecvQuery] = useState("");

  // sent
  const [sentRequests, setSentRequests] = useState<SentRequest[] | null>(null);
  const [sentError, setSentError] = useState("");
  const [sentFilter, setSentFilter] = useState<Filter>("all");
  const [sentSort, setSentSort] = useState<SortDir>("desc");
  const [sentQuery, setSentQuery] = useState("");

  // cancel flow
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // respond flow
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondBusy, setRespondBusy] = useState(false);
  const [respondError, setRespondError] = useState("");
  const [respondSuccess, setRespondSuccess] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  /* ------------------------------ Data loading ------------------------------ */

  const loadAll = useCallback(async (isLive: () => boolean = () => true) => {
    const fetchList = async (url: string) => {
      const r = await fetch(url, { headers: { "Content-Type": "application/json" } });
      return r.json();
    };

    await Promise.all([
      fetchList("/api/v1/connections")
        .then((data) => {
          if (!isLive()) return;
          if (data.error) setRecvError(data.error);
          else {
            setRecvError("");
            setRequests(data.requests ?? []);
          }
        })
        .catch(() => {
          if (isLive()) setRecvError("Unable to load requests. Please try again.");
        }),
      fetchList("/api/v1/connections/sent")
        .then((data) => {
          if (!isLive()) return;
          if (data.error) setSentError(data.error);
          else {
            setSentError("");
            setSentRequests(data.requests ?? []);
          }
        })
        .catch(() => {
          if (isLive()) setSentError("Unable to load sent requests. Please try again.");
        }),
    ]);
  }, []);

  useEffect(() => {
    let live = true;
    loadAll(() => live);
    return () => {
      live = false;
    };
  }, [loadAll]);

  // Open the Sent tab when arriving via /requests#sent. Read after mount to avoid a hydration mismatch.
  useEffect(() => {
    const apply = () => setView(window.location.hash === "#sent" ? "sent" : "received");
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  // Keep the URL hash in sync with the active tab, skipping the initial mount
  // so we don't rewrite a hash that just drove the state above.
  const hashSynced = useRef(false);
  useEffect(() => {
    if (!hashSynced.current) {
      hashSynced.current = true;
      return;
    }
    window.location.hash = view;
  }, [view]);

  // Auto-dismiss the success banner after 3s
  useEffect(() => {
    if (!respondSuccess) return;
    const t = setTimeout(() => setRespondSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [respondSuccess]);

  async function refresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  /* -------------------------------- Actions --------------------------------- */

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

  async function respondToRequest(id: string, action: "accept" | "decline") {
    setRespondingId(id);
    setRespondBusy(true);
    setRespondError("");
    setRespondSuccess("");
    try {
      const res = await fetch(`/api/v1/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRespondError(data.error ?? "Unable to respond. Please try again.");
        return;
      }
      const newStatus = action === "accept" ? ("accepted" as const) : ("rejected" as const);
      setRequests((prev) =>
        (prev ?? []).map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      setRespondSuccess(action === "accept" ? "Request accepted." : "Request declined.");
    } catch {
      setRespondError("Unable to respond. Please try again.");
    } finally {
      setRespondBusy(false);
      setRespondingId(null);
    }
  }

  function switchView(v: View) {
    setView(v);
    setCancelError("");
    setRespondError("");
    setRespondSuccess("");
    setConfirmingId(null);
  }

  /* ------------------------------- Derived data ------------------------------ */

  const recvCounts = useMemo(() => countBy(requests), [requests]);
  const sentCounts = useMemo(() => countBy(sentRequests), [sentRequests]);

  // Copy before sorting so React state is never mutated.
  const recvFiltered = useMemo(() => {
    return (requests ?? [])
      .filter((r) => recvFilter === "all" || r.status === recvFilter)
      .filter((r) => matchesQuery(recvQuery, r.requester_display_name, r.session_topic, r.message))
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return recvSort === "desc" ? -diff : diff;
      });
  }, [requests, recvFilter, recvQuery, recvSort]);

  const sentFiltered = useMemo(() => {
    return (sentRequests ?? [])
      .filter((r) => sentFilter === "all" || r.status === sentFilter)
      .filter((r) => matchesQuery(sentQuery, r.receiver_display_name, r.session_topic, r.message))
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sentSort === "desc" ? -diff : diff;
      });
  }, [sentRequests, sentFilter, sentQuery, sentSort]);

  /* --------------------------------- Render --------------------------------- */

  const tabs: { key: View; label: string; badge: number }[] = [
    { key: "received", label: "Received", badge: recvCounts.pending },
    { key: "sent", label: "Sent", badge: sentCounts.pending },
  ];

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-page)" }}
    >
      <Sidebar user={user} onSignOut={handleSignOut} />

      <main className="ml-64 min-h-screen px-8 py-10">
        <div className="mx-auto max-w-4xl">
          {/* ------------------------------ Header ------------------------------ */}
          <header className="flex items-start justify-between gap-4">
            <div>
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                <Link href="/dashboard" className="transition hover:opacity-80">
                  Dashboard
                </Link>
                <span aria-hidden="true">/</span>
                <span style={{ color: "var(--text-sub)" }}>Connection requests</span>
              </nav>
              <h1
                className="mt-3 text-3xl font-bold tracking-tight"
                style={{ color: "var(--text-heading)" }}
              >
                Connection requests
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                Review study session proposals you have received and track the ones you have sent.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                aria-label="Refresh requests"
                title="Refresh"
                className="flex h-10 w-10 items-center justify-center rounded-xl border transition hover:opacity-80 disabled:opacity-50"
                style={ghostStyle}
              >
                <span className={refreshing ? "animate-spin" : ""}>
                  <Icon d={icons.refresh} size={17} />
                </span>
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                className="flex h-10 w-10 items-center justify-center rounded-xl border transition hover:opacity-80"
                style={ghostStyle}
              >
                <Icon d={theme === "light" ? icons.sun : icons.moon} size={18} />
              </button>
            </div>
          </header>

          {/* ------------------------------- Tabs ------------------------------- */}
          <div
            role="tablist"
            aria-label="Request direction"
            className="mb-6 mt-7 flex w-fit gap-1 rounded-2xl border p-1"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
          >
            {tabs.map(({ key, label, badge }) => {
              const isActive = view === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => switchView(key)}
                  className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition"
                  style={{
                    backgroundColor: isActive ? "var(--brand)" : "transparent",
                    color: isActive ? "var(--brand-fg)" : "var(--text-sub)",
                  }}
                >
                  <Icon d={key === "received" ? icons.inbox : icons.send} size={15} />
                  {label}
                  {badge > 0 && (
                    <span
                      className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] tabular-nums"
                      style={{
                        backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "var(--brand)",
                        color: isActive ? "inherit" : "var(--brand-fg)",
                      }}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* --------------------------- Received view -------------------------- */}
          {view === "received" && (
            <section aria-label="Received requests">
              {recvError && (
                <Toast kind="error" text={recvError} onDismiss={() => setRecvError("")} />
              )}
              {respondError && (
                <Toast kind="error" text={respondError} onDismiss={() => setRespondError("")} />
              )}
              {respondSuccess && (
                <Toast
                  kind="success"
                  text={respondSuccess}
                  onDismiss={() => setRespondSuccess("")}
                />
              )}

              {requests !== null && requests.length > 0 && (
                <StatTiles
                  tiles={[
                    { label: "Total", count: recvCounts.all, accent: "var(--text-muted)" },
                    { label: "Pending", count: recvCounts.pending, accent: "#d97706" },
                    { label: "Accepted", count: recvCounts.accepted, accent: "#16a34a" },
                    { label: "Declined", count: recvCounts.rejected, accent: "#dc2626" },
                  ]}
                />
              )}

              {requests !== null && requests.length > 0 && (
                <Toolbar
                  filters={RECEIVED_FILTERS}
                  filter={recvFilter}
                  counts={recvCounts}
                  sort={recvSort}
                  query={recvQuery}
                  onFilter={setRecvFilter}
                  onSort={setRecvSort}
                  onQuery={setRecvQuery}
                />
              )}

              {requests === null && !recvError && <Skeleton />}

              {requests !== null && recvFiltered.length === 0 && (
                <EmptyState
                  message={
                    requests.length === 0
                      ? "No connection requests yet"
                      : recvQuery
                        ? "No requests match your search"
                        : `No ${STATUS_LABEL[recvFilter as ConnectionStatus]?.toLowerCase()} requests`
                  }
                  sub={
                    requests.length === 0
                      ? "When another student sends you a study session request it will appear here."
                      : "Try clearing the search or switching to All to see requests in other states."
                  }
                  action={
                    requests.length > 0 ? (
                      <button
                        type="button"
                        className={`${btnBase} border`}
                        style={ghostStyle}
                        onClick={() => {
                          setRecvFilter("all");
                          setRecvQuery("");
                        }}
                      >
                        Clear filters
                      </button>
                    ) : undefined
                  }
                />
              )}

              {recvFiltered.length > 0 && (
                <div className="space-y-4">
                  {recvFiltered.map((req) => (
                    <ReceivedCard
                      key={req.id}
                      req={req}
                      respondBusy={respondBusy}
                      respondingId={respondingId}
                      onAccept={(id) => respondToRequest(id, "accept")}
                      onDecline={(id) => respondToRequest(id, "decline")}
                    />
                  ))}
                  <p className="pt-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                    Showing {recvFiltered.length} of {requests?.length} request
                    {requests?.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* ----------------------------- Sent view ---------------------------- */}
          {view === "sent" && (
            <section aria-label="Sent requests">
              {cancelError && (
                <Toast kind="error" text={cancelError} onDismiss={() => setCancelError("")} />
              )}
              {sentError && (
                <Toast kind="error" text={sentError} onDismiss={() => setSentError("")} />
              )}

              {sentRequests !== null && sentRequests.length > 0 && (
                <StatTiles
                  tiles={[
                    { label: "Total", count: sentCounts.all, accent: "var(--text-muted)" },
                    { label: "Pending", count: sentCounts.pending, accent: "#d97706" },
                    { label: "Accepted", count: sentCounts.accepted, accent: "#16a34a" },
                    { label: "Cancelled", count: sentCounts.cancelled, accent: "#94a3b8" },
                  ]}
                />
              )}

              {sentRequests !== null && sentRequests.length > 0 && (
                <Toolbar
                  filters={SENT_FILTERS}
                  filter={sentFilter}
                  counts={sentCounts}
                  sort={sentSort}
                  query={sentQuery}
                  onFilter={setSentFilter}
                  onSort={setSentSort}
                  onQuery={setSentQuery}
                />
              )}

              {sentRequests === null && !sentError && <Skeleton />}

              {sentRequests !== null && sentFiltered.length === 0 && (
                <EmptyState
                  message={
                    sentRequests.length === 0
                      ? "No sent requests yet"
                      : sentQuery
                        ? "No requests match your search"
                        : `No ${STATUS_LABEL[sentFilter as ConnectionStatus]?.toLowerCase()} requests`
                  }
                  sub={
                    sentRequests.length === 0
                      ? "When you send a study session request to a partner it will appear here."
                      : "Try clearing the search or switching to All to see requests in other states."
                  }
                  action={
                    sentRequests.length === 0 ? (
                      <Link
                        href="/partners"
                        className={`${btnBase} shadow-sm hover:opacity-90`}
                        style={{ backgroundColor: "var(--brand)", color: "var(--brand-fg)" }}
                      >
                        Find a study partner
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={`${btnBase} border`}
                        style={ghostStyle}
                        onClick={() => {
                          setSentFilter("all");
                          setSentQuery("");
                        }}
                      >
                        Clear filters
                      </button>
                    )
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
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
