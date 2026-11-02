"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/app/components/ThemeProvider";

type Course = {
  course_id: string;
  name: string;
  code: string;
  goal: string;
  semester: string;
};

const goals = [
  { value: "study", label: "General study" },
  { value: "exam_prep", label: "Exam prep" },
  { value: "project", label: "Project" },
  { value: "tutoring", label: "Tutoring" },
  { value: "general", label: "Explore" },
];

export function CoursesClient({
  userId,
  university,
  initialCourses,
}: {
  userId: string;
  university: string;
  initialCourses: Course[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggle } = useTheme();

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function updateCourse(index: number, field: keyof Course, value: string) {
    setCourses((current) =>
      current.map((course, i) => (i === index ? { ...course, [field]: value } : course))
    );
  }

  function addCourse() {
    if (courses.length >= 5) return;

    setCourses((current) => [
      ...current,
      {
        course_id: "",
        name: "",
        code: "",
        goal: "study",
        semester: "Fall 2026",
      },
    ]);
  }

  function removeCourse(index: number) {
    setCourses((current) => current.filter((_, i) => i !== index));
  }

  async function saveCourses() {
    setError("");
    setMessage("");

    const validCourses = courses.filter((course) => course.name.trim());

    if (validCourses.length === 0) {
      setError("Please keep at least one course.");
      return;
    }

    const incompleteCourse = validCourses.find((course) => !course.code.trim());

    if (incompleteCourse) {
      setError("Please enter a course code for every course.");
      return;
    }

    setSaving(true);

    try {
      const savedCourseIds: string[] = [];

      for (const course of validCourses) {
        const courseName = course.name.trim();
        const courseCode = course.code.trim();

        const { data: existingCourse, error: searchError } = await supabase
          .from("courses")
          .select("id")
          .eq("code", courseCode)
          .eq("university", university)
          .maybeSingle();

        if (searchError) {
          throw new Error(searchError.message);
        }

        let courseId: string;

        if (existingCourse) {
          courseId = existingCourse.id;
        } else {
          const { data: newCourse, error: insertError } = await supabase
            .from("courses")
            .insert({
              name: courseName,
              code: courseCode,
              university,
            })
            .select("id")
            .single();

          if (insertError || !newCourse) {
            throw new Error(insertError?.message ?? "Could not create the course.");
          }

          courseId = newCourse.id;
        }

        savedCourseIds.push(courseId);

        const { error: associationError } = await supabase.from("user_courses").upsert(
          {
            user_id: userId,
            course_id: courseId,
            goal: course.goal,
            semester: course.semester || "Fall 2026",
          },
          {
            onConflict: "user_id,course_id,goal",
            ignoreDuplicates: false,
          }
        );

        if (associationError) {
          throw new Error(associationError.message);
        }
      }

      const uniqueCourseIds = [...new Set(savedCourseIds)];

      const { error: deleteError } = await supabase
        .from("user_courses")
        .delete()
        .eq("user_id", userId)
        .not("course_id", "in", `(${uniqueCourseIds.join(",")})`);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setMessage("Your courses have been saved successfully.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/10";

  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors duration-300 dark:bg-[#08080f] dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-[#08080f]/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/profile"
            className="text-sm font-semibold text-slate-600 transition hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            ← Back to Profile
          </Link>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === "light" ? (
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v2" />
                  <path d="M12 19v2" />
                  <path d="m4.22 4.22 1.42 1.42" />
                  <path d="m18.36 18.36 1.42 1.42" />
                  <path d="M3 12h2" />
                  <path d="M19 12h2" />
                  <path d="m4.22 19.78 1.42-1.42" />
                  <path d="m18.36 5.64 1.42-1.42" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              ) : (
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
                </svg>
              )}
            </button>

            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              PartnerMatcher
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Academic information
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            Manage your courses
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Add, edit or remove courses to find students studying the same subjects.
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111119]">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Your university
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{university}</p>
          </div>

          <span className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            {courses.length}/5 courses
          </span>
        </div>

        <div className="space-y-4">
          {courses.map((course, index) => (
            <section
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-[#111119]"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Course {String(index + 1).padStart(2, "0")}
                </h2>

                <button
                  type="button"
                  onClick={() => removeCourse(index)}
                  className="text-xs font-semibold text-red-500 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-4">
                <label className={labelClass}>
                  Course name
                  <input
                    value={course.name}
                    onChange={(e) => updateCourse(index, "name", e.target.value)}
                    placeholder="e.g. Design and Analysis of Algorithms"
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Course code
                  <input
                    value={course.code}
                    onChange={(e) => updateCourse(index, "code", e.target.value)}
                    placeholder="e.g. CS-GY 6033"
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Study goal
                  <select
                    value={course.goal}
                    onChange={(e) => updateCourse(index, "goal", e.target.value)}
                    className={inputClass}
                  >
                    {goals.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          ))}
        </div>

        {courses.length < 5 && (
          <button
            type="button"
            onClick={addCourse}
            className="mt-4 w-full rounded-2xl border border-dashed border-slate-300 bg-white py-4 text-sm font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-[#111119] dark:text-indigo-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30"
          >
            + Add another course
          </button>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
          >
            {message}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111119]">
          <Link
            href="/profile"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={saveCourses}
            disabled={saving}
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {saving ? "Saving..." : "Save courses"}
          </button>
        </div>
      </main>
    </div>
  );
}
