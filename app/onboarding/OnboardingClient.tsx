"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { saveCourses } from "@/lib/onboarding/courses";

// ── Constants ───────────────────────────────────────────────────────────────

const STUDY_STYLES = [
  { value: "visual",      label: "Visual",      desc: "Diagrams, charts, colour-coding", icon: "👁️" },
  { value: "auditory",    label: "Auditory",    desc: "Lectures, discussions, podcasts", icon: "🎧" },
  { value: "reading",     label: "Reading",     desc: "Notes, textbooks, articles",      icon: "📖" },
  { value: "kinesthetic", label: "Kinesthetic", desc: "Practice problems, hands-on",     icon: "✋" },
  { value: "mixed",       label: "Mixed",       desc: "Combination of styles",           icon: "🔀" },
] as const;

const COMM_PREFS = [
  { value: "video",     label: "Video call",    icon: "📹" },
  { value: "chat",      label: "Text / chat",   icon: "💬" },
  { value: "in_person", label: "In person",     icon: "🤝" },
  { value: "mixed",     label: "No preference", icon: "🔀" },
] as const;

const COURSE_GOALS = [
  { value: "study",     label: "General study" },
  { value: "exam_prep", label: "Exam prep"     },
  { value: "project",   label: "Project"       },
  { value: "tutoring",  label: "Tutoring"      },
  { value: "general",   label: "Explore"       },
] as const;

const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Graduate", "PhD"];

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Asia/Dubai", "Asia/Kolkata",
  "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

interface CourseEntry { name: string; code: string; goal: string; }

// ── Question metadata ────────────────────────────────────────────────────────

const QUESTIONS = [
  { q: "What university do you attend?",        sub: "Start typing your university name."                             },
  { q: "What's your major or programme?",       sub: "e.g. Computer Science, Business, Engineering"                  },
  { q: "What year are you in?",                 sub: "Select your current year of study."                            },
  { q: "How do you learn best?",                sub: "We use this to find partners who complement your style."        },
  { q: "How do you prefer to communicate?",     sub: "Pick what feels most natural to you."                          },
  { q: "What timezone are you in?",             sub: "So we can suggest partners who match your schedule."           },
  { q: "What courses are you taking?",          sub: "We'll match you with students in the same courses."            },
] as const;

const TOTAL_Q = QUESTIONS.length;

// ── Sub-components ───────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200">
        <svg width="15" height="12" viewBox="0 0 26 22" fill="none">
          <path d="M1 17C1 9.268 6.373 3 13 3C19.627 3 25 9.268 25 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>
          <path d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
        </svg>
      </div>
      <span className="text-sm font-bold tracking-tight" style={{ color: "var(--text-heading)" }}>
        Partner<span className="text-indigo-500">Matcher</span>
      </span>
    </div>
  );
}

function OkButton({ onClick, disabled, label = "OK" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={disabled}
        className="btn-glow flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
        style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
      >
        {label} <span className="opacity-60 text-xs">✓</span>
      </button>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        or press{" "}
        <kbd
          className="rounded border px-1.5 py-0.5 text-[10px] font-medium"
          style={{ borderColor: "var(--border-card)", color: "var(--text-muted)", backgroundColor: "var(--bg-tag)" }}
        >
          Enter ↵
        </kbd>
      </span>
    </div>
  );
}

function TextQuestion({
  value,
  onChange,
  placeholder,
  onAdvance,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onAdvance: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Tiny delay so the slide-in animation doesn't fight with focus
    const t = setTimeout(() => ref.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdvance(); } }}
        placeholder={placeholder}
        className="w-full border-b-2 bg-transparent pb-3 text-xl outline-none transition-colors placeholder:opacity-25 sm:text-2xl"
        style={{ borderColor: value ? "#6366f1" : "var(--border-card)", color: "var(--text-heading)" }}
      />
      <OkButton onClick={onAdvance} />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function OnboardingClient({ user }: { user: User }) {
  const router = useRouter();
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  };

  // Navigation
  const [qIdx, setQIdx]       = useState(0);
  const [dir, setDir]         = useState<1 | -1>(1);
  const [animKey, setAnimKey] = useState(0);
  const [error, setError]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(false);

  // Field values
  const [university,  setUniversity]  = useState("");
  const [major,       setMajor]       = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [studyStyle,  setStudyStyle]  = useState("");
  const [commPref,    setCommPref]    = useState("");
  const [timezone,    setTimezone]    = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  );
  const [courses, setCourses] = useState<CourseEntry[]>([{ name: "", code: "", goal: "study" }]);

  const displayName = user.user_metadata?.full_name?.split(" ")[0] ?? "there";

  // ── Navigation helpers ──────────────────────────────────────────────────

  function navigate(nextIdx: number, d: 1 | -1) {
    setDir(d);
    setAnimKey((k) => k + 1);
    setQIdx(nextIdx);
    setError("");
  }

  function validateCurrent(): string {
    if (qIdx === 0 && !university.trim())  return "Please enter your university.";
    if (qIdx === 1 && !major.trim())       return "Please enter your major or programme.";
    if (qIdx === 2 && !yearOfStudy)        return "Please select your year of study.";
    if (qIdx === 3 && !studyStyle)         return "Please choose a study style.";
    if (qIdx === 4 && !commPref)           return "Please choose a communication preference.";
    return "";
  }

  async function advance() {
    const err = validateCurrent();
    if (err) { setError(err); return; }

    // Save profile fields after the timezone question (before courses)
    if (qIdx === 5) {
      setSaving(true);
      const { error: saveErr } = await getSupabase()
        .from("profiles")
        .update({
          university:    university.trim(),
          major:         major.trim(),
          year_of_study: YEARS.indexOf(yearOfStudy) + 1,
          study_style:   studyStyle,
          comm_pref:     commPref,
          timezone,
        })
        .eq("user_id", user.id);
      setSaving(false);
      if (saveErr) { setError("Failed to save your preferences. Please check your connection and try again."); return; }
    }

    navigate(qIdx + 1, 1);
  }

  // Auto-advance for single-tap selection questions
  // Captures qIdx via closure at call time — safe because selection questions
  // disable themselves while the timeout is in flight (no double-tap risk).
  function autoAdvance(setter: (v: string) => void, value: string) {
    setter(value);
    const capturedIdx = qIdx;
    setTimeout(() => navigate(capturedIdx + 1, 1), 320);
  }

  async function handleFinish() {
    const validCourses = courses.filter((c) => c.name.trim());
    if (validCourses.length === 0) { setError("Please add at least one course."); return; }
    setError("");
    setLoading(true);

    try {
      await saveCourses(getSupabase(), user.id, university, validCourses);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save courses. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const progress = ((qIdx + 1) / TOTAL_Q) * 100;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-page)" }}>

      {/* ── Top progress bar ──────────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-50 h-[3px]" style={{ backgroundColor: "var(--border-card)" }}>
        <div
          className="h-full bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 pt-8 pb-2 sm:px-10">
        <Logo />

        <div className="flex items-center gap-3">
          {qIdx > 0 && (
            <button
              onClick={() => navigate(qIdx - 1, -1)}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all hover:opacity-70"
              style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-tag)" }}
            >
              ← Back
            </button>
          )}
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: "var(--text-muted)" }}
          >
            {qIdx + 1} <span style={{ color: "var(--border-card)" }}>/</span> {TOTAL_Q}
          </span>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
        <div className="w-full max-w-xl">

          {/* Animated question wrapper — key changes trigger the CSS animation */}
          <div
            key={animKey}
            className={dir === 1 ? "slide-in-right" : "slide-in-left"}
          >

            {/* Question label */}
            <div className="mb-7">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-500 tabular-nums">
                  {String(qIdx + 1).padStart(2, "0")}
                </span>
                <svg width="12" height="8" viewBox="0 0 14 10" fill="none" aria-hidden>
                  <path d="M0 5H11M11 5L7.5 1.5M11 5L7.5 8.5" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold leading-snug sm:text-3xl" style={{ color: "var(--text-heading)" }}>
                {qIdx === 0
                  ? `Hey ${displayName}! 👋 ${QUESTIONS[0].q}`
                  : QUESTIONS[qIdx].q}
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {QUESTIONS[qIdx].sub}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* ── Q1: University ─────────────────────────────────────── */}
            {qIdx === 0 && (
              <TextQuestion
                value={university}
                onChange={(v) => { setUniversity(v); setError(""); }}
                placeholder="New York University"
                onAdvance={advance}
              />
            )}

            {/* ── Q2: Major ──────────────────────────────────────────── */}
            {qIdx === 1 && (
              <TextQuestion
                value={major}
                onChange={(v) => { setMajor(v); setError(""); }}
                placeholder="Computer Science"
                onAdvance={advance}
              />
            )}

            {/* ── Q3: Year of study ──────────────────────────────────── */}
            {qIdx === 2 && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {YEARS.map((y) => {
                  const sel = yearOfStudy === y;
                  return (
                    <button
                      key={y}
                      onClick={() => autoAdvance(setYearOfStudy, y)}
                      className="rounded-2xl border p-4 text-left transition-all duration-150 hover:border-indigo-400"
                      style={{
                        backgroundColor: sel ? "rgba(99,102,241,0.09)" : "var(--bg-card)",
                        borderColor:     sel ? "#6366f1"               : "var(--border-card)",
                        boxShadow:       sel ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
                      }}
                    >
                      <span
                        className="text-sm font-semibold"
                        style={{ color: sel ? "#6366f1" : "var(--text-sub)" }}
                      >
                        {y}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Q4: Study style ────────────────────────────────────── */}
            {qIdx === 3 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {STUDY_STYLES.map((s) => {
                  const sel = studyStyle === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => autoAdvance(setStudyStyle, s.value)}
                      className="flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150 hover:border-indigo-400"
                      style={{
                        backgroundColor: sel ? "rgba(99,102,241,0.09)" : "var(--bg-card)",
                        borderColor:     sel ? "#6366f1"               : "var(--border-card)",
                        boxShadow:       sel ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
                      }}
                    >
                      <span
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl"
                        style={{ backgroundColor: sel ? "rgba(99,102,241,0.15)" : "var(--bg-tag)" }}
                      >
                        {s.icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: sel ? "#6366f1" : "var(--text-sub)" }}>
                          {s.label}
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                          {s.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Q5: Communication preference ───────────────────────── */}
            {qIdx === 4 && (
              <div className="grid grid-cols-2 gap-3">
                {COMM_PREFS.map((c) => {
                  const sel = commPref === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => autoAdvance(setCommPref, c.value)}
                      className="flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all duration-150 hover:border-indigo-400"
                      style={{
                        backgroundColor: sel ? "rgba(99,102,241,0.09)" : "var(--bg-card)",
                        borderColor:     sel ? "#6366f1"               : "var(--border-card)",
                        boxShadow:       sel ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
                      }}
                    >
                      <span className="text-2xl">{c.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: sel ? "#6366f1" : "var(--text-sub)" }}>
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Q6: Timezone ───────────────────────────────────────── */}
            {qIdx === 5 && (
              <div>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-2xl border px-5 py-4 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor:     "var(--border-card)",
                    color:           "var(--text-heading)",
                  }}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={advance}
                    disabled={saving}
                    className="btn-glow flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
                  >
                    {saving ? "Saving…" : "Continue"} →
                  </button>
                  {saving && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Saving your preferences…
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── Q7: Courses ────────────────────────────────────────── */}
            {qIdx === 6 && (
              <div>
                <div className="space-y-3">
                  {courses.map((course, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border p-4 space-y-3 transition-all"
                      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-500">
                          Course {String(i + 1).padStart(2, "0")}
                        </span>
                        {courses.length > 1 && (
                          <button
                            onClick={() => setCourses((c) => c.filter((_, idx) => idx !== i))}
                            className="text-xs transition-colors hover:text-red-500"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={course.name}
                        onChange={(e) =>
                          setCourses((c) =>
                            c.map((entry, idx) =>
                              idx === i ? { ...entry, name: e.target.value } : entry
                            )
                          )
                        }
                        placeholder="Course name (e.g. Introduction to Algorithms)"
                        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all placeholder:opacity-35 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                        style={{
                          backgroundColor: "var(--bg-page)",
                          borderColor:     "var(--border-card)",
                          color:           "var(--text-heading)",
                        }}
                      />

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={course.code}
                          onChange={(e) =>
                            setCourses((c) =>
                              c.map((entry, idx) =>
                                idx === i ? { ...entry, code: e.target.value } : entry
                              )
                            )
                          }
                          placeholder="Code (e.g. CS-GY 6233)"
                          className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all placeholder:opacity-35 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                          style={{
                            backgroundColor: "var(--bg-page)",
                            borderColor:     "var(--border-card)",
                            color:           "var(--text-heading)",
                          }}
                        />
                        <select
                          value={course.goal}
                          onChange={(e) =>
                            setCourses((c) =>
                              c.map((entry, idx) =>
                                idx === i ? { ...entry, goal: e.target.value } : entry
                              )
                            )
                          }
                          className="min-w-[110px] rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                          style={{
                            backgroundColor: "var(--bg-page)",
                            borderColor:     "var(--border-card)",
                            color:           "var(--text-heading)",
                          }}
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
                  <button
                    onClick={() =>
                      setCourses((c) => [...c, { name: "", code: "", goal: "study" }])
                    }
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm font-medium transition-all hover:border-indigo-400 hover:text-indigo-500"
                    style={{ borderColor: "var(--border-card)", color: "var(--text-muted)" }}
                  >
                    + Add another course
                  </button>
                )}

                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="btn-glow mt-5 w-full rounded-2xl py-3.5 text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
                >
                  {loading ? "Setting up your profile…" : "Go to dashboard 🎉"}
                </button>

                <p className="mt-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                  You can add more courses anytime from your profile.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
