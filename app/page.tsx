import Link from "next/link";
import { Navbar } from "./components/Navbar";

const CURRENT_YEAR = 2026;

const features = [
  {
    number: "01",
    title: "Course Study",
    description:
      "Find classmates studying the same course and work through challenging topics together.",
    tags: ["Coursework", "Assignments", "Projects"],
    icon: "📚",
  },
  {
    number: "02",
    title: "Exam Preparation",
    description:
      "Prepare for upcoming exams with partners who share your subjects and study goals.",
    tags: ["Exam prep", "Revision", "Practice"],
    icon: "🎯",
  },
  {
    number: "03",
    title: "Skills & Languages",
    description:
      "Practice a new language or develop skills with someone who shares your interests.",
    tags: ["Languages", "Coding", "Skills"],
    icon: "💬",
  },
];

const steps = [
  {
    step: "01",
    title: "Set your goals",
    description: "Tell us what you want to study, practice, or improve.",
  },
  {
    step: "02",
    title: "Discover partners",
    description: "Explore compatible students based on goals and availability.",
  },
  {
    step: "03",
    title: "Connect and learn",
    description: "Send a connection request and plan your learning sessions.",
  },
];

const heroRows = [
  {
    initials: "CS",
    iconBg: "#dbeafe",
    iconBgDark: "#1e3a5f",
    iconFg: "#1d4ed8",
    label: "Course study partner",
    sub: "Shared courses and learning goals",
  },
  {
    initials: "EP",
    iconBg: "#fef3c7",
    iconBgDark: "#422006",
    iconFg: "#d97706",
    label: "Exam preparation",
    sub: "Prepare and revise together",
  },
  {
    initials: "SL",
    iconBg: "#ede9fe",
    iconBgDark: "#2e1065",
    iconFg: "#7c3aed",
    label: "Skills & languages",
    sub: "Practice, improve, and grow",
  },
];

export default function Home() {
  return (
    <main
      className="min-h-screen transition-colors duration-200"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-page)" }}
    >
      <Navbar />

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative flex flex-col items-center overflow-hidden px-6 pb-24 pt-20 text-center lg:pb-32 lg:pt-28">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />

        {/* Beta badge */}
        <div
          className="relative mb-10 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-colors duration-200"
          style={{
            backgroundColor: "var(--bg-badge)",
            borderColor: "var(--border-badge)",
            color: "var(--text-muted)",
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--dot-badge)" }}
          />
          Now in Public Beta
        </div>

        {/* Headline */}
        <h1
          className="relative mx-auto max-w-3xl text-5xl font-bold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl"
          style={{ color: "var(--text-heading)" }}
        >
          Find your perfect{" "}
          <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 bg-clip-text text-transparent">
            study partner
          </span>
        </h1>

        <p
          className="relative mx-auto mt-6 max-w-xl text-lg leading-8"
          style={{ color: "var(--text-muted)" }}
        >
          Discover compatible study partners based on your courses, learning
          goals, and availability. Make every study session more meaningful.
        </p>

        {/* CTA buttons */}
        <div className="relative mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-colors duration-200"
            style={{
              backgroundColor: "var(--btn-primary-bg)",
              color: "var(--btn-primary-fg)",
            }}
          >
            Get started — it&apos;s free
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border px-6 py-3 text-sm font-semibold transition-colors duration-200"
            style={{
              backgroundColor: "var(--bg-btn-outline)",
              borderColor: "var(--border-btn-outline)",
              color: "var(--text-btn-outline)",
            }}
          >
            See how it works →
          </a>
        </div>

        {/* Social proof */}
        <div
          className="relative mt-10 flex flex-wrap justify-center gap-4 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {["Goal-based matching", "Flexible availability", "Student-focused"].map(
            (label) => (
              <span key={label} className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-emerald-500"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                {label}
              </span>
            )
          )}
        </div>

        {/* Hero preview card */}
        <div className="relative mx-auto mt-16 w-full max-w-2xl">
          <div
            className="rounded-3xl border p-6 shadow-2xl backdrop-blur-sm transition-colors duration-200 sm:p-8"
            style={{
              backgroundColor: "var(--bg-hero-card)",
              borderColor: "var(--border-card)",
              boxShadow: `0 25px 50px -12px var(--shadow-card)`,
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-5 transition-colors duration-200"
              style={{ borderColor: "var(--border-row)" }}
            >
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Your Matching Space
                </p>
                <h2
                  className="mt-1 text-xl font-bold"
                  style={{ color: "var(--text-heading)" }}
                >
                  Find your next partner
                </h2>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl"
                style={{ backgroundColor: "var(--bg-icon)" }}
              >
                ✨
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {heroRows.map((row) => (
                <div
                  key={row.initials}
                  className="flex items-center gap-4 rounded-2xl border p-4 transition-colors duration-150"
                  style={{
                    backgroundColor: "var(--bg-row)",
                    borderColor: "var(--border-row)",
                  }}
                >
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ backgroundColor: row.iconBg, color: row.iconFg }}
                  >
                    {row.initials}
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className="font-semibold"
                      style={{ color: "var(--text-sub)" }}
                    >
                      {row.label}
                    </p>
                    <p
                      className="mt-0.5 text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {row.sub}
                    </p>
                  </div>
                  <span className="text-indigo-400">→</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-6 left-1/2 -z-10 h-20 w-3/4 -translate-x-1/2 rounded-full bg-indigo-400/20 blur-2xl" />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
              Find your match
            </p>
            <h2
              className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: "var(--text-heading)" }}
            >
              One platform, every learning goal
            </h2>
            <p className="mt-4 leading-7" style={{ color: "var(--text-muted)" }}>
              Whatever you want to learn, connect with students who are working
              toward similar goals.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3" id="partner-types">
            {features.map((f) => (
              <article
                key={f.number}
                className="group rounded-3xl border p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                    style={{ backgroundColor: "var(--bg-icon)" }}
                  >
                    {f.icon}
                  </div>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "var(--border-btn-outline)" }}
                  >
                    {f.number}
                  </span>
                </div>

                <h3
                  className="mt-6 text-xl font-bold"
                  style={{ color: "var(--text-heading)" }}
                >
                  {f.title}
                </h3>
                <p
                  className="mt-3 min-h-20 leading-7"
                  style={{ color: "var(--text-muted)" }}
                >
                  {f.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {f.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-3 py-1.5 text-xs font-medium"
                      style={{
                        backgroundColor: "var(--bg-tag)",
                        color: "var(--text-tag)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────── */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
              Simple by design
            </p>
            <h2
              className="mt-3 text-3xl font-bold sm:text-4xl"
              style={{ color: "var(--text-heading)" }}
            >
              Your next study partner is three steps away
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((item) => (
              <div
                key={item.step}
                className="rounded-3xl border p-7 transition-colors duration-200"
                style={{
                  backgroundColor: "var(--bg-step)",
                  borderColor: "var(--border-step)",
                }}
              >
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                  Step {item.step}
                </span>
                <h3
                  className="mt-4 text-xl font-bold"
                  style={{ color: "var(--text-heading)" }}
                >
                  {item.title}
                </h3>
                <p
                  className="mt-3 leading-7"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA band */}
          <div
            className="mt-10 rounded-3xl px-6 py-14 text-center transition-colors duration-200 sm:px-12"
            style={{ backgroundColor: "var(--bg-cta)" }}
          >
            <h2
              className="text-3xl font-bold"
              style={{ color: "var(--text-cta)" }}
            >
              Learning is better together.
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-400">
              Start by defining your learning goals and discover students who
              can help you reach them.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Get started today →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer
        className="border-t backdrop-blur-sm transition-colors duration-200"
        style={{
          backgroundColor: "var(--bg-footer)",
          borderColor: "var(--border-footer)",
        }}
      >
        <div
          className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-8"
          style={{ color: "var(--text-footer)" }}
        >
          <p>© {CURRENT_YEAR} PartnerMatcher. Built for better learning together.</p>
          <p>Connect. Collaborate. Grow.</p>
        </div>
      </footer>
    </main>
  );
}
