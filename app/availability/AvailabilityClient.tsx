"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { AvailabilitySlot } from "@/lib/availability/mapping";
import type { WeeklyAvailabilityInput } from "@/lib/availability/types";
import { useTheme } from "@/app/components/ThemeProvider";

export type AvailabilityGoal = {
  id: string;
  mode: "course" | "assignment";
  course_code: string;
  topic: string;
  assignment_id: string | null;
  timezone: string;
};

type FieldErrors = Partial<Record<keyof WeeklyAvailabilityInput | "slot", string>>;

type ApiErrorPayload = {
  error?: string;
  errors?: { field: keyof WeeklyAvailabilityInput | "slot"; message: string }[];
};

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const timezoneSuggestions = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-500/10";

function emptyForm(timezone: string): WeeklyAvailabilityInput {
  return { dayOfWeek: 0, startTime: "09:00", endTime: "10:00", timezone };
}

function goalLabel(goal: AvailabilityGoal) {
  const detail = goal.mode === "assignment" ? goal.assignment_id : goal.topic;
  return `${goal.course_code} · ${detail || "Learning goal"}`;
}

async function readPayload(
  response: Response
): Promise<ApiErrorPayload & { slot?: AvailabilitySlot }> {
  return (await response.json()) as ApiErrorPayload & { slot?: AvailabilitySlot };
}

export function AvailabilityClient({ goals }: { goals: AvailabilityGoal[] }) {
  const { theme, toggle } = useTheme();
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === goalId), [goalId, goals]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [form, setForm] = useState<WeeklyAvailabilityInput>(
    emptyForm(goals[0]?.timezone ?? "America/New_York")
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(goalId));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const interactionDisabled = loading || saving || deleting;

  async function loadSlots(selectedGoalId: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/matching-goals/${encodeURIComponent(selectedGoalId)}/availability`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as ApiErrorPayload & { slots?: AvailabilitySlot[] };
      if (!response.ok) throw new Error(payload.error ?? "Availability could not be loaded.");
      setSlots(payload.slots ?? []);
    } catch (loadError) {
      setSlots([]);
      setError(
        loadError instanceof Error ? loadError.message : "Availability could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!goalId) return;
    let active = true;

    async function loadInitialSlots() {
      try {
        const response = await fetch(
          `/api/v1/matching-goals/${encodeURIComponent(goalId)}/availability`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as ApiErrorPayload & {
          slots?: AvailabilitySlot[];
        };
        if (!response.ok) throw new Error(payload.error ?? "Availability could not be loaded.");
        if (active) setSlots(payload.slots ?? []);
      } catch (loadError) {
        if (!active) return;
        setSlots([]);
        setError(
          loadError instanceof Error ? loadError.message : "Availability could not be loaded."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialSlots();
    return () => {
      active = false;
    };
  }, [goalId]);

  function chooseGoal(nextGoalId: string) {
    const nextGoal = goals.find((goal) => goal.id === nextGoalId);
    setGoalId(nextGoalId);
    setSlots([]);
    setEditingId(null);
    setDeleteId(null);
    setFieldErrors({});
    setMessage("");
    setError("");
    setLoading(Boolean(nextGoalId));
    setForm(emptyForm(nextGoal?.timezone ?? "America/New_York"));
  }

  function beginEdit(slot: AvailabilitySlot) {
    setEditingId(slot.id);
    setDeleteId(null);
    setFieldErrors({});
    setError("");
    setMessage("");
    setForm({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timezone: slot.timezone,
    });
  }

  function resetForm() {
    setEditingId(null);
    setFieldErrors({});
    setForm(emptyForm(selectedGoal?.timezone ?? "America/New_York"));
  }

  async function saveSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goalId || interactionDisabled) return;

    setSaving(true);
    setFieldErrors({});
    setMessage("");
    setError("");
    try {
      const endpoint = editingId
        ? `/api/v1/matching-goals/${encodeURIComponent(goalId)}/availability/${encodeURIComponent(editingId)}`
        : `/api/v1/matching-goals/${encodeURIComponent(goalId)}/availability`;
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        const nextErrors: FieldErrors = {};
        payload.errors?.forEach((item) => {
          nextErrors[item.field] = item.message;
        });
        setFieldErrors(nextErrors);
        throw new Error(payload.error ?? "Availability could not be saved.");
      }
      setMessage(editingId ? "Availability updated." : "Availability added.");
      resetForm();
      await loadSlots(goalId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Availability could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot() {
    if (!goalId || !deleteId || interactionDisabled) return;
    setDeleting(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(
        `/api/v1/matching-goals/${encodeURIComponent(goalId)}/availability/${encodeURIComponent(deleteId)}`,
        { method: "DELETE" }
      );
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok) throw new Error(payload.error ?? "Availability could not be deleted.");
      setDeleteId(null);
      if (editingId === deleteId) resetForm();
      setMessage("Availability deleted.");
      await loadSlots(goalId);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Availability could not be deleted."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-[#08080f] dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-[#08080f]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-300"
          >
            ← Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700"
          >
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
          Matching schedule
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Manage availability
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Add the weekly times when you are available for each saved learning goal. Weekdays use
          Monday through Sunday in the goal&apos;s timezone.
        </p>

        {goals.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold">Create a learning goal first</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Availability is stored under a specific course or assignment goal.
            </p>
            <Link
              href="/partners"
              className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Create a learning goal
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
              <label className="block text-sm font-semibold" htmlFor="goal">
                Learning goal
              </label>
              <select
                id="goal"
                value={goalId}
                onChange={(event) => chooseGoal(event.target.value)}
                className={fieldClass}
                disabled={interactionDisabled}
              >
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goalLabel(goal)}
                  </option>
                ))}
              </select>

              <div className="mt-7 flex items-center justify-between">
                <h2 className="text-lg font-bold">Saved time slots</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                  {slots.length} {slots.length === 1 ? "slot" : "slots"}
                </span>
              </div>

              {loading ? (
                <p className="mt-6 text-sm text-slate-500">Loading availability…</p>
              ) : slots.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                  <p className="font-semibold">No availability saved yet.</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Use the form to add your first weekly time slot.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {slots.map((slot) => (
                    <article
                      key={slot.id}
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-bold">{weekdays[slot.dayOfWeek]}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {slot.startTime}–{slot.endTime} · {slot.timezone}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => beginEdit(slot)}
                            disabled={interactionDisabled}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50 dark:border-slate-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(slot.id)}
                            disabled={interactionDisabled}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50 dark:border-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {deleteId === slot.id && (
                        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm dark:bg-red-950/40">
                          <p>Delete this time slot? This cannot be undone.</p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={deleteSlot}
                              disabled={interactionDisabled}
                              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {deleting ? "Deleting…" : "Confirm delete"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(null)}
                              disabled={interactionDisabled}
                              className="rounded-lg px-3 py-2 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-bold">
                {editingId ? "Edit time slot" : "Add a time slot"}
              </h2>
              <form onSubmit={saveSlot} className="mt-5 space-y-4" noValidate>
                <div>
                  <label htmlFor="weekday" className="text-sm font-medium">
                    Day
                  </label>
                  <select
                    id="weekday"
                    value={form.dayOfWeek}
                    onChange={(event) =>
                      setForm({ ...form, dayOfWeek: Number(event.target.value) })
                    }
                    className={fieldClass}
                    disabled={interactionDisabled}
                  >
                    {weekdays.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.dayOfWeek && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.dayOfWeek}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="start" className="text-sm font-medium">
                      Start time
                    </label>
                    <input
                      id="start"
                      type="time"
                      value={form.startTime}
                      onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                      className={fieldClass}
                      disabled={interactionDisabled}
                    />
                    {fieldErrors.startTime && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.startTime}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="end" className="text-sm font-medium">
                      End time
                    </label>
                    <input
                      id="end"
                      type="time"
                      value={form.endTime}
                      onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                      className={fieldClass}
                      disabled={interactionDisabled}
                    />
                    {fieldErrors.endTime && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.endTime}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="timezone" className="text-sm font-medium">
                    IANA timezone
                  </label>
                  <input
                    id="timezone"
                    list="timezone-options"
                    value={form.timezone}
                    onChange={(event) => setForm({ ...form, timezone: event.target.value })}
                    className={fieldClass}
                    disabled={interactionDisabled}
                  />
                  <datalist id="timezone-options">
                    {timezoneSuggestions.map((timezone) => (
                      <option key={timezone} value={timezone} />
                    ))}
                  </datalist>
                  {fieldErrors.timezone && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.timezone}</p>
                  )}
                </div>
                {fieldErrors.slot && <p className="text-xs text-red-600">{fieldErrors.slot}</p>}
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  >
                    {error}
                  </p>
                )}
                {message && (
                  <p
                    role="status"
                    className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {message}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={interactionDisabled}
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving…" : editingId ? "Save changes" : "Add availability"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={interactionDisabled}
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold disabled:opacity-50 dark:border-slate-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
