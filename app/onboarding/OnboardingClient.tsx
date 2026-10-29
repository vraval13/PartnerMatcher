"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Step = 1 | 2 | 3;

const STUDY_STYLES = [
  { value: "visual",       label: "Visual",       desc: "Diagrams, charts, colour-coding",  icon: "👁️" },
  { value: "auditory",     label: "Auditory",     desc: "Lectures, discussions, podcasts",  icon: "🎧" },
  { value: "reading",      label: "Reading",      desc: "Notes, textbooks, articles",       icon: "📖" },
  { value: "kinesthetic",  label: "Kinesthetic",  desc: "Practice problems, hands-on",      icon: "✋" },
  { value: "mixed",        label: "Mixed",        desc: "Combination of styles",            icon: "🔀" },
] as const;

const COMM_PREFS = [
  { value: "video",      label: "Video call",   icon: "📹" },
  { value: "chat",       label: "Text / chat",  icon: "💬" },
  { value: "in_person",  label: "In person",    icon: "🤝" },
  { value: "mixed",      label: "No preference", icon: "🔀" },
] as const;

const COURSE_GOALS = [
  { value: "study",     label: "General study" },
  { value: "exam_prep", label: "Exam prep" },
  { value: "project",   label: "Project" },
  { value: "tutoring",  label: "Tutoring" },
  { value: "general",   label: "Explore" },
] as const;

const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Graduate", "PhD"];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

interface CourseEntry {
  name: string;
  code: string;
  goal: string;
}

const TOTAL_STEPS = 3;

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Step {step} of {TOTAL_STEPS}
        </span>
        <span className="text-xs font-medium text-indigo-500">
          {step === 1 ? "About you" : step === 2 ? "Study preferences" : "Your courses"}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: "var(--bg-tag)" }}>
        <div
          className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function OnboardingClient({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Basic info
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");

  // Step 2 — Study preferences
  const [studyStyle, setStudyStyle] = useState("");
  const [commPref, setCommPref] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  );

  // Step 3 — Courses
  const [courses, setCourses] = useState<CourseEntry[]>([{ name: "", code: "", goal: "study" }]);

  function addCourse() {
    setCourses((c) => [...c, { name: "", code: "", goal: "study" }]);
  }

  function removeCourse(i: number) {
    setCourses((c) => c.filter((_, idx) => idx !== i));
  }

  function updateCourse(i: number, field: keyof CourseEntry, value: string) {
    setCourses((c) => c.map((entry, idx) => idx === i ? { ...entry, [field]: value } : entry));
  }

  async function handleStep1(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!university.trim() || !major.trim() || !yearOfStudy) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setStep(2);
  }

  async function handleStep2(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!studyStyle || !commPref) {
      setError("Please choose your study style and communication preference.");
      return;
    }
    setError("");
    // Save profile fields from steps 1 + 2
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        university: university.trim(),
        major: major.trim(),
        year_of_study: YEARS.indexOf(yearOfStudy) + 1,
        study_style: studyStyle,
        comm_pref: commPref,
        timezone,
      })
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    setStep(3);
  }

  async function handleFinish(e: React.SyntheticEvent) {
    e.preventDefault();
    const validCourses = courses.filter((c) => c.name.trim());
    if (validCourses.length === 0) {
      setError("Add at least one course.");
      return;
    }
    setError("");
    setLoading(true);

    for (const c of validCourses) {
      // Upsert course into courses table
      const { data: courseRow, error: courseErr } = await supabase
        .from("courses")
        .upsert(
          { name: c.name.trim(), code: c.code.trim() || c.name.trim().slice(0, 10), university: university.trim() },
          { onConflict: "code,university", ignoreDuplicates: false }
        )
        .select("id")
        .single();

      if (courseErr || !courseRow) continue;

      // Insert user_course (ignore if duplicate)
      await supabase.from("user_courses").upsert(
        { user_id: user.id, course_id: courseRow.id, goal: c.goal, semester: "Fall 2026" },
        { onConflict: "user_id,course_id,goal", ignoreDuplicates: true }
      );
    }

    router.push("/dashboard");
    router.refresh();
  }

  const displayName = user.user_metadata?.full_name?.split(" ")[0] ?? "there";

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6 py-12 transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200">
            <svg width="18" height="14" viewBox="0 0 26 22" fill="none">
              <path d="M1 17C1 9.268 6.373 3 13 3C19.627 3 25 9.268 25 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>
              <path d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text-heading)" }}>
            Partner<span className="text-indigo-500">Matcher</span>
          </span>
        </div>

        <div
          className="rounded-3xl border p-8 shadow-sm"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
        >
          <ProgressBar step={step} />

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── Step 1: Basic info ─────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-heading)" }}>
                  Welcome, {displayName}! 👋
                </h2>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  Tell us a bit about your academic life.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-sub)" }}>University</label>
                <input
                  type="text" required value={university} onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. New York University"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all placeholder:opacity-50 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border-card)", color: "var(--text-heading)" }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-sub)" }}>Major / Programme</label>
                <input
                  type="text" required value={major} onChange={(e) => setMajor(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all placeholder:opacity-50 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border-card)", color: "var(--text-heading)" }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-sub)" }}>Year of study</label>
                <div className="flex flex-wrap gap-2">
                  {YEARS.map((y) => (
                    <button
                      key={y} type="button" onClick={() => setYearOfStudy(y)}
                      className="rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                      style={{
                        backgroundColor: yearOfStudy === y ? "#6366f1" : "var(--bg-page)",
                        borderColor: yearOfStudy === y ? "#6366f1" : "var(--border-card)",
                        color: yearOfStudy === y ? "#ffffff" : "var(--text-sub)",
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit"
                className="btn-glow w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
                style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}>
                Continue →
              </button>
            </form>
          )}

          {/* ── Step 2: Study preferences ──────────────────── */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-heading)" }}>How do you learn best?</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  This helps us find partners who complement your style.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium" style={{ color: "var(--text-sub)" }}>Study style</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {STUDY_STYLES.map((s) => (
                    <button
                      key={s.value} type="button" onClick={() => setStudyStyle(s.value)}
                      className="flex items-center gap-3 rounded-xl border p-3 text-left transition-all"
                      style={{
                        backgroundColor: studyStyle === s.value ? "#eef2ff" : "var(--bg-page)",
                        borderColor: studyStyle === s.value ? "#6366f1" : "var(--border-card)",
                      }}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: studyStyle === s.value ? "#4338ca" : "var(--text-sub)" }}>{s.label}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium" style={{ color: "var(--text-sub)" }}>Preferred communication</label>
                <div className="flex flex-wrap gap-2">
                  {COMM_PREFS.map((c) => (
                    <button
                      key={c.value} type="button" onClick={() => setCommPref(c.value)}
                      className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                      style={{
                        backgroundColor: commPref === c.value ? "#6366f1" : "var(--bg-page)",
                        borderColor: commPref === c.value ? "#6366f1" : "var(--border-card)",
                        color: commPref === c.value ? "#ffffff" : "var(--text-sub)",
                      }}
                    >
                      <span>{c.icon}</span> {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-sub)" }}>Your timezone</label>
                <select
                  value={timezone} onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  style={{ backgroundColor: "var(--bg-page)", borderColor: "var(--border-card)", color: "var(--text-heading)" }}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all hover:shadow-sm"
                  style={{ backgroundColor: "var(--bg-btn-outline)", borderColor: "var(--border-btn-outline)", color: "var(--text-btn-outline)" }}>
                  ← Back
                </button>
                <button type="submit" disabled={loading}
                  className="btn-glow flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}>
                  {loading ? "Saving…" : "Continue →"}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Courses ────────────────────────────── */}
          {step === 3 && (
            <form onSubmit={handleFinish} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "var(--text-heading)" }}>Add your courses</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  We&apos;ll match you with students in the same courses.
                </p>
              </div>

              <div className="space-y-3">
                {courses.map((course, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border p-4 space-y-3"
                    style={{ backgroundColor: "var(--bg-row)", borderColor: "var(--border-row)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Course {i + 1}</span>
                      {courses.length > 1 && (
                        <button type="button" onClick={() => removeCourse(i)} className="text-xs text-red-400 hover:text-red-500 transition-colors">Remove</button>
                      )}
                    </div>
                    <input
                      type="text" required value={course.name} onChange={(e) => updateCourse(i, "name", e.target.value)}
                      placeholder="Course name (e.g. Introduction to Algorithms)"
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all placeholder:opacity-50 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)", color: "var(--text-heading)" }}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text" value={course.code} onChange={(e) => updateCourse(i, "code", e.target.value)}
                        placeholder="Code (e.g. CS-GY 6233)"
                        className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all placeholder:opacity-50 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)", color: "var(--text-heading)" }}
                      />
                      <select
                        value={course.goal} onChange={(e) => updateCourse(i, "goal", e.target.value)}
                        className="rounded-xl border px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 min-w-[110px]"
                        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)", color: "var(--text-heading)" }}
                      >
                        {COURSE_GOALS.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {courses.length < 5 && (
                <button type="button" onClick={addCourse}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-medium transition-all hover:border-indigo-400 hover:text-indigo-500"
                  style={{ borderColor: "var(--border-card)", color: "var(--text-muted)" }}>
                  + Add another course
                </button>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)}
                  className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all hover:shadow-sm"
                  style={{ backgroundColor: "var(--bg-btn-outline)", borderColor: "var(--border-btn-outline)", color: "var(--text-btn-outline)" }}>
                  ← Back
                </button>
                <button type="submit" disabled={loading}
                  className="btn-glow flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-60"
                  style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}>
                  {loading ? "Saving…" : "Go to dashboard 🎉"}
                </button>
              </div>

              <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>
                You can add more courses anytime from your profile.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
