"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Goal, GoalInput, rankCandidates, Slot } from "@/lib/matching/engine";
import type {
  MatchingCategory,
  MatchingFieldError,
  ProficiencyLevel,
} from "@/lib/matching/information";
type Match = ReturnType<typeof rankCandidates>[number];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const categoryLabels: Record<MatchingCategory, string> = {
  course: "Course study",
  exam_prep: "Exam preparation",
  skill_practice: "Skill / language practice",
};
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
const inputClass = "w-full rounded-lg border border-slate-500/40 bg-transparent px-3 py-2 mt-1";
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
export default function PartnersClient() {
  const [form, setForm] = useState<GoalInput>(blank);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selected, setSelected] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<MatchingFieldError[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
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
  useEffect(() => {
    let live = true;
    api("/api/v1/matching-goals")
      .then((data) => {
        if (live) setGoals(data.goals);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  function change<K extends keyof GoalInput>(key: K, value: GoalInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function slot(index: number, patch: Partial<Slot>) {
    change(
      "availability",
      form.availability.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors([]);
    setMessage("");
    try {
      const saved = await api("/api/v1/matching-goals", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const data = await api("/api/v1/matching-goals");
      setGoals(data.goals);
      setSelected(saved.id);
      setMatches(null);
      setMessage(
        form.category === "course"
          ? "Goal saved. Select Find partners to search."
          : "Matching information saved. Partner search for this category is planned for a later story."
      );
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function search() {
    setBusy(true);
    setError("");
    setMatches(null);
    setMessage("");
    try {
      const data = await api("/api/v1/matches", {
        method: "POST",
        body: JSON.stringify({ goal_id: selected }),
      });
      setMatches(data.matches);
      setMessage(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to search.");
    } finally {
      setBusy(false);
    }
  }
  function openConnect(m: Match) {
    setConnectForm({
      session_topic: m.topic ?? "",
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
    setConnectBusy(true);
    setConnectError("");
    setConnectFieldErrors([]);
    try {
      const result = await api("/api/v1/connections", {
        method: "POST",
        body: JSON.stringify({
          goal_id: selected,
          candidate_goal_id: connectTarget.candidate_goal_id,
          session_topic: connectForm.session_topic,
          proposed_start: new Date(connectForm.proposed_start).toISOString(),
          proposed_end: new Date(connectForm.proposed_end).toISOString(),
          message: connectForm.message || undefined,
        }),
      });
      const cgid = connectTarget!.candidate_goal_id;
      setSentConnections((prev) => ({ ...prev, [cgid]: { id: result.id, status: "pending" } }));
      setConnectTarget(null);
    } catch (e) {
      if (e instanceof ApiError) setConnectFieldErrors(e.fieldErrors);
      setConnectError(e instanceof Error ? e.message : "Unable to send request.");
    } finally {
      setConnectBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/matching-goals", {
        method: "DELETE",
        body: JSON.stringify({ goal_id: id }),
      });
      setGoals((g) => g.filter((x) => x.id !== id));
      if (selected === id) {
        setSelected("");
        setMatches(null);
        setMessage("Goal removed from matching.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove.");
    } finally {
      setBusy(false);
    }
  }
  function field(
    label: string,
    key:
      | "display_name"
      | "institution"
      | "course_code"
      | "topic"
      | "subject_or_skill"
      | "location"
      | "timezone",
    max: number,
    required = key !== "location"
  ) {
    const fieldError = fieldErrors.find((item) => item.field === key);
    return (
      <label className="block text-sm">
        {label}
        <input
          className={inputClass}
          required={required}
          maxLength={max}
          value={form[key] ?? ""}
          onChange={(e) => change(key, e.target.value)}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? `${key}-error` : undefined}
        />
        {fieldError && (
          <span id={`${key}-error`} className="mt-1 block text-xs text-red-500">
            {fieldError.message}
          </span>
        )}
      </label>
    );
  }
  function fieldError(name: string) {
    const issue = fieldErrors.find((item) => item.field === name);
    return issue ? <span className="mt-1 block text-xs text-red-500">{issue.message}</span> : null;
  }
  const selectedGoal = goals.find((goal) => goal.id === selected);
  const selectedSupportsSearch =
    !selectedGoal || selectedGoal.information_version === 1 || selectedGoal.category === "course";
  return (
    <main
      className="min-h-screen px-5 py-8"
      style={{ background: "var(--bg-page)", color: "var(--text-page)" }}
    >
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-indigo-500">
          ← Dashboard
        </Link>
        <h1 className="mt-5 text-3xl font-bold">Find a study partner</h1>
        <p className="mt-2 text-sm opacity-75">
          Save course study, exam preparation, and skill or language practice matching information.
          Partner search currently supports course topics and assignments only.
        </p>
        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-400 bg-red-500/10 p-4">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mt-5 rounded-xl border border-indigo-400 p-4">
            {message}
          </p>
        )}
        <div className="mt-7 grid gap-7 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-500/30 p-6">
            <h2 className="text-xl font-semibold">Create a matching goal</h2>
            <form onSubmit={save} className="mt-4 space-y-4">
              <label className="block text-sm">
                Learning goal category
                <select
                  className={inputClass}
                  value={form.category ?? ""}
                  onChange={(e) => {
                    const category = e.target.value as MatchingCategory;
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
                  aria-invalid={fieldErrors.some((item) => item.field === "category")}
                >
                  <option value="course">Course study</option>
                  <option value="exam_prep">Exam preparation</option>
                  <option value="skill_practice">Skill / language practice</option>
                </select>
                {fieldError("category")}
              </label>
              {field("Display name", "display_name", 100)}
              {field("Subject or skill", "subject_or_skill", 120)}
              <label className="block text-sm">
                Proficiency level
                <select
                  className={inputClass}
                  value={form.proficiency_level ?? ""}
                  onChange={(e) => change("proficiency_level", e.target.value as ProficiencyLevel)}
                  aria-invalid={fieldErrors.some((item) => item.field === "proficiency_level")}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                {fieldError("proficiency_level")}
              </label>
              {form.category === "course" && (
                <div className="space-y-4 rounded-xl border border-slate-500/30 p-4">
                  <label className="block text-sm">
                    Course goal type
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
                      <option value="course">Course topic (US-04)</option>
                      <option value="assignment">Assignment (US-05)</option>
                    </select>
                    {fieldError("mode")}
                  </label>
                  {field("University / institution", "institution", 120)}
                  {field("Course code", "course_code", 40)}
                  {field("Course topic", "topic", 200)}
                  {form.mode === "assignment" && (
                    <>
                      <label className="block text-sm">
                        Exact assignment ID (case-sensitive)
                        <input
                          className={inputClass}
                          maxLength={100}
                          required
                          value={form.assignment_id ?? ""}
                          onChange={(e) => change("assignment_id", e.target.value)}
                        />
                      </label>
                      <label className="block text-sm">
                        Due date (YYYY-MM-DD, end of day in goal timezone)
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
                      </label>
                    </>
                  )}
                </div>
              )}
              {field("Goal timezone (IANA, e.g. America/New_York)", "timezone", 80)}
              <label className="block text-sm">
                Location preference
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
                {fieldError("location_preference")}
              </label>
              {form.location_preference !== "online" &&
                field("Meeting location (required for in person)", "location", 120)}
              <fieldset className="space-y-3">
                <legend className="font-semibold">Weekly availability</legend>
                {form.availability.map((s, i) => (
                  <div key={i} className="rounded-lg border border-slate-500/30 p-3 space-y-2">
                    <label className="block text-sm">
                      Day
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
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-sm">
                        Start
                        <input
                          className={inputClass}
                          type="time"
                          required
                          value={s.start_time}
                          onChange={(e) => slot(i, { start_time: e.target.value })}
                        />
                      </label>
                      <label className="text-sm">
                        End
                        <input
                          className={inputClass}
                          type="time"
                          required
                          value={s.end_time}
                          onChange={(e) => slot(i, { end_time: e.target.value })}
                        />
                      </label>
                    </div>
                    <label className="block text-sm">
                      Slot timezone
                      <input
                        className={inputClass}
                        required
                        value={s.timezone}
                        onChange={(e) => slot(i, { timezone: e.target.value })}
                      />
                    </label>
                    {form.availability.length > 1 && (
                      <button
                        type="button"
                        className="text-sm text-red-500"
                        onClick={() =>
                          change(
                            "availability",
                            form.availability.filter((_, j) => i !== j)
                          )
                        }
                      >
                        Remove slot
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  disabled={form.availability.length >= 21}
                  className="text-sm text-indigo-500"
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
                  + Add availability
                </button>
              </fieldset>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_listed}
                  onChange={(e) => change("is_listed", e.target.checked)}
                />
                Make this matching information visible to signed-in students when the category’s
                matching feature is available.
              </label>
              <button
                disabled={busy || loading}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Please wait…" : "Save goal"}
              </button>
            </form>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Your goals & matches</h2>
            {loading ? (
              <p className="mt-4">Loading goals…</p>
            ) : goals.length === 0 ? (
              <p className="mt-4 text-sm opacity-75">
                Create a goal to begin. Other students must list compatible goals before matches can
                appear.
              </p>
            ) : (
              <>
                <label className="block mt-4 text-sm">
                  Search using
                  <select
                    className={inputClass}
                    value={selected}
                    disabled={busy}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setMatches(null);
                      setMessage("");
                    }}
                  >
                    <option value="">Choose a saved goal</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.category && g.category !== "course"
                          ? `${categoryLabels[g.category]} · ${g.subject_or_skill}`
                          : `${categoryLabels.course} · ${g.course_code} · ${g.mode === "assignment" ? g.assignment_id : g.topic}`}{" "}
                        · {g.is_listed ? "Listed" : "Private"}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-3 mt-3">
                  <button
                    disabled={!selected || busy || !selectedSupportsSearch}
                    onClick={search}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
                  >
                    Find partners
                  </button>
                  <button
                    disabled={!selected || busy}
                    onClick={() => remove(selected)}
                    className="rounded-xl border border-slate-500 px-4 py-2 disabled:opacity-50"
                  >
                    Remove goal
                  </button>
                </div>
                {selectedGoal && !selectedSupportsSearch && (
                  <p className="mt-3 text-sm opacity-75">
                    Partner search for {categoryLabels[selectedGoal.category!]} is planned for a
                    later story. Your matching information is saved.
                  </p>
                )}
              </>
            )}
            {selectedGoal && selectedSupportsSearch && (
              <p className="mt-4 text-xs opacity-70">
                Weights: topic 40% · availability 35% · location 25%. Assignment urgency proposal:
                ≤2 days ×1.2; ≤7 days ×1.1; otherwise ×1.0. Final scores may exceed 100.
              </p>
            )}
            {matches && matches.length > 0 && (
              <p className="mt-5 text-sm">Ranked by final compatibility score, highest first.</p>
            )}
            <div className="mt-4 space-y-4">
              {matches?.map((m) => (
                <article
                  key={m.candidate_goal_id}
                  className="rounded-2xl border border-slate-500/30 p-5"
                >
                  <div className="flex justify-between gap-3">
                    <h3 className="font-bold">{m.display_name}</h3>
                    <strong>{m.final_score}</strong>
                  </div>
                  <p className="mt-1 text-sm">
                    {m.course_code} · {m.topic}
                    {m.assignment_id && ` · ${m.assignment_id}`}
                  </p>
                  <p className="mt-1 text-sm">
                    {m.location_preference}
                    {m.location && ` · ${m.location}`}
                    {m.due_date && ` · Due ${m.due_date}`}
                  </p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    {Object.entries(m.components).map(([k, v]) => (
                      <div key={k}>
                        <dt className="capitalize opacity-70">{k}</dt>
                        <dd>{v}/100</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-sm">
                    Base {m.base_score} × urgency {m.urgency_multiplier} = <b>{m.final_score}</b>
                  </p>
                  <p className="mt-2 text-sm">{m.overlap_minutes} overlapping minutes</p>
                  <ul className="mt-1 text-xs space-y-1">
                    {m.overlapping_slots.slice(0, 4).map((s) => (
                      <li key={s.start}>
                        {new Date(s.start).toLocaleString()} –{" "}
                        {new Date(s.end).toLocaleTimeString()}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs opacity-60">
                    Times shown in your browser timezone. Scoring: {m.configuration_version}
                  </p>
                  <div className="mt-4">
                    {(() => {
                      const sent = sentConnections[m.candidate_goal_id];
                      if (!sent) {
                        return (
                          <button
                            onClick={() => openConnect(m)}
                            disabled={busy || connectBusy}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Send request
                          </button>
                        );
                      }
                      if (sent.status === "pending") {
                        return (
                          <div className="flex items-center gap-3">
                            <span className="inline-block rounded-xl border border-green-500/40 bg-green-600/20 px-4 py-2 text-sm text-green-400">
                              Request sent ✓
                            </span>
                            <button
                              onClick={async () => {
                                const res = await fetch(`/api/v1/connections/${sent.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                });
                                if (res.ok) {
                                  setSentConnections((prev) => ({
                                    ...prev,
                                    [m.candidate_goal_id]: { ...sent, status: "cancelled" },
                                  }));
                                }
                              }}
                              className="rounded-xl border px-3 py-2 text-xs font-semibold opacity-70 hover:opacity-100 transition"
                              style={{
                                borderColor: "var(--border-card)",
                                color: "var(--text-sub)",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        );
                      }
                      if (sent.status === "cancelled") {
                        return (
                          <button
                            onClick={() => openConnect(m)}
                            disabled={busy || connectBusy}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Resend request
                          </button>
                        );
                      }
                      return (
                        <span className="inline-block rounded-xl border border-green-500/40 bg-green-600/20 px-4 py-2 text-sm text-green-400">
                          Request sent ✓
                        </span>
                      );
                    })()}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      {connectTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="connect-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--bg-page)", color: "var(--text-page)" }}
          >
            <div className="flex items-center justify-between">
              <h2 id="connect-heading" className="text-lg font-bold">
                Send connection request
              </h2>
              <button
                type="button"
                onClick={() => setConnectTarget(null)}
                disabled={connectBusy}
                className="text-2xl leading-none opacity-50 hover:opacity-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-sm opacity-70">
              To: <strong>{connectTarget.display_name}</strong> · {connectTarget.course_code}
            </p>
            {connectError && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-400 bg-red-500/10 p-3 text-sm"
              >
                {connectError}
              </p>
            )}
            <form onSubmit={sendRequest} className="mt-4 space-y-4">
              <label className="block text-sm">
                Session topic
                <input
                  className={inputClass}
                  required
                  maxLength={200}
                  placeholder="e.g. React Hooks deep dive"
                  value={connectForm.session_topic}
                  onChange={(e) => setConnectForm((f) => ({ ...f, session_topic: e.target.value }))}
                  aria-invalid={connectFieldErrors.some((x) => x.field === "session_topic")}
                />
                {connectFieldErrors.find((x) => x.field === "session_topic") && (
                  <span className="mt-1 block text-xs text-red-500">
                    {connectFieldErrors.find((x) => x.field === "session_topic")!.message}
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  Session start
                  <input
                    type="datetime-local"
                    className={inputClass}
                    required
                    value={connectForm.proposed_start}
                    onChange={(e) =>
                      setConnectForm((f) => ({ ...f, proposed_start: e.target.value }))
                    }
                    aria-invalid={connectFieldErrors.some((x) => x.field === "proposed_start")}
                  />
                  {connectFieldErrors.find((x) => x.field === "proposed_start") && (
                    <span className="mt-1 block text-xs text-red-500">
                      {connectFieldErrors.find((x) => x.field === "proposed_start")!.message}
                    </span>
                  )}
                </label>
                <label className="block text-sm">
                  Session end
                  <input
                    type="datetime-local"
                    className={inputClass}
                    required
                    value={connectForm.proposed_end}
                    onChange={(e) =>
                      setConnectForm((f) => ({ ...f, proposed_end: e.target.value }))
                    }
                    aria-invalid={connectFieldErrors.some((x) => x.field === "proposed_end")}
                  />
                  {connectFieldErrors.find((x) => x.field === "proposed_end") && (
                    <span className="mt-1 block text-xs text-red-500">
                      {connectFieldErrors.find((x) => x.field === "proposed_end")!.message}
                    </span>
                  )}
                </label>
              </div>
              <label className="block text-sm">
                Message <span className="opacity-50">(optional, max 500 chars)</span>
                <textarea
                  className={inputClass}
                  rows={3}
                  maxLength={500}
                  placeholder="Introduce yourself or suggest a meeting platform…"
                  value={connectForm.message}
                  onChange={(e) => setConnectForm((f) => ({ ...f, message: e.target.value }))}
                />
              </label>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={connectBusy}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {connectBusy ? "Sending…" : "Send request"}
                </button>
                <button
                  type="button"
                  onClick={() => setConnectTarget(null)}
                  disabled={connectBusy}
                  className="rounded-xl border border-slate-500/40 px-4 py-2 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
