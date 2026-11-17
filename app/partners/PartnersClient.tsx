"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Goal, GoalInput, rankCandidates, Slot } from "@/lib/matching/engine";
import type {
  MatchingCategory,
  MatchingFieldError,
  ProficiencyLevel,
} from "@/lib/matching/information";
import { Sidebar } from "@/app/dashboard/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/app/components/ThemeProvider";

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                          */
/* -------------------------------------------------------------------------- */

type Match = ReturnType<typeof rankCandidates>[number];
type ExamDatesValue = Pick<GoalInput, "exam_date" | "prep_start" | "prep_end">;
type Notice = { kind: "error" | "success"; text: string } | null;

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const categoryLabels: Record<MatchingCategory, string> = {
  course: "Course study",
  exam_prep: "Exam preparation",
  skill_practice: "Skill / language practice",
};

const categoryHints: Record<MatchingCategory, string> = {
  course: "Topics & assignments",
  exam_prep: "Dates & prep window",
  skill_practice: "Languages & skills",
};

const examDateFields = [
  ["exam_date", "Exam date"],
  ["prep_start", "Preparation start"],
  ["prep_end", "Preparation end"],
] as const;

const blank: GoalInput = {
  information_version: 2,
  category: "course",
  subject_or_skill: "",
  proficiency_level: "beginner",
  mode: "course",
  display_name: "",
  institution: "",
  course_code: "",
  topic: "",
  assignment_id: null,
  due_date: null,
  timezone: "America/New_York",
  location_preference: "online",
  location: "",
  is_listed: false,
  availability: [
    {
      weekday: 0,
      start_time: "14:00",
      end_time: "16:00",
      timezone: "America/New_York",
    },
  ],
};

const sessionTimePattern = "[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}";

const inputClass =
  "w-full rounded-xl border px-3.5 py-2.5 mt-1.5 text-sm outline-none transition bg-[var(--bg-card-inner)] border-[var(--border-card)] text-[var(--text-heading)] placeholder:opacity-40 focus:ring-4 focus:ring-[var(--brand-soft-bg)] focus:border-[var(--brand)] disabled:opacity-60";

const labelClass = "block text-[13px] font-medium";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function parseSessionTime(value: string) {
  if (!new RegExp(`^${sessionTimePattern}$`).test(value)) return null;
  const isoLocal = value.replace(" ", "T");
  const date = new Date(isoLocal);
  if (!Number.isFinite(date.getTime())) return null;
  // Reject rolled-over dates and local times that do not exist during a DST change.
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16) === isoLocal ? date : null;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: MatchingFieldError[] = []
  ) {
    super(message);
  }
}

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.error ?? "Request failed. Please try again.", data.field_errors ?? []);
  return data;
}

function goalTitle(g: Goal) {
  return g.category && g.category !== "course"
    ? g.subject_or_skill
    : `${g.course_code} · ${g.mode === "assignment" ? g.assignment_id : g.topic}`;
}

function componentLabel(key: string, category: Match["category"]) {
  if (key !== "topic") return key;
  if (category === "exam_prep") return "Exam subject";
  if (category === "skill_practice") return "Skill or language";
  return "Topic";
}

function scoreTone(score: number) {
  if (score >= 80) return "#16a34a";
  if (score >= 55) return "#d97706";
  return "#64748b";
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
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  heart: (
    <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  send: <path d="m22 2-7 20-4-9-9-4Zm0 0L11 13" />,
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </>
  ),
  play: <path d="m7 4 13 8-13 8Z" />,
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
};

/* -------------------------------------------------------------------------- */
/*  Small presentational components                                            */
/* -------------------------------------------------------------------------- */

function Card({
  children,
  className = "",
  inner = false,
}: {
  children: ReactNode;
  className?: string;
  inner?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{
        backgroundColor: inner ? "var(--bg-card-inner)" : "var(--bg-card)",
        borderColor: "var(--border-card)",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({
  step,
  title,
  description,
}: {
  step?: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {step !== undefined && (
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: "var(--brand-soft-bg)", color: "var(--brand-strong)" }}
        >
          {step}
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warn";
}) {
  const styles: Record<string, React.CSSProperties> = {
    neutral: {
      backgroundColor: "var(--bg-row)",
      color: "var(--text-sub)",
      borderColor: "var(--border-card)",
    },
    brand: {
      backgroundColor: "var(--brand-soft-bg)",
      color: "var(--brand-strong)",
      borderColor: "var(--brand-soft-border)",
    },
    success: {
      backgroundColor: "rgba(22,163,74,0.12)",
      color: "#16a34a",
      borderColor: "rgba(22,163,74,0.3)",
    },
    warn: {
      backgroundColor: "rgba(217,119,6,0.12)",
      color: "#d97706",
      borderColor: "rgba(217,119,6,0.3)",
    },
  };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
      style={styles[tone]}
    >
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function ScoreRing({ score }: { score: number }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const color = scoreTone(score);
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Compatibility score ${score}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-card)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-sm font-bold"
        style={{ color: "var(--text-heading)" }}
      >
        {Math.round(score)}
      </span>
    </div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        <span className="font-semibold" style={{ color: "var(--text-heading)" }}>
          {value}/100
        </span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--border-card)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: scoreTone(value) }}
        />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="animate-pulse p-5">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full" style={{ backgroundColor: "var(--bg-row)" }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded" style={{ backgroundColor: "var(--bg-row)" }} />
          <div className="h-3 w-2/3 rounded" style={{ backgroundColor: "var(--bg-row)" }} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 rounded" style={{ backgroundColor: "var(--bg-row)" }} />
        ))}
      </div>
    </Card>
  );
}

function EmptyState({ title, body, icon }: { title: string; body: string; icon: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center" inner>
      <span
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "var(--brand-soft-bg)", color: "var(--brand-strong)" }}
      >
        <Icon d={icon} size={22} />
      </span>
      <p className="mt-4 text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
        {title}
      </p>
      <p className="mt-1 max-w-sm text-sm" style={{ color: "var(--text-muted)" }}>
        {body}
      </p>
    </Card>
  );
}

function TextField({
  label,
  value,
  onChange,
  max,
  required = true,
  error,
  id,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  required?: boolean;
  error?: string;
  id: string;
  hint?: string;
}) {
  return (
    <label className={labelClass}>
      <span style={{ color: "var(--text-sub)" }}>
        {label}
        {!required && <span className="ml-1 opacity-50">(optional)</span>}
      </span>
      <input
        className={inputClass}
        required={required}
        maxLength={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {hint && !error && (
        <span className="mt-1 block text-xs" style={{ color: "var(--text-muted)" }}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="mt-1 block text-xs text-red-500">
          {error}
        </span>
      )}
    </label>
  );
}

function ExamDates({
  values,
  onChange,
}: {
  values: ExamDatesValue;
  onChange: (key: (typeof examDateFields)[number][0], value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {examDateFields.map(([key, label]) => (
        <label key={key} className={labelClass}>
          <span style={{ color: "var(--text-sub)" }}>{label}</span>
          <input
            type="text"
            placeholder="YYYY-MM-DD"
            pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
            maxLength={10}
            title="Enter the date in YYYY-MM-DD format."
            required
            className={inputClass}
            value={values[key] ?? ""}
            onChange={(event) => onChange(key, event.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

function Banner({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  if (!notice) return null;
  const isError = notice.kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className="mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm"
      style={
        isError
          ? {
              borderColor: "rgba(220,38,38,0.35)",
              backgroundColor: "rgba(220,38,38,0.1)",
              color: "#b91c1c",
            }
          : {
              borderColor: "var(--brand-soft-border)",
              backgroundColor: "var(--brand-soft-bg)",
              color: "var(--brand-strong)",
            }
      }
    >
      <span className="mt-0.5">
        <Icon d={isError ? icons.close : icons.check} />
      </span>
      <p className="flex-1">{notice.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="opacity-60 transition hover:opacity-100"
        aria-label="Dismiss message"
      >
        <Icon d={icons.close} size={14} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function PartnersClient({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggle } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  };

  // Form & data
  const [form, setForm] = useState<GoalInput>(blank);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selected, setSelected] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [searchMessage, setSearchMessage] = useState("");

  // Status
  const [notice, setNotice] = useState<Notice>(null);
  const [fieldErrors, setFieldErrors] = useState<MatchingFieldError[]>([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);

  // Exam dates editing
  const [examEdit, setExamEdit] = useState<ExamDatesValue | null>(null);

  // Connection modal
  const [connectTarget, setConnectTarget] = useState<Match | null>(null);
  const [connectForm, setConnectForm] = useState({
    session_topic: "",
    proposed_start: "",
    proposed_end: "",
    message: "",
  });
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectFieldErrors, setConnectFieldErrors] = useState<MatchingFieldError[]>([]);
  const [sentConnections, setSentConnections] = useState<
    Record<string, { id: string; status: string }>
  >({});
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);

  // Favorites
  const [favoriteGoalIds, setFavoriteGoalIds] = useState<string[]>([]);
  const [favoriteBusy, setFavoriteBusy] = useState<string | null>(null);
  const [favoriteMessages, setFavoriteMessages] = useState<Record<string, string>>({});

  const showError = useCallback((text: string) => setNotice({ kind: "error", text }), []);
  const showSuccess = useCallback((text: string) => setNotice({ kind: "success", text }), []);

  /* ----------------------------- Initial loading ---------------------------- */

  useEffect(() => {
    let live = true;
    Promise.all([
      api("/api/v1/matching-goals"),
      api("/api/v1/matching-status"),
      api("/api/v1/favorites"),
    ])
      .then(([goalData, statusData, favoriteData]) => {
        if (!live) return;
        setGoals(goalData.goals);
        setPaused(statusData.paused);
        setFavoriteGoalIds(
          favoriteData.favorites.flatMap(
            (favorite: { candidate_goal_ids: string[] }) => favorite.candidate_goal_ids
          )
        );
      })
      .catch((e) => {
        if (live) showError(e instanceof Error ? e.message : "Unable to load your data.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [showError]);

  // Close the modal with Escape and lock background scroll while it is open.
  useEffect(() => {
    if (!connectTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !connectBusy) setConnectTarget(null);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [connectTarget, connectBusy]);

  /* -------------------------------- Handlers -------------------------------- */

  function change<K extends keyof GoalInput>(key: K, value: GoalInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function slot(index: number, patch: Partial<Slot>) {
    change(
      "availability",
      form.availability.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function errorFor(name: string) {
    return fieldErrors.find((item) => item.field === name)?.message;
  }

  async function toggleMatchingPause() {
    setPauseBusy(true);
    setNotice(null);
    try {
      const data = await api("/api/v1/matching-status", {
        method: "PATCH",
        body: JSON.stringify({ paused: !paused }),
      });
      setPaused(data.paused);
      showSuccess(
        data.paused
          ? "Matching paused. Your existing requests are unchanged, but you are hidden from new partner searches."
          : "Matching resumed. Your listed goals can appear in new partner searches again."
      );
    } catch (e) {
      showError(e instanceof Error ? e.message : "Unable to update matching status.");
    } finally {
      setPauseBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setFieldErrors([]);
    try {
      const saved = await api("/api/v1/matching-goals", {
        method: "POST",
        body: JSON.stringify(
          form.category === "exam_prep"
            ? form
            : { ...form, exam_date: null, prep_start: null, prep_end: null }
        ),
      });
      const data = await api("/api/v1/matching-goals");
      setGoals(data.goals);
      setSelected(saved.id);
      setMatches(null);
      setSearchMessage("");
      showSuccess("Goal saved. Select Find partners to search.");
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
      showError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }

  async function saveExamDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api("/api/v1/matching-goals", {
        method: "PATCH",
        body: JSON.stringify({ goal_id: selected, ...examEdit }),
      });
      setGoals((current) =>
        current.map((goal) => (goal.id === selected ? { ...goal, ...examEdit } : goal))
      );
      setMatches(null);
      setExamEdit(null);
      showSuccess("Exam dates saved. Select Find partners to search again.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Unable to update exam dates.");
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    setSearching(true);
    setNotice(null);
    setMatches(null);
    setSearchMessage("");
    try {
      const data = await api("/api/v1/matches", {
        method: "POST",
        body: JSON.stringify({ goal_id: selected }),
      });
      setMatches(data.matches);
      setSearchMessage(data.message ?? "");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Unable to search.");
    } finally {
      setSearching(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this goal from matching? This cannot be undone.")) return;
    setBusy(true);
    setNotice(null);
    try {
      await api("/api/v1/matching-goals", {
        method: "DELETE",
        body: JSON.stringify({ goal_id: id }),
      });
      setGoals((g) => g.filter((x) => x.id !== id));
      if (selected === id) {
        setSelected("");
        setMatches(null);
        setSearchMessage("");
        showSuccess("Goal removed from matching.");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Unable to remove.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleFavorite(m: Match) {
    const goalId = m.candidate_goal_id;
    const isFavorite = favoriteGoalIds.includes(goalId);

    if (isFavorite && !window.confirm(`Remove ${m.display_name} from your favorites?`)) return;

    setFavoriteBusy(goalId);
    setFavoriteMessages((prev) => ({ ...prev, [goalId]: "" }));
    try {
      const result = await api("/api/v1/favorites", {
        method: isFavorite ? "DELETE" : "POST",
        body: JSON.stringify({ candidate_goal_id: goalId }),
      });
      setFavoriteGoalIds((prev) =>
        isFavorite
          ? prev.filter((id) => id !== goalId)
          : prev.includes(goalId)
            ? prev
            : [...prev, goalId]
      );
      setFavoriteMessages((prev) => ({
        ...prev,
        [goalId]:
          result.message ?? (isFavorite ? "Removed from favorites." : "Added to favorites."),
      }));
    } catch (e) {
      setFavoriteMessages((prev) => ({
        ...prev,
        [goalId]: e instanceof Error ? e.message : "Unable to update favorites.",
      }));
    } finally {
      setFavoriteBusy(null);
    }
  }

  function openConnect(m: Match) {
    setConnectForm({
      session_topic: m.topic ?? m.subject_or_skill ?? "",
      proposed_start: "",
      proposed_end: "",
      message: "",
    });
    setConnectError("");
    setConnectFieldErrors([]);
    setConnectTarget(m);
  }

  async function sendRequest(e: FormEvent) {
    e.preventDefault();
    if (!connectTarget || !selected) return;
    const start = parseSessionTime(connectForm.proposed_start);
    const end = parseSessionTime(connectForm.proposed_end);
    setConnectError("");
    setConnectFieldErrors([]);
    if (!start || !end) {
      const message = "Enter a valid date and time in YYYY-MM-DD HH:MM format.";
      const fields: MatchingFieldError[] = [];
      if (!start) fields.push({ field: "proposed_start", code: "INVALID_VALUE", message });
      if (!end) fields.push({ field: "proposed_end", code: "INVALID_VALUE", message });
      setConnectFieldErrors(fields);
      return;
    }

    setConnectBusy(true);
    try {
      const result = await api("/api/v1/connections", {
        method: "POST",
        body: JSON.stringify({
          goal_id: selected,
          candidate_goal_id: connectTarget.candidate_goal_id,
          session_topic: connectForm.session_topic,
          proposed_start: start.toISOString(),
          proposed_end: end.toISOString(),
          message: connectForm.message || undefined,
        }),
      });
      const cgid = connectTarget.candidate_goal_id;
      setSentConnections((prev) => ({ ...prev, [cgid]: { id: result.id, status: "pending" } }));
      setConnectTarget(null);
      showSuccess(`Request sent to ${connectTarget.display_name}.`);
    } catch (err) {
      if (err instanceof ApiError) setConnectFieldErrors(err.fieldErrors);
      setConnectError(err instanceof Error ? err.message : "Unable to send request.");
    } finally {
      setConnectBusy(false);
    }
  }

  async function cancelRequest(candidateGoalId: string, sent: { id: string; status: string }) {
    setCancelBusy(candidateGoalId);
    try {
      const res = await fetch(`/api/v1/connections/${sent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to cancel the request.");
      }
      setSentConnections((prev) => ({
        ...prev,
        [candidateGoalId]: { ...sent, status: "cancelled" },
      }));
    } catch (e) {
      showError(e instanceof Error ? e.message : "Unable to cancel the request.");
    } finally {
      setCancelBusy(null);
    }
  }

  /* ------------------------------- Derived data ------------------------------ */

  const selectedGoal = goals.find((goal) => goal.id === selected);
  const selectedSupportsSearch =
    !selectedGoal ||
    selectedGoal.information_version === 1 ||
    selectedGoal.category === "course" ||
    selectedGoal.category === "exam_prep" ||
    selectedGoal.category === "skill_practice";

  const stats = useMemo(
    () => [
      { label: "Saved goals", value: goals.length },
      { label: "Listed goals", value: goals.filter((g) => g.is_listed).length },
      { label: "Favorites", value: favoriteGoalIds.length },
      {
        label: "Requests sent",
        value: Object.values(sentConnections).filter((s) => s.status === "pending").length,
      },
    ],
    [goals, favoriteGoalIds, sentConnections]
  );

  /* --------------------------------- Render --------------------------------- */

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-page)" }}
    >
      <Sidebar user={user} onSignOut={handleSignOut} />

      <main className="ml-64 min-h-screen px-8 py-10">
        <div className="mx-auto max-w-6xl">
          {/* ----------------------------- Page header ---------------------------- */}
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
                <span style={{ color: "var(--text-sub)" }}>Partner matching</span>
              </nav>
              <h1
                className="mt-3 text-3xl font-bold tracking-tight"
                style={{ color: "var(--text-heading)" }}
              >
                Find a study partner
              </h1>
              <p
                className="mt-2 max-w-2xl text-sm leading-6"
                style={{ color: "var(--text-muted)" }}
              >
                Describe what you are studying, share when you are free, and get ranked matches for
                course topics, assignments, exam preparation, and skill or language practice.
              </p>
            </div>

            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition hover:opacity-80"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-card)",
                color: "var(--text-sub)",
              }}
            >
              <Icon d={theme === "light" ? icons.sun : icons.moon} size={18} />
            </button>
          </header>

          {/* ------------------------------ Stats strip --------------------------- */}
          <section aria-label="Overview" className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="px-5 py-4">
                <p
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.label}
                </p>
                <p
                  className="mt-1 text-2xl font-bold tabular-nums"
                  style={{ color: "var(--text-heading)" }}
                >
                  {loading ? "–" : s.value}
                </p>
              </Card>
            ))}
          </section>

          {/* --------------------------- Visibility control ----------------------- */}
          <Card className="mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: paused ? "rgba(217,119,6,0.12)" : "rgba(22,163,74,0.12)",
                  color: paused ? "#d97706" : "#16a34a",
                }}
              >
                <Icon d={paused ? icons.pause : icons.globe} size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                    Matching visibility
                  </h2>
                  <Chip tone={paused ? "warn" : "success"}>{paused ? "Paused" : "Active"}</Chip>
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  {paused
                    ? "Your listed goals are hidden from new searches. Existing requests are unchanged."
                    : "Your listed goals can appear in compatible partner searches."}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={loading || pauseBusy}
              onClick={toggleMatchingPause}
              className={`${ghostBtn} shrink-0`}
              style={{
                backgroundColor: "var(--bg-row)",
                borderColor: "var(--border-card)",
                color: "var(--text-sub)",
              }}
            >
              {pauseBusy ? <Spinner /> : <Icon d={paused ? icons.play : icons.pause} size={14} />}
              {pauseBusy ? "Updating…" : paused ? "Resume matching" : "Pause matching"}
            </button>
          </Card>

          <Banner notice={notice} onDismiss={() => setNotice(null)} />

          {/* ------------------------------- Workspace ---------------------------- */}
          <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* ----------------------------- Goal form ---------------------------- */}
            <Card className="p-6 lg:sticky lg:top-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-heading)" }}>
                  New matching goal
                </h2>
                <Chip tone="brand">Step 1</Chip>
              </div>

              <form onSubmit={save} className="mt-5 space-y-6">
                {/* 1 — Category */}
                <div className="space-y-3">
                  <SectionTitle step={1} title="What are you working on?" />
                  <div
                    role="radiogroup"
                    aria-label="Learning goal category"
                    className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                  >
                    {(Object.keys(categoryLabels) as MatchingCategory[]).map((category) => {
                      const active = form.category === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              category,
                              mode: category === "course" ? "course" : null,
                              institution: category === "course" ? current.institution : null,
                              course_code: category === "course" ? current.course_code : null,
                              topic: category === "course" ? current.topic : null,
                              assignment_id: null,
                              due_date: null,
                            }));
                            setFieldErrors([]);
                          }}
                          className="rounded-xl border p-3 text-left transition hover:opacity-90"
                          style={{
                            backgroundColor: active
                              ? "var(--brand-soft-bg)"
                              : "var(--bg-card-inner)",
                            borderColor: active ? "var(--brand)" : "var(--border-card)",
                            color: active ? "var(--brand-strong)" : "var(--text-sub)",
                          }}
                        >
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                            <Icon
                              d={
                                category === "course"
                                  ? icons.book
                                  : category === "exam_prep"
                                    ? icons.target
                                    : icons.globe
                              }
                              size={14}
                            />
                            {categoryLabels[category]}
                          </span>
                          <span className="mt-1 block text-[11px] opacity-70">
                            {categoryHints[category]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errorFor("category") && (
                    <p className="text-xs text-red-500">{errorFor("category")}</p>
                  )}
                </div>

                {/* 2 — Details */}
                <div className="space-y-4">
                  <SectionTitle step={2} title="Goal details" />
                  {form.category === "exam_prep" && <ExamDates values={form} onChange={change} />}

                  <TextField
                    id="display_name"
                    label="Display name"
                    max={100}
                    value={form.display_name ?? ""}
                    onChange={(v) => change("display_name", v)}
                    error={errorFor("display_name")}
                    hint="Shown to potential partners."
                  />
                  <TextField
                    id="subject_or_skill"
                    label="Subject or skill"
                    max={120}
                    value={form.subject_or_skill ?? ""}
                    onChange={(v) => change("subject_or_skill", v)}
                    error={errorFor("subject_or_skill")}
                  />

                  <label className={labelClass}>
                    <span style={{ color: "var(--text-sub)" }}>Proficiency level</span>
                    <select
                      className={inputClass}
                      value={form.proficiency_level ?? ""}
                      onChange={(e) =>
                        change("proficiency_level", e.target.value as ProficiencyLevel)
                      }
                      aria-invalid={Boolean(errorFor("proficiency_level"))}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    {errorFor("proficiency_level") && (
                      <span className="mt-1 block text-xs text-red-500">
                        {errorFor("proficiency_level")}
                      </span>
                    )}
                  </label>

                  {form.category === "course" && (
                    <Card inner className="space-y-4 p-4">
                      <label className={labelClass}>
                        <span style={{ color: "var(--text-sub)" }}>Course goal type</span>
                        <select
                          className={inputClass}
                          value={form.mode ?? "course"}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              mode: e.target.value as GoalInput["mode"],
                              assignment_id: null,
                              due_date: null,
                            })
                          }
                        >
                          <option value="course">Course topic</option>
                          <option value="assignment">Assignment</option>
                        </select>
                        {errorFor("mode") && (
                          <span className="mt-1 block text-xs text-red-500">
                            {errorFor("mode")}
                          </span>
                        )}
                      </label>
                      <TextField
                        id="institution"
                        label="University / institution"
                        max={120}
                        value={form.institution ?? ""}
                        onChange={(v) => change("institution", v)}
                        error={errorFor("institution")}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          id="course_code"
                          label="Course code"
                          max={40}
                          value={form.course_code ?? ""}
                          onChange={(v) => change("course_code", v)}
                          error={errorFor("course_code")}
                        />
                        <TextField
                          id="topic"
                          label="Course topic"
                          max={200}
                          value={form.topic ?? ""}
                          onChange={(v) => change("topic", v)}
                          error={errorFor("topic")}
                        />
                      </div>
                      {form.mode === "assignment" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className={labelClass}>
                            <span style={{ color: "var(--text-sub)" }}>Assignment ID</span>
                            <input
                              className={inputClass}
                              maxLength={100}
                              required
                              value={form.assignment_id ?? ""}
                              onChange={(e) => change("assignment_id", e.target.value)}
                            />
                            <span
                              className="mt-1 block text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Exact, case-sensitive.
                            </span>
                          </label>
                          <label className={labelClass}>
                            <span style={{ color: "var(--text-sub)" }}>Due date</span>
                            <input
                              type="text"
                              placeholder="YYYY-MM-DD"
                              pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                              maxLength={10}
                              title="Enter the due date in YYYY-MM-DD format."
                              className={inputClass}
                              required
                              value={form.due_date ?? ""}
                              onChange={(e) => change("due_date", e.target.value)}
                            />
                            <span
                              className="mt-1 block text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              End of day in goal timezone.
                            </span>
                          </label>
                        </div>
                      )}
                    </Card>
                  )}
                </div>

                {/* 3 — Schedule & location */}
                <div className="space-y-4">
                  <SectionTitle step={3} title="Schedule & location" />
                  <TextField
                    id="timezone"
                    label="Goal timezone"
                    max={80}
                    value={form.timezone ?? ""}
                    onChange={(v) => change("timezone", v)}
                    error={errorFor("timezone")}
                    hint="IANA name, e.g. America/New_York"
                  />

                  <label className={labelClass}>
                    <span style={{ color: "var(--text-sub)" }}>Location preference</span>
                    <select
                      className={inputClass}
                      value={form.location_preference}
                      onChange={(e) =>
                        change(
                          "location_preference",
                          e.target.value as GoalInput["location_preference"]
                        )
                      }
                    >
                      <option value="online">Online</option>
                      <option value="in_person">In person</option>
                      <option value="either">Either</option>
                    </select>
                    {errorFor("location_preference") && (
                      <span className="mt-1 block text-xs text-red-500">
                        {errorFor("location_preference")}
                      </span>
                    )}
                  </label>

                  {form.location_preference !== "online" && (
                    <TextField
                      id="location"
                      label="Meeting location"
                      max={120}
                      required={form.location_preference === "in_person"}
                      value={form.location ?? ""}
                      onChange={(v) => change("location", v)}
                      error={errorFor("location")}
                      hint="Required for in-person meetings."
                    />
                  )}

                  <fieldset className="space-y-3">
                    <legend className="mb-1 flex w-full items-center justify-between text-[13px] font-medium">
                      <span style={{ color: "var(--text-sub)" }}>Weekly availability</span>
                      <span className="text-xs opacity-60">
                        {form.availability.length}/21 slots
                      </span>
                    </legend>

                    {form.availability.map((s, i) => (
                      <Card inner key={i} className="space-y-3 p-3.5">
                        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                          <label className={labelClass}>
                            <span style={{ color: "var(--text-sub)" }}>Day</span>
                            <select
                              className={inputClass}
                              value={s.weekday}
                              onChange={(e) => slot(i, { weekday: Number(e.target.value) })}
                            >
                              {weekdays.map((d, j) => (
                                <option value={j} key={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          </label>
                          {form.availability.length > 1 && (
                            <button
                              type="button"
                              className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-xl border text-red-500 transition hover:opacity-70"
                              style={{ borderColor: "var(--border-card)" }}
                              aria-label={`Remove slot ${i + 1}`}
                              onClick={() =>
                                change(
                                  "availability",
                                  form.availability.filter((_, j) => i !== j)
                                )
                              }
                            >
                              <Icon d={icons.trash} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className={labelClass}>
                            <span style={{ color: "var(--text-sub)" }}>Start</span>
                            <input
                              className={inputClass}
                              type="time"
                              required
                              value={s.start_time}
                              onChange={(e) => slot(i, { start_time: e.target.value })}
                            />
                          </label>
                          <label className={labelClass}>
                            <span style={{ color: "var(--text-sub)" }}>End</span>
                            <input
                              className={inputClass}
                              type="time"
                              required
                              value={s.end_time}
                              onChange={(e) => slot(i, { end_time: e.target.value })}
                            />
                          </label>
                        </div>
                        <label className={labelClass}>
                          <span style={{ color: "var(--text-sub)" }}>Slot timezone</span>
                          <input
                            className={inputClass}
                            required
                            value={s.timezone}
                            onChange={(e) => slot(i, { timezone: e.target.value })}
                          />
                        </label>
                      </Card>
                    ))}

                    <button
                      type="button"
                      disabled={form.availability.length >= 21}
                      className={`${ghostBtn} w-full border-dashed`}
                      style={{ borderColor: "var(--brand-soft-border)", color: "var(--brand)" }}
                      onClick={() =>
                        change("availability", [
                          ...form.availability,
                          {
                            weekday: 0,
                            start_time: "14:00",
                            end_time: "16:00",
                            timezone: form.timezone,
                          },
                        ])
                      }
                    >
                      <Icon d={icons.plus} size={14} /> Add availability
                    </button>
                  </fieldset>
                </div>

                {/* 4 — Visibility */}
                <div className="space-y-3">
                  <SectionTitle step={4} title="Visibility" />
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm"
                    style={{
                      backgroundColor: "var(--bg-card-inner)",
                      borderColor: "var(--border-card)",
                    }}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={form.is_listed}
                      onChange={(e) => change("is_listed", e.target.checked)}
                    />
                    <span>
                      <span className="font-medium" style={{ color: "var(--text-heading)" }}>
                        List this goal for other students
                      </span>
                      <span className="mt-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
                        Visible to signed-in students when the category’s matching feature is
                        available.
                      </span>
                    </span>
                  </label>
                </div>

                <button
                  disabled={busy || loading}
                  className={`${primaryBtn} w-full py-3`}
                  style={{ backgroundColor: "var(--brand)", color: "var(--brand-fg)" }}
                >
                  {busy && <Spinner />}
                  {busy ? "Saving…" : "Save goal"}
                </button>
              </form>
            </Card>

            {/* --------------------------- Goals & matches ------------------------ */}
            <section aria-label="Goals and matches" className="space-y-5">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: "var(--text-heading)" }}>
                    Your goals &amp; matches
                  </h2>
                  <Chip tone="brand">Step 2</Chip>
                </div>

                {loading ? (
                  <div className="mt-5 space-y-3" aria-busy="true">
                    <div
                      className="h-10 animate-pulse rounded-xl"
                      style={{ backgroundColor: "var(--bg-row)" }}
                    />
                    <div
                      className="h-10 w-1/2 animate-pulse rounded-xl"
                      style={{ backgroundColor: "var(--bg-row)" }}
                    />
                  </div>
                ) : goals.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState
                      icon={icons.target}
                      title="No goals yet"
                      body="Create a goal to begin. Other students must list compatible goals before matches can appear."
                    />
                  </div>
                ) : (
                  <>
                    <label className={`${labelClass} mt-5`}>
                      <span style={{ color: "var(--text-sub)" }}>Search using</span>
                      <select
                        className={inputClass}
                        value={selected}
                        disabled={busy || searching}
                        onChange={(e) => {
                          setSelected(e.target.value);
                          setExamEdit(null);
                          setMatches(null);
                          setSearchMessage("");
                          setNotice(null);
                        }}
                      >
                        <option value="">Choose a saved goal</option>
                        {goals.map((g) => (
                          <option key={g.id} value={g.id}>
                            {categoryLabels[g.category ?? "course"]} · {goalTitle(g)} ·{" "}
                            {g.is_listed ? (paused ? "Listed (paused)" : "Listed") : "Private"}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedGoal && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Chip tone="brand">
                          {categoryLabels[selectedGoal.category ?? "course"]}
                        </Chip>
                        <Chip>{selectedGoal.proficiency_level}</Chip>
                        <Chip
                          tone={selectedGoal.is_listed ? (paused ? "warn" : "success") : "neutral"}
                        >
                          {selectedGoal.is_listed
                            ? paused
                              ? "Listed (paused)"
                              : "Listed"
                            : "Private"}
                        </Chip>
                        <Chip>{selectedGoal.location_preference.replace("_", " ")}</Chip>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        disabled={
                          !selected ||
                          busy ||
                          searching ||
                          !selectedSupportsSearch ||
                          (selectedGoal?.category === "exam_prep" && !selectedGoal.exam_date)
                        }
                        onClick={search}
                        className={primaryBtn}
                        style={{ backgroundColor: "var(--brand)", color: "var(--brand-fg)" }}
                      >
                        {searching ? <Spinner /> : <Icon d={icons.search} size={15} />}
                        {searching ? "Searching…" : "Find partners"}
                      </button>
                      <button
                        disabled={!selected || busy || searching}
                        onClick={() => remove(selected)}
                        className={ghostBtn}
                        style={{
                          backgroundColor: "var(--bg-card)",
                          borderColor: "var(--border-card)",
                          color: "var(--text-sub)",
                        }}
                      >
                        <Icon d={icons.trash} size={14} />
                        Remove goal
                      </button>
                    </div>

                    {selectedGoal?.category === "exam_prep" && (
                      <Card inner className="mt-4 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm" style={{ color: "var(--text-sub)" }}>
                            {selectedGoal.exam_date
                              ? `Exam ${selectedGoal.exam_date} · Prep ${selectedGoal.prep_start} → ${selectedGoal.prep_end}`
                              : "Add exam and preparation dates before searching."}
                          </p>
                          {!examEdit && (
                            <button
                              type="button"
                              disabled={busy}
                              className="text-sm font-semibold underline-offset-2 hover:underline"
                              style={{ color: "var(--brand)" }}
                              onClick={() =>
                                setExamEdit({
                                  exam_date: selectedGoal.exam_date,
                                  prep_start: selectedGoal.prep_start,
                                  prep_end: selectedGoal.prep_end,
                                })
                              }
                            >
                              Edit dates
                            </button>
                          )}
                        </div>
                        {examEdit && (
                          <form className="mt-3 space-y-3" onSubmit={saveExamDates}>
                            <ExamDates
                              values={examEdit}
                              onChange={(key, value) => setExamEdit({ ...examEdit, [key]: value })}
                            />
                            <div className="flex gap-3">
                              <button
                                type="submit"
                                disabled={busy}
                                className={primaryBtn}
                                style={{
                                  backgroundColor: "var(--brand)",
                                  color: "var(--brand-fg)",
                                }}
                              >
                                {busy && <Spinner />}
                                Save dates
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setExamEdit(null)}
                                className={ghostBtn}
                                style={{
                                  backgroundColor: "var(--bg-card)",
                                  borderColor: "var(--border-card)",
                                  color: "var(--text-sub)",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </Card>
                    )}

                    {selectedGoal && !selectedSupportsSearch && (
                      <p className="mt-3 text-sm opacity-75">
                        Partner search for {categoryLabels[selectedGoal.category!]} is planned for a
                        later story. Your matching information is saved.
                      </p>
                    )}
                  </>
                )}

                {selectedGoal && selectedSupportsSearch && (
                  <div
                    className="mt-5 rounded-xl border px-4 py-3 text-xs leading-5"
                    style={{
                      backgroundColor: "var(--bg-card-inner)",
                      borderColor: "var(--border-card)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span className="font-semibold" style={{ color: "var(--text-sub)" }}>
                      How scoring works:
                    </span>{" "}
                    {selectedGoal.category === "skill_practice"
                      ? "skill or language 25% · availability 50% · location 25%."
                      : `${selectedGoal.category === "exam_prep" ? "exam subject" : "topic"} 40% · availability 35% · location 25%.`}
                    {(selectedGoal.category === "exam_prep" ||
                      selectedGoal.mode === "assignment") &&
                      " Deadline urgency: ≤2 days ×1.2; ≤7 days ×1.1; otherwise ×1.0. Final scores may exceed 100."}
                  </div>
                )}
              </Card>

              {/* ------------------------------ Results ----------------------------- */}
              {searching && (
                <div className="space-y-4" aria-busy="true" aria-label="Searching for partners">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              )}

              {!searching && matches && matches.length === 0 && (
                <EmptyState
                  icon={icons.user}
                  title="No compatible partners yet"
                  body={
                    searchMessage ||
                    "No one has listed a compatible goal right now. Try widening your availability or check back soon."
                  }
                />
              )}

              {!searching && matches && matches.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                      {matches.length} {matches.length === 1 ? "match" : "matches"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Ranked by final compatibility score
                    </p>
                  </div>
                  {searchMessage && (
                    <p className="px-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      {searchMessage}
                    </p>
                  )}
                </>
              )}

              <div className="space-y-4">
                {!searching &&
                  matches?.map((m, index) => {
                    const sent = sentConnections[m.candidate_goal_id];
                    const isFavorite = favoriteGoalIds.includes(m.candidate_goal_id);
                    return (
                      <Card key={m.candidate_goal_id} className="p-5 transition hover:shadow-lg">
                        <div className="flex items-start gap-4">
                          <ScoreRing score={m.final_score} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className="truncate text-base font-bold"
                                style={{ color: "var(--text-heading)" }}
                              >
                                {m.display_name}
                              </h3>
                              {index === 0 && <Chip tone="success">Top match</Chip>}
                            </div>
                            <p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>
                              {m.category === "exam_prep"
                                ? `Exam prep · ${m.subject_or_skill} · ${m.proficiency_level}${m.exam_date ? ` · Exam ${m.exam_date}` : ""}`
                                : m.category === "skill_practice"
                                  ? `Skill / language practice · ${m.subject_or_skill} · ${m.proficiency_level}`
                                  : `${m.course_code} · ${m.topic}${m.assignment_id ? ` · ${m.assignment_id}` : ""}`}
                            </p>
                            <div
                              className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              <span className="inline-flex items-center gap-1 capitalize">
                                <Icon d={icons.pin} size={12} />
                                {String(m.location_preference).replace("_", " ")}
                                {m.location && ` · ${m.location}`}
                              </span>
                              {m.due_date && (
                                <span className="inline-flex items-center gap-1">
                                  <Icon d={icons.clock} size={12} />
                                  Due {m.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          {Object.entries(m.components).map(([k, v]) => (
                            <MetricBar
                              key={k}
                              label={componentLabel(k, m.category)}
                              value={Number(v)}
                            />
                          ))}
                        </div>

                        <div
                          className="mt-4 rounded-xl border px-4 py-3 text-xs"
                          style={{
                            backgroundColor: "var(--bg-card-inner)",
                            borderColor: "var(--border-card)",
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span style={{ color: "var(--text-muted)" }}>
                              Base {m.base_score} × urgency {m.urgency_multiplier} ={" "}
                              <b style={{ color: "var(--text-heading)" }}>{m.final_score}</b>
                            </span>
                            <span className="font-semibold" style={{ color: "var(--text-sub)" }}>
                              {m.overlap_minutes} overlapping min
                            </span>
                          </div>
                          {m.overlapping_slots.length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {m.overlapping_slots.slice(0, 4).map((s) => (
                                <li key={s.start}>
                                  <Chip>
                                    {new Date(s.start).toLocaleString([], {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}{" "}
                                    –{" "}
                                    {new Date(s.end).toLocaleTimeString([], {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </Chip>
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-2 opacity-60">
                            Times shown in your browser timezone · Scoring {m.configuration_version}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2.5">
                          <Link
                            href={`/partners/profile/${m.candidate_goal_id}`}
                            className={ghostBtn}
                            style={{
                              backgroundColor: "var(--bg-card)",
                              borderColor: "var(--border-card)",
                              color: "var(--text-sub)",
                            }}
                          >
                            <Icon d={icons.user} size={14} />
                            View profile
                          </Link>

                          <button
                            type="button"
                            onClick={() => toggleFavorite(m)}
                            disabled={favoriteBusy === m.candidate_goal_id}
                            aria-pressed={isFavorite}
                            className={ghostBtn}
                            style={{
                              backgroundColor: isFavorite
                                ? "var(--brand-soft-bg)"
                                : "var(--bg-card)",
                              borderColor: isFavorite
                                ? "var(--brand-soft-border)"
                                : "var(--border-card)",
                              color: isFavorite ? "var(--brand-strong)" : "var(--text-sub)",
                            }}
                          >
                            {favoriteBusy === m.candidate_goal_id ? (
                              <Spinner />
                            ) : (
                              <Icon d={icons.heart} size={14} />
                            )}
                            {isFavorite ? "Favorited" : "Favorite"}
                          </button>

                          <div className="ml-auto flex items-center gap-2.5">
                            {(!sent || sent.status === "cancelled") && (
                              <button
                                onClick={() => openConnect(m)}
                                disabled={busy || connectBusy}
                                className={primaryBtn}
                                style={{
                                  backgroundColor: "var(--brand)",
                                  color: "var(--brand-fg)",
                                }}
                              >
                                <Icon d={icons.send} size={14} />
                                {sent ? "Resend request" : "Send request"}
                              </button>
                            )}
                            {sent && sent.status === "pending" && (
                              <>
                                <Chip tone="success">
                                  <Icon d={icons.check} size={12} /> Request sent
                                </Chip>
                                <button
                                  onClick={() => cancelRequest(m.candidate_goal_id, sent)}
                                  disabled={cancelBusy === m.candidate_goal_id}
                                  className="rounded-xl border px-3 py-2 text-xs font-semibold opacity-80 transition hover:opacity-100 disabled:opacity-50"
                                  style={{
                                    borderColor: "var(--border-card)",
                                    color: "var(--text-sub)",
                                  }}
                                >
                                  {cancelBusy === m.candidate_goal_id ? "Cancelling…" : "Cancel"}
                                </button>
                              </>
                            )}
                            {sent && sent.status !== "pending" && sent.status !== "cancelled" && (
                              <Chip tone="success">
                                <Icon d={icons.check} size={12} /> Request sent
                              </Chip>
                            )}
                          </div>
                        </div>

                        {favoriteMessages[m.candidate_goal_id] && (
                          <p role="status" className="mt-3 text-xs opacity-80">
                            {favoriteMessages[m.candidate_goal_id]}
                          </p>
                        )}
                      </Card>
                    );
                  })}
              </div>
            </section>
          </div>
        </div>

        {/* ---------------------------- Connection modal --------------------------- */}
        {connectTarget && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-heading"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !connectBusy) setConnectTarget(null);
            }}
          >
            <div
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-card)",
                color: "var(--text-page)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="connect-heading"
                    className="text-lg font-bold"
                    style={{ color: "var(--text-heading)" }}
                  >
                    Send connection request
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    To{" "}
                    <strong style={{ color: "var(--text-sub)" }}>
                      {connectTarget.display_name}
                    </strong>{" "}
                    · {connectTarget.subject_or_skill ?? connectTarget.course_code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConnectTarget(null)}
                  disabled={connectBusy}
                  className="rounded-lg p-1.5 opacity-60 transition hover:opacity-100"
                  aria-label="Close"
                >
                  <Icon d={icons.close} size={18} />
                </button>
              </div>

              {connectError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border p-3 text-sm"
                  style={{
                    borderColor: "rgba(220,38,38,0.35)",
                    backgroundColor: "rgba(220,38,38,0.1)",
                    color: "#b91c1c",
                  }}
                >
                  {connectError}
                </p>
              )}

              <form onSubmit={sendRequest} className="mt-5 space-y-4">
                <label className={labelClass}>
                  <span style={{ color: "var(--text-sub)" }}>Session topic</span>
                  <input
                    className={inputClass}
                    required
                    maxLength={200}
                    placeholder="e.g. React Hooks deep dive"
                    value={connectForm.session_topic}
                    onChange={(e) =>
                      setConnectForm((f) => ({ ...f, session_topic: e.target.value }))
                    }
                    aria-invalid={connectFieldErrors.some((x) => x.field === "session_topic")}
                  />
                  {connectFieldErrors.find((x) => x.field === "session_topic") && (
                    <span className="mt-1 block text-xs text-red-500">
                      {connectFieldErrors.find((x) => x.field === "session_topic")!.message}
                    </span>
                  )}
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["proposed_start", "Session start"],
                      ["proposed_end", "Session end"],
                    ] as const
                  ).map(([key, label]) => {
                    const err = connectFieldErrors.find((x) => x.field === key);
                    return (
                      <label key={key} className={labelClass}>
                        <span style={{ color: "var(--text-sub)" }}>{label}</span>
                        <input
                          type="text"
                          placeholder="YYYY-MM-DD HH:MM"
                          pattern={sessionTimePattern}
                          maxLength={16}
                          title="Enter a date and 24-hour time in YYYY-MM-DD HH:MM format."
                          className={inputClass}
                          required
                          value={connectForm[key]}
                          onChange={(e) => setConnectForm((f) => ({ ...f, [key]: e.target.value }))}
                          aria-invalid={Boolean(err)}
                        />
                        {err && (
                          <span className="mt-1 block text-xs text-red-500">{err.message}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Times use your browser’s time zone (24-hour clock).
                </p>

                <label className={labelClass}>
                  <span style={{ color: "var(--text-sub)" }}>
                    Message <span className="opacity-50">(optional)</span>
                  </span>
                  <textarea
                    className={inputClass}
                    rows={3}
                    maxLength={500}
                    placeholder="Introduce yourself or suggest a meeting platform…"
                    value={connectForm.message}
                    onChange={(e) => setConnectForm((f) => ({ ...f, message: e.target.value }))}
                  />
                  <span className="mt-1 block text-right text-[11px] opacity-50">
                    {connectForm.message.length}/500
                  </span>
                </label>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={connectBusy}
                    className={`${primaryBtn} flex-1`}
                    style={{ backgroundColor: "var(--brand)", color: "var(--brand-fg)" }}
                  >
                    {connectBusy ? <Spinner /> : <Icon d={icons.send} size={14} />}
                    {connectBusy ? "Sending…" : "Send request"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectTarget(null)}
                    disabled={connectBusy}
                    className={ghostBtn}
                    style={{
                      backgroundColor: "var(--bg-card-inner)",
                      borderColor: "var(--border-card)",
                      color: "var(--text-sub)",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
