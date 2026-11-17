"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/app/components/ThemeProvider";
import { Sidebar } from "@/app/dashboard/Sidebar";

type Profile = {
  university: string | null;
  major: string | null;
  year_of_study: number | null;
  study_style: string | null;
  comm_pref: string | null;
  timezone: string | null;
};

type Course = {
  name: string;
  code: string;
  goal: string;
  semester: string;
};

const years = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Graduate", "PhD"];

const studyStyles = ["visual", "auditory", "reading", "kinesthetic", "mixed"];
const communicationPrefs = ["video", "chat", "in_person", "mixed"];

const fieldClass =
  "mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-4";

const labelClass = "block text-sm font-medium";

export function ProfileClient({
  user,
  profile,
  courses,
}: {
  user: User;
  profile: Profile | null;
  courses: Course[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggle } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  };

  const nameFromAuth = String(
    user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split("@")[0] ??
      "Student"
  );

  const [name, setName] = useState(nameFromAuth);
  const [university, setUniversity] = useState(profile?.university ?? "");
  const [major, setMajor] = useState(profile?.major ?? "");
  const [year, setYear] = useState(
    profile?.year_of_study ? (years[profile.year_of_study - 1] ?? "Graduate") : "Graduate"
  );
  const [studyStyle, setStudyStyle] = useState(profile?.study_style ?? "mixed");
  const [commPref, setCommPref] = useState(profile?.comm_pref ?? "mixed");
  const [timezone, setTimezone] = useState(profile?.timezone ?? "America/New_York");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });

    if (authError) {
      setError(authError.message);
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        university: university.trim(),
        major: major.trim(),
        year_of_study: years.indexOf(year) + 1,
        study_style: studyStyle,
        comm_pref: commPref,
        timezone,
      })
      .eq("user_id", user.id);

    if (profileError) {
      setError(
        `Your name was updated, but profile details could not be saved: ${profileError.message}`
      );
      setSaving(false);
      return;
    }

    setMessage("Profile saved successfully.");
    setSaving(false);
    router.refresh();
  }

  const display = name.trim() || "Student";

  const initials = display
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const label = (value: string) =>
    value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

  const completedFields = [
    name.trim(),
    user.email,
    university.trim(),
    major.trim(),
    year,
    studyStyle,
    commPref,
    timezone,
    courses.length > 0,
  ].filter(Boolean).length;

  const completion = Math.round((completedFields / 9) * 100);

  const timezones = [
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

  const fieldStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-card-inner)",
    borderColor: "var(--border-card)",
    color: "var(--text-heading)",
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-page)" }}
    >
      <Sidebar user={user} onSignOut={handleSignOut} />

      <main className="ml-64 min-h-screen px-8 py-12">
        <div className="mx-auto max-w-6xl">
          {/* Page heading */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p
                className="mb-2 text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: "var(--brand)" }}
              >
                Your account
              </p>

              <h1
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ color: "var(--text-heading)" }}
              >
                Student Profile
              </h1>

              <p
                className="mt-2 max-w-2xl text-sm leading-6"
                style={{ color: "var(--text-muted)" }}
              >
                Manage your personal information, academic background, and study preferences to find
                compatible study partners.
              </p>
            </div>

            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-card)",
                color: "var(--text-sub)",
              }}
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
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
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
                  <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6.5 6.5 0 0 0 8.268 8.268c.344-.215.825-.003.803.401" />
                </svg>
              )}
            </button>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
            {/* Sidebar */}
            <aside className="space-y-5">
              <section
                className="overflow-hidden rounded-2xl border"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <div
                  className="h-24"
                  style={{
                    background: "linear-gradient(135deg, var(--brand), var(--brand-strong))",
                  }}
                />

                <div className="px-6 pb-6">
                  <div
                    className="-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl border-4 text-2xl font-bold"
                    style={{
                      borderColor: "var(--bg-card)",
                      backgroundColor: "var(--bg-row)",
                      color: "var(--text-heading)",
                    }}
                  >
                    {initials}
                  </div>

                  <h2 className="mt-4 text-lg font-bold" style={{ color: "var(--text-heading)" }}>
                    {display}
                  </h2>

                  <p className="mt-1 break-all text-sm" style={{ color: "var(--text-muted)" }}>
                    {user.email}
                  </p>

                  <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--border-row)" }}>
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Academic profile
                    </p>

                    <p className="mt-3 text-sm font-semibold" style={{ color: "var(--text-sub)" }}>
                      {university || "University not added"}
                    </p>

                    <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                      {major || "Major not added"}
                    </p>

                    <p
                      className="mt-2 inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: "var(--bg-row)", color: "var(--text-sub)" }}
                    >
                      {year}
                    </p>
                  </div>

                  <div
                    className="mt-5 flex items-center justify-between rounded-xl px-3 py-3"
                    style={{ backgroundColor: "var(--bg-row)" }}
                  >
                    <span className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>
                      Enrolled courses
                    </span>

                    <span
                      className="rounded-lg px-2.5 py-1 text-sm font-bold"
                      style={{ backgroundColor: "var(--bg-card)", color: "var(--text-heading)" }}
                    >
                      {courses.length}
                    </span>
                  </div>

                  <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--border-row)" }}>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-sub)" }}>
                        Profile completion
                      </span>

                      <span className="text-sm font-bold" style={{ color: "var(--brand)" }}>
                        {completion}%
                      </span>
                    </div>

                    <div
                      className="h-2.5 overflow-hidden rounded-full"
                      style={{ backgroundColor: "var(--bg-row)" }}
                      role="progressbar"
                      aria-label="Profile completion"
                      aria-valuenow={completion}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${completion}%`, backgroundColor: "var(--brand)" }}
                      />
                    </div>

                    <p className="mt-2 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
                      Complete your profile to help find better study partners.
                    </p>
                  </div>
                </div>
              </section>

              <section
                className="rounded-2xl border p-5"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <h3 className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>
                  Profile tip
                </h3>

                <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                  Keep your academic details and study preferences updated. This information helps
                  other students find compatible study partners.
                </p>
              </section>
            </aside>

            {/* Profile form */}
            <form onSubmit={saveProfile} className="space-y-6">
              {/* Personal information */}
              <section
                className="rounded-2xl border p-6 sm:p-8"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <div className="mb-6">
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--brand)" }}
                  >
                    01 / Personal
                  </p>

                  <h2 className="mt-2 text-lg font-bold" style={{ color: "var(--text-heading)" }}>
                    Basic information
                  </h2>

                  <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    Your personal and account details.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                    Full name
                    <input
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={fieldClass}
                      style={fieldStyle}
                      placeholder="Enter your full name"
                    />
                  </label>

                  <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                    Email address
                    <input
                      readOnly
                      value={user.email ?? ""}
                      className={`${fieldClass} cursor-not-allowed`}
                      style={{
                        ...fieldStyle,
                        backgroundColor: "var(--bg-row)",
                        color: "var(--text-muted)",
                      }}
                    />
                    <span
                      className="mt-2 block text-xs font-normal"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Managed by your sign-in account.
                    </span>
                  </label>
                </div>
              </section>

              {/* Education */}
              <section
                className="rounded-2xl border p-6 sm:p-8"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <div className="mb-6">
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--brand)" }}
                  >
                    02 / Education
                  </p>

                  <h2 className="mt-2 text-lg font-bold" style={{ color: "var(--text-heading)" }}>
                    Academic details
                  </h2>

                  <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    Tell us about your university and current studies.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                    University
                    <input
                      required
                      maxLength={160}
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className={fieldClass}
                      style={fieldStyle}
                      placeholder="e.g. New York University"
                    />
                  </label>

                  <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                    Major / Programme
                    <input
                      required
                      maxLength={120}
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className={fieldClass}
                      style={fieldStyle}
                      placeholder="e.g. Computer Science"
                    />
                  </label>

                  <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                    Year of study
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className={fieldClass}
                      style={fieldStyle}
                    >
                      {years.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                    Time zone
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className={fieldClass}
                      style={fieldStyle}
                    >
                      {timezones.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {/* Preferences */}
              <section
                className="rounded-2xl border p-6 sm:p-8"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <div className="mb-6">
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--brand)" }}
                  >
                    03 / Preferences
                  </p>

                  <h2 className="mt-2 text-lg font-bold" style={{ color: "var(--text-heading)" }}>
                    Study preferences
                  </h2>

                  <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    Help us understand how you prefer to learn and communicate.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                    Preferred study style
                    <select
                      value={studyStyle}
                      onChange={(e) => setStudyStyle(e.target.value)}
                      className={fieldClass}
                      style={fieldStyle}
                    >
                      {studyStyles.map((item) => (
                        <option key={item} value={item}>
                          {label(item)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={labelClass} style={{ color: "var(--text-sub)" }}>
                    Communication preference
                    <select
                      value={commPref}
                      onChange={(e) => setCommPref(e.target.value)}
                      className={fieldClass}
                      style={fieldStyle}
                    >
                      {communicationPrefs.map((item) => (
                        <option key={item} value={item}>
                          {label(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {/* Courses */}
              <section
                className="rounded-2xl border p-6 sm:p-8"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <div className="mb-6">
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--brand)" }}
                  >
                    04 / Learning
                  </p>

                  <h2 className="mt-2 text-lg font-bold" style={{ color: "var(--text-heading)" }}>
                    Your courses
                  </h2>

                  <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    Courses associated with your student account.
                  </p>
                </div>

                {courses.length ? (
                  <div className="space-y-3">
                    {courses.map((course, index) => (
                      <div
                        key={`${course.code}-${index}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                        style={{
                          backgroundColor: "var(--bg-row)",
                          borderColor: "var(--border-row)",
                        }}
                      >
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-sub)" }}>
                            {course.name}
                          </p>

                          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                            {course.code}
                            {course.semester ? ` · ${course.semester}` : ""}
                          </p>
                        </div>

                        <span
                          className="rounded-full px-3 py-1.5 text-xs font-semibold"
                          style={{ backgroundColor: "var(--bg-tag)", color: "var(--text-sub)" }}
                        >
                          {label(course.goal)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="rounded-xl border border-dashed px-5 py-8 text-center"
                    style={{ backgroundColor: "var(--bg-row)", borderColor: "var(--border-row)" }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--text-sub)" }}>
                      No courses added yet
                    </p>

                    <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                      Add your courses through the course management page to improve partner
                      suggestions.
                    </p>
                  </div>
                )}

                <Link
                  href="/profile/courses"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-80"
                  style={{ color: "var(--brand)" }}
                >
                  Update courses
                  <span>→</span>
                </Link>
              </section>

              {/* Messages */}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border p-4 text-sm"
                  style={{
                    borderColor: "rgba(220,38,38,0.35)",
                    backgroundColor: "rgba(220,38,38,0.1)",
                    color: "#b91c1c",
                  }}
                >
                  {error}
                </p>
              )}

              {message && (
                <p
                  role="status"
                  className="rounded-xl border p-4 text-sm"
                  style={{
                    borderColor: "rgba(22,163,74,0.35)",
                    backgroundColor: "rgba(22,163,74,0.1)",
                    color: "#15803d",
                  }}
                >
                  {message}
                </p>
              )}

              {/* Save actions */}
              <div
                className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border p-5"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-card)" }}
              >
                <Link
                  href="/dashboard"
                  className="rounded-xl border px-5 py-3 text-sm font-semibold transition hover:opacity-80"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-card)",
                    color: "var(--text-sub)",
                  }}
                >
                  Cancel
                </Link>

                <button
                  disabled={saving}
                  type="submit"
                  className="rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: "var(--brand)", color: "var(--brand-fg)" }}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
