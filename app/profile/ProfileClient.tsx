"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/app/components/ThemeProvider";

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

const years = [
  "1st year",
  "2nd year",
  "3rd year",
  "4th year",
  "5th year",
  "Graduate",
  "PhD",
];

const studyStyles = ["visual", "auditory", "reading", "kinesthetic", "mixed"];
const communicationPrefs = ["video", "chat", "in_person", "mixed"];

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/10";

const labelClass =
  "block text-sm font-medium text-slate-700 dark:text-slate-300";

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
    profile?.year_of_study
      ? years[profile.year_of_study - 1] ?? "Graduate"
      : "Graduate"
  );
  const [studyStyle, setStudyStyle] = useState(
    profile?.study_style ?? "mixed"
  );
  const [commPref, setCommPref] = useState(
    profile?.comm_pref ?? "mixed"
  );
  const [timezone, setTimezone] = useState(
    profile?.timezone ?? "America/New_York"
  );

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors duration-300 dark:bg-[#08080f] dark:text-slate-100">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-[#08080f]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            <span className="text-lg">←</span>
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggle}
              aria-label={
                theme === "light" ? "Switch to dark mode" : "Switch to light mode"
              }
              title={
                theme === "light" ? "Switch to dark mode" : "Switch to light mode"
              }
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

            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              PartnerMatcher
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        {/* Page heading */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
            Your account
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Student Profile
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Manage your personal information, academic background, and study
            preferences to find compatible study partners.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111119]">
              <div className="h-24 bg-slate-900 dark:bg-slate-800" />

              <div className="px-6 pb-6">
                <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-slate-100 text-2xl font-bold text-slate-900 shadow-sm dark:border-[#111119] dark:bg-slate-800 dark:text-white">
                  {initials}
                </div>

                <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                  {display}
                </h2>

                <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>

                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Academic profile
                  </p>

                  <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {university || "University not added"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {major || "Major not added"}
                  </p>

                  <p className="mt-2 inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {year}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-3 dark:bg-slate-800">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Enrolled courses
                  </span>

                  <span className="rounded-lg bg-white px-2.5 py-1 text-sm font-bold text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white">
                    {courses.length}
                  </span>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Profile completion
                    </span>

                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {completion}%
                    </span>
                  </div>

                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                    role="progressbar"
                    aria-label="Profile completion"
                    aria-valuenow={completion}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${completion}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Complete your profile to help find better study partners.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111119]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Profile tip
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Keep your academic details and study preferences updated.
                This information helps other students find compatible study
                partners.
              </p>
            </section>
          </aside>

          {/* Profile form */}
          <form onSubmit={saveProfile} className="space-y-6">
            {/* Personal information */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111119] sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  01 / Personal
                </p>

                <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  Basic information
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your personal and account details.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Full name

                  <input
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                    placeholder="Enter your full name"
                  />
                </label>

                <label className={labelClass}>
                  Email address

                  <input
                    readOnly
                    value={user.email ?? ""}
                    className={`${fieldClass} cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400`}
                  />

                  <span className="mt-2 block text-xs font-normal text-slate-400">
                    Managed by your sign-in account.
                  </span>
                </label>
              </div>
            </section>

            {/* Education */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111119] sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  02 / Education
                </p>

                <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  Academic details
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Tell us about your university and current studies.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  University

                  <input
                    required
                    maxLength={160}
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. New York University"
                  />
                </label>

                <label className={labelClass}>
                  Major / Programme

                  <input
                    required
                    maxLength={120}
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. Computer Science"
                  />
                </label>

                <label className={labelClass}>
                  Year of study

                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className={fieldClass}
                  >
                    {years.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  Time zone

                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className={fieldClass}
                  >
                    {timezones.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {/* Preferences */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111119] sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  03 / Preferences
                </p>

                <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  Study preferences
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Help us understand how you prefer to learn and communicate.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className={labelClass}>
                  Preferred study style

                  <select
                    value={studyStyle}
                    onChange={(e) => setStudyStyle(e.target.value)}
                    className={fieldClass}
                  >
                    {studyStyles.map((item) => (
                      <option key={item} value={item}>
                        {label(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  Communication preference

                  <select
                    value={commPref}
                    onChange={(e) => setCommPref(e.target.value)}
                    className={fieldClass}
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
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111119] sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  04 / Learning
                </p>

                <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  Your courses
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Courses associated with your student account.
                </p>
              </div>

              {courses.length ? (
                <div className="space-y-3">
                  {courses.map((course, index) => (
                    <div
                      key={`${course.code}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {course.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {course.code}
                          {course.semester ? ` · ${course.semester}` : ""}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {label(course.goal)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    No courses added yet
                  </p>

                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Add your courses through the course management page to
                    improve partner suggestions.
                  </p>
                </div>
              )}

              <Link
                href="/profile/courses"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Update courses
                <span>→</span>
              </Link>
            </section>

            {/* Messages */}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
              >
                {message}
              </p>
            )}

            {/* Save actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111119]">
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </Link>

              <button
                disabled={saving}
                type="submit"
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}