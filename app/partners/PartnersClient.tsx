"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Goal, GoalInput, rankCandidates, Slot } from "@/lib/matching/engine";
type Match = ReturnType<typeof rankCandidates>[number];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const blank: GoalInput = {
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
async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed. Please try again.");
  return data;
}
export default function PartnersClient() {
  const [form, setForm] = useState<GoalInput>(blank);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selected, setSelected] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
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
      setMessage("Goal saved. Select Find partners to search.");
    } catch (e) {
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
    key: "display_name" | "institution" | "course_code" | "topic" | "location" | "timezone",
    max: number
  ) {
    return (
      <label className="block text-sm">
        {label}
        <input
          className={inputClass}
          required={key !== "location"}
          maxLength={max}
          value={form[key]}
          onChange={(e) => change(key, e.target.value)}
        />
      </label>
    );
  }
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
          Match by course topic or exact assignment. Availability is compared across time zones over
          the next 14 days, ending at assignment deadlines.
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
                Goal type
                <select
                  className={inputClass}
                  value={form.mode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      mode: e.target.value as GoalInput["mode"],
                      assignment_id: null,
                      due_date: null,
                    })
                  }
                >
                  <option value="course">Course study (US-04)</option>
                  <option value="assignment">Assignment (US-05)</option>
                </select>
              </label>
              {field("Display name", "display_name", 100)}
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
                Let signed-in students find this goal and see my display name, study details, and
                availability.
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
                        {g.course_code} · {g.mode === "assignment" ? g.assignment_id : g.topic} ·{" "}
                        {g.is_listed ? "Listed" : "Private"}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-3 mt-3">
                  <button
                    disabled={!selected || busy}
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
              </>
            )}
            <p className="mt-4 text-xs opacity-70">
              Weights: topic 40% · availability 35% · location 25%. Assignment urgency proposal: ≤2
              days ×1.2; ≤7 days ×1.1; otherwise ×1.0. Final scores may exceed 100.
            </p>
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
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
