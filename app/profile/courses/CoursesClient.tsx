"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/app/dashboard/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/app/components/ThemeProvider";

/* -------------------------------------------------------------------------- */
/*  Types & constants                                                          */
/* -------------------------------------------------------------------------- */

type Course = {
  course_id: string;
  name: string;
  code: string;
  goal: string;
  semester: string;
};

type Draft = Course & { uid: string };
type FieldErrors = Record<string, { name?: string; code?: string }>;

const MAX_COURSES = 5;

const goals = [
  { value: "study", label: "General study", hint: "Regular coursework" },
  { value: "exam_prep", label: "Exam prep", hint: "Quizzes & finals" },
  { value: "project", label: "Project", hint: "Group or solo work" },
  { value: "tutoring", label: "Tutoring", hint: "Teach or get help" },
  { value: "general", label: "Explore", hint: "Just browsing" },
];

function currentSemester(): string {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  if (m <= 5) return `Spring ${y}`;
  if (m <= 7) return `Summer ${y}`;
  return `Fall ${y}`;
}

function semesterOptions(extra: string[]): string[] {
  const y = new Date().getFullYear();
  const base: string[] = [];
  for (let year = y - 1; year <= y + 1; year++) {
    base.push(`Spring ${year}`, `Summer ${year}`, `Fall ${year}`);
  }
  return Array.from(new Set([...base, ...extra.filter(Boolean)]));
}

const inputClass =
  "mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition bg-[var(--bg-card-inner)] border-[var(--border-card)] text-[var(--text-heading)] placeholder:opacity-40 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft-bg)]";

const labelClass = "block text-[13px] font-medium";

const ghostStyle = {
  backgroundColor: "var(--bg-card)",
  borderColor: "var(--border-card)",
  color: "var(--text-sub)",
} as const;

/* -------------------------------------------------------------------------- */
/*  Small components                                                           */
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
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  check: <path d="m5 12 5 5L20 7" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  school: (
    <>
      <path d="m22 9-10-5L2 9l10 5 10-5Z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </>
  ),
};

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function Banner({
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
      className="mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm"
      style={
        isError
          ? {
              borderColor: "rgba(220,38,38,0.35)",
              backgroundColor: "rgba(220,38,38,0.1)",
              color: "#b91c1c",
            }
          : {
              borderColor: "rgba(22,163,74,0.35)",
              backgroundColor: "rgba(22,163,74,0.1)",
              color: "#15803d",
            }
      }
    >
      <span className="mt-0.5">
        <Icon d={isError ? icons.alert : icons.check} />
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

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

export function CoursesClient({
  user,
  userId,
  university,
  initialCourses,
}: {
  user: User;
  userId: string;
  university: string;
  initialCourses: Course[];
}) {
  const router = useRouter();
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  };
  const { theme, toggle } = useTheme();

  const handleSignOut = async () => {
    await getSupabase().auth.signOut();
    router.push("/signin");
    router.refresh();
  };

  const uidCounter = useRef(initialCourses.length);
  const nextUid = () => `draft-${uidCounter.current++}`;

  const [courses, setCourses] = useState<Draft[]>(() =>
    initialCourses.map((c, i) => ({ ...c, uid: `draft-${i}` }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Snapshot of what is stored, used to detect unsaved changes.
  const serialize = (list: Course[]) =>
    JSON.stringify(
      list.map(({ course_id, name, code, goal, semester }) => ({
        course_id,
        name,
        code,
        goal,
        semester,
      }))
    );
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(initialCourses));
  const dirty = useMemo(() => serialize(courses) !== savedSnapshot, [courses, savedSnapshot]);

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Auto-dismiss the success message.
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const semesters = useMemo(() => semesterOptions(courses.map((c) => c.semester)), [courses]);

  // Warn (not block) when the same course code appears twice with the same goal.
  const duplicateCodes = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of courses) {
      const key = `${c.code.trim().toLowerCase()}|${c.goal}`;
      if (!c.code.trim()) continue;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [courses]);

  function updateCourse(uid: string, field: keyof Course, value: string) {
    setCourses((current) =>
      current.map((course) => (course.uid === uid ? { ...course, [field]: value } : course))
    );
    if (field === "name" || field === "code") {
      setFieldErrors((prev) => {
        if (!prev[uid]?.[field]) return prev;
        return { ...prev, [uid]: { ...prev[uid], [field]: undefined } };
      });
    }
  }

  function addCourse() {
    if (courses.length >= MAX_COURSES) return;
    setCourses((current) => [
      ...current,
      {
        uid: nextUid(),
        course_id: "",
        name: "",
        code: "",
        goal: "study",
        semester: currentSemester(),
      },
    ]);
  }

  function removeCourse(uid: string) {
    setCourses((current) => current.filter((c) => c.uid !== uid));
    setFieldErrors((prev) => {
      const { [uid]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function resetChanges() {
    if (!window.confirm("Discard all unsaved changes?")) return;
    setCourses(JSON.parse(savedSnapshot).map((c: Course) => ({ ...c, uid: nextUid() })));
    setFieldErrors({});
    setError("");
  }

  async function saveCourses() {
    setError("");
    setMessage("");
    setFieldErrors({});

    // Rows that are completely empty are ignored, as before.
    const validCourses = courses.filter((course) => course.name.trim() || course.code.trim());

    if (validCourses.length === 0) {
      setError("Please keep at least one course.");
      return;
    }

    const errors: FieldErrors = {};
    for (const course of validCourses) {
      if (!course.name.trim())
        errors[course.uid] = { ...errors[course.uid], name: "Enter the course name." };
      if (!course.code.trim())
        errors[course.uid] = { ...errors[course.uid], code: "Enter the course code." };
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fill in the course name and code for every course.");
      return;
    }

    setSaving(true);

    try {
      const goalsByCourseId = new Map<string, Set<string>>();

      for (const course of validCourses) {
        const courseName = course.name.trim();
        const courseCode = course.code.trim();

        const { data: existingCourse, error: searchError } = await getSupabase()
          .from("courses")
          .select("id")
          .eq("code", courseCode)
          .eq("university", university)
          .maybeSingle();

        if (searchError) throw new Error(searchError.message);

        let courseId: string;

        if (existingCourse) {
          courseId = existingCourse.id;
        } else {
          const { data: newCourse, error: insertError } = await getSupabase()
            .from("courses")
            .insert({ name: courseName, code: courseCode, university })
            .select("id")
            .single();

          if (insertError || !newCourse) {
            throw new Error(insertError?.message ?? "Could not create the course.");
          }
          courseId = newCourse.id;
        }

        const goalSet = goalsByCourseId.get(courseId) ?? new Set<string>();
        goalSet.add(course.goal);
        goalsByCourseId.set(courseId, goalSet);

        const { error: associationError } = await getSupabase()
          .from("user_courses")
          .upsert(
            {
              user_id: userId,
              course_id: courseId,
              goal: course.goal,
              semester: course.semester || currentSemester(),
            },
            { onConflict: "user_id,course_id,goal", ignoreDuplicates: false }
          );

        if (associationError) throw new Error(associationError.message);
      }

      const uniqueCourseIds = [...goalsByCourseId.keys()];

      // Remove courses the user no longer has.
      const { error: deleteError } = await getSupabase()
        .from("user_courses")
        .delete()
        .eq("user_id", userId)
        .not("course_id", "in", `(${uniqueCourseIds.join(",")})`);

      if (deleteError) throw new Error(deleteError.message);

      // Remove stale rows for a kept course whose goal was changed (the upsert key includes goal).
      for (const [courseId, goalSet] of goalsByCourseId) {
        const { error: staleError } = await getSupabase()
          .from("user_courses")
          .delete()
          .eq("user_id", userId)
          .eq("course_id", courseId)
          .not("goal", "in", `(${[...goalSet].join(",")})`);

        if (staleError) throw new Error(staleError.message);
      }

      // Reflect the cleaned list locally so the dirty indicator resets.
      const cleaned = courses.filter((c) => c.name.trim() || c.code.trim());
      setCourses(cleaned);
      setSavedSnapshot(serialize(cleaned));
      setMessage("Your courses have been saved successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const filledCount = courses.length;
  const progress = (filledCount / MAX_COURSES) * 100;

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-page)" }}
    >
      <Sidebar user={user} onSignOut={handleSignOut} />

      <main className="ml-64 min-h-screen px-8 py-10 pb-32">
        <div className="mx-auto max-w-3xl">
          {/* ------------------------------ Header ------------------------------ */}
          <header className="flex items-start justify-between gap-4">
            <div>
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                <Link href="/profile" className="transition hover:opacity-80">
                  Profile
                </Link>
                <span aria-hidden="true">/</span>
                <span style={{ color: "var(--text-sub)" }}>Courses</span>
              </nav>
              <h1
                className="mt-3 text-3xl font-bold tracking-tight"
                style={{ color: "var(--text-heading)" }}
              >
                Manage your courses
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                Add, edit or remove courses to find students studying the same subjects.
              </p>
            </div>

            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition hover:opacity-80"
              style={ghostStyle}
            >
              <Icon d={theme === "light" ? icons.sun : icons.moon} size={18} />
            </button>
          </header>

          {/* ------------------------- University summary ----------------------- */}
          <section
            className="mt-7 rounded-2xl border p-5"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
            aria-label="University and course allowance"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--brand-soft-bg)", color: "var(--brand-strong)" }}
                >
                  <Icon d={icons.school} size={19} />
                </span>
                <div>
                  <p
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Your university
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                    {university}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p
                  className="text-sm font-bold tabular-nums"
                  style={{ color: "var(--text-heading)" }}
                >
                  {filledCount}
                  <span style={{ color: "var(--text-muted)" }}> / {MAX_COURSES} courses</span>
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {MAX_COURSES - filledCount === 0
                    ? "Limit reached"
                    : `${MAX_COURSES - filledCount} remaining`}
                </p>
              </div>
            </div>
            <div
              className="mt-4 h-1.5 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--border-card)" }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={MAX_COURSES}
              aria-valuenow={filledCount}
              aria-label="Courses used"
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: "var(--brand)" }}
              />
            </div>
          </section>

          {error && <Banner kind="error" text={error} onDismiss={() => setError("")} />}
          {message && <Banner kind="success" text={message} onDismiss={() => setMessage("")} />}

          {/* ----------------------------- Course list -------------------------- */}
          <div className="mt-6 space-y-4">
            {courses.length === 0 && (
              <div
                className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "var(--brand-soft-bg)", color: "var(--brand-strong)" }}
                >
                  <Icon d={icons.book} size={22} />
                </span>
                <p className="mt-4 text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                  No courses yet
                </p>
                <p className="mt-1 max-w-xs text-sm" style={{ color: "var(--text-muted)" }}>
                  Add the courses you are taking so we can match you with classmates.
                </p>
              </div>
            )}

            {courses.map((course, index) => {
              const errs = fieldErrors[course.uid] ?? {};
              const isDuplicate = duplicateCodes.has(
                `${course.code.trim().toLowerCase()}|${course.goal}`
              );
              return (
                <section
                  key={course.uid}
                  className="rounded-2xl border p-6 transition hover:shadow-md"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
                  aria-label={`Course ${index + 1}`}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold tabular-nums"
                        style={{
                          backgroundColor: "var(--brand-soft-bg)",
                          color: "var(--brand-strong)",
                        }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h2
                        className="truncate text-sm font-bold"
                        style={{ color: "var(--text-heading)" }}
                      >
                        {course.name.trim() || "New course"}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCourse(course.uid)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition hover:bg-red-500/10"
                      style={{ color: "#dc2626" }}
                      aria-label={`Remove course ${index + 1}`}
                    >
                      <Icon d={icons.trash} size={14} />
                      Remove
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                      <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                        Course name
                        <input
                          value={course.name}
                          onChange={(e) => updateCourse(course.uid, "name", e.target.value)}
                          placeholder="e.g. Design and Analysis of Algorithms"
                          className={inputClass}
                          aria-invalid={Boolean(errs.name)}
                          style={errs.name ? { borderColor: "#dc2626" } : undefined}
                        />
                        {errs.name && (
                          <span className="mt-1 block text-xs text-red-500">{errs.name}</span>
                        )}
                      </label>

                      <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                        Course code
                        <input
                          value={course.code}
                          onChange={(e) => updateCourse(course.uid, "code", e.target.value)}
                          placeholder="e.g. CS-GY 6033"
                          className={inputClass}
                          aria-invalid={Boolean(errs.code)}
                          style={errs.code ? { borderColor: "#dc2626" } : undefined}
                        />
                        {errs.code && (
                          <span className="mt-1 block text-xs text-red-500">{errs.code}</span>
                        )}
                      </label>
                    </div>

                    {isDuplicate && (
                      <p
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
                        style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#b45309" }}
                      >
                        <Icon d={icons.alert} size={14} />
                        This course code appears more than once with the same goal.
                      </p>
                    )}

                    <fieldset>
                      <legend
                        className="text-[13px] font-medium"
                        style={{ color: "var(--text-sub)" }}
                      >
                        Study goal
                      </legend>
                      <div
                        className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
                        role="radiogroup"
                      >
                        {goals.map((goal) => {
                          const active = course.goal === goal.value;
                          return (
                            <button
                              key={goal.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => updateCourse(course.uid, "goal", goal.value)}
                              className="rounded-xl border px-3 py-2.5 text-left transition hover:opacity-90"
                              style={{
                                backgroundColor: active
                                  ? "var(--brand-soft-bg)"
                                  : "var(--bg-card-inner)",
                                borderColor: active ? "var(--brand)" : "var(--border-card)",
                                color: active ? "var(--brand-strong)" : "var(--text-sub)",
                              }}
                            >
                              <span className="block text-xs font-semibold">{goal.label}</span>
                              <span className="mt-0.5 block text-[10px] opacity-70">
                                {goal.hint}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <label
                      className={`${labelClass} sm:max-w-[220px]`}
                      style={{ color: "var(--text-sub)" }}
                    >
                      Semester
                      <select
                        value={course.semester}
                        onChange={(e) => updateCourse(course.uid, "semester", e.target.value)}
                        className={inputClass}
                      >
                        {semesters.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
              );
            })}
          </div>

          {courses.length < MAX_COURSES && (
            <button
              type="button"
              onClick={addCourse}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-4 text-sm font-semibold transition hover:opacity-80"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--brand-soft-border)",
                color: "var(--brand)",
              }}
            >
              <Icon d={icons.plus} size={15} />
              Add another course
            </button>
          )}
        </div>

        {/* ---------------------------- Sticky action bar ------------------------- */}
        <div
          className="fixed bottom-0 left-64 right-0 z-30 border-t px-8 py-4 backdrop-blur"
          style={{
            backgroundColor: "color-mix(in srgb, var(--bg-card) 90%, transparent)",
            borderColor: "var(--border-card)",
          }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <p
              className="flex items-center gap-2 text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
              aria-live="polite"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: dirty ? "#d97706" : "#16a34a" }}
                aria-hidden="true"
              />
              {dirty ? "You have unsaved changes" : "All changes saved"}
            </p>

            <div className="flex items-center gap-3">
              {dirty && (
                <button
                  type="button"
                  onClick={resetChanges}
                  disabled={saving}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                  style={ghostStyle}
                >
                  Discard
                </button>
              )}
              <Link
                href="/profile"
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-80"
                style={ghostStyle}
              >
                {dirty ? "Cancel" : "Back to profile"}
              </Link>
              <button
                type="button"
                onClick={saveCourses}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "var(--brand)", color: "var(--brand-fg)" }}
              >
                {saving && <Spinner />}
                {saving ? "Saving…" : "Save courses"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
