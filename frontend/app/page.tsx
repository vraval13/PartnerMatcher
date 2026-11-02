import Link from "next/link";
import { Navbar } from "./components/Navbar";
import { ScrollAnimations } from "./components/ScrollAnimations";

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
    icon: "🎯",
  },
  {
    step: "02",
    title: "Discover partners",
    description: "Explore compatible students based on goals and availability.",
    icon: "🔍",
  },
  {
    step: "03",
    title: "Connect and learn",
    description: "Send a connection request and plan your learning sessions.",
    icon: "🤝",
  },
];

const heroRows = [
  {
    initials: "CS",
    bg: "#dbeafe",
    bgDark: "#1e3a8a22",
    fg: "#1d4ed8",
    label: "Course study partner",
    sub: "Shared courses and learning goals",
  },
  {
    initials: "EP",
    bg: "#fef3c7",
    bgDark: "#92400e22",
    fg: "#d97706",
    label: "Exam preparation",
    sub: "Prepare and revise together",
  },
  {
    initials: "SL",
    bg: "#ede9fe",
    bgDark: "#4c1d9522",
    fg: "#7c3aed",
    label: "Skills & languages",
    sub: "Practice, improve, and grow",
  },
];

export default function Home() {
  return (
    <main
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-page)" }}
    >
      <Navbar />
      <ScrollAnimations />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center overflow-hidden px-6 pb-28 pt-36 text-center lg:pb-36 lg:pt-44">

        {/* Animated ambient orbs */}
        <div
          className="orb-1 pointer-events-none absolute -top-40 left-1/2 h-[580px] w-[780px] rounded-full opacity-50"
          style={{
            background: "radial-gradient(ellipse, rgba(99,102,241,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          className="orb-2 pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)",
          }}
        />
        <div
          className="orb-3 pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Floating particle dots */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { top: "18%", left: "12%", d: "2.5s" },
            { top: "32%", left: "88%", d: "3.2s" },
            { top: "60%", left: "6%",  d: "2.8s" },
            { top: "72%", left: "92%", d: "3.6s" },
            { top: "12%", left: "70%", d: "4.1s" },
            { top: "84%", left: "55%", d: "2.4s" },
          ].map((dot, i) => (
            <div
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-indigo-400/40"
              style={{
                top: dot.top,
                left: dot.left,
                animation: `float ${dot.d} ease-in-out ${i * 0.4}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Beta badge */}
        <div
          className="anim-badge relative mb-10 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm"
          style={{
            backgroundColor: "var(--bg-badge)",
            borderColor: "var(--border-badge)",
            color: "var(--text-muted)",
          }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: "var(--dot-badge)",
              animation: "pulse-ring 2.4s ease-in-out infinite",
            }}
          />
          Now in Public Beta
        </div>

        {/* Headline */}
        <h1
          className="anim-hero-1 relative mx-auto max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
          style={{ color: "var(--text-heading)" }}
        >
          Find your perfect{" "}
          <br className="hidden sm:block" />
          <span className="gradient-text-animated">study partner</span>
        </h1>

        <p
          className="anim-hero-2 relative mx-auto mt-6 max-w-xl text-lg leading-8"
          style={{ color: "var(--text-muted)" }}
        >
          Discover compatible study partners based on your courses, learning
          goals, and availability. Make every study session more meaningful.
        </p>

        {/* CTA buttons */}
        <div className="anim-hero-3 relative mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="btn-glow btn-pulse rounded-full px-7 py-3.5 text-sm font-semibold"
            style={{
              backgroundColor: "var(--btn-primary-bg)",
              color: "var(--btn-primary-fg)",
            }}
          >
            Get started — it&apos;s free
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
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
          className="anim-hero-4 relative mt-10 flex flex-wrap justify-center gap-5 text-sm"
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

        {/* ── Hero preview card (3D) ──────────────────────────── */}
        <div className="anim-hero-card relative mx-auto mt-16 w-full max-w-2xl">
          {/* Decorative glow ring behind card */}
          <div className="absolute -inset-4 rounded-[2.5rem] bg-indigo-500/10 blur-2xl" />

          <div
            className="card-3d card-shimmer relative rounded-3xl border p-6 shadow-2xl backdrop-blur-sm sm:p-8"
            style={{
              backgroundColor: "var(--bg-hero-card)",
              borderColor: "var(--border-card)",
            }}
          >
            {/* Card header */}
            <div
              className="flex items-center justify-between border-b pb-5"
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
                className="anim-float-r flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
                style={{ backgroundColor: "var(--bg-icon)" }}
              >
                ✨
              </div>
            </div>

            {/* Rows */}
            <div className="mt-5 space-y-3">
              {heroRows.map((row, i) => (
                <div
                  key={row.initials}
                  className="row-lift flex items-center gap-4 rounded-2xl border p-4 cursor-pointer"
                  style={{
                    backgroundColor: "var(--bg-row)",
                    borderColor: "var(--border-row)",
                    animationDelay: `${i * 0.08}s`,
                  }}
                >
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ backgroundColor: row.bg, color: row.fg }}
                  >
                    {row.initials}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold" style={{ color: "var(--text-sub)" }}>
                      {row.label}
                    </p>
                    <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                      {row.sub}
                    </p>
                  </div>
                  <span className="text-indigo-400 transition-transform duration-150 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              ))}
            </div>

            {/* Card footer */}
            <p
              className="mt-5 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Your goals. Your schedule. Your learning community.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div
            className="mx-auto max-w-2xl text-center"
            data-animate="fade-up"
          >
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
              Whatever you want to learn, connect with students working toward
              similar goals.
            </p>
          </div>

          <div
            className="mt-12 grid gap-5 md:grid-cols-3"
            id="partner-types"
            data-animate-stagger
          >
            {features.map((f) => (
              <article
                key={f.number}
                className="card-3d card-shimmer group rounded-3xl border p-7 cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                  transition: "border-color 0.3s",
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-transform duration-300 group-hover:scale-110"
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
                  className="mt-3 min-h-[5rem] leading-7"
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

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center" data-animate="fade-up">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
              Simple by design
            </p>
            <h2
              className="mt-3 text-3xl font-bold sm:text-4xl"
              style={{ color: "var(--text-heading)" }}
            >
              Three steps to your study partner
            </h2>
          </div>

          {/* Steps with connector line */}
          <div
            className="mt-14 grid gap-5 md:grid-cols-3"
            data-animate-stagger
          >
            {steps.map((item, idx) => (
              <div
                key={item.step}
                className="card-3d-subtle relative rounded-3xl border p-7 transition-colors duration-200"
                style={{
                  backgroundColor: "var(--bg-step)",
                  borderColor: "var(--border-step)",
                }}
              >
                {/* Connector dot for desktop */}
                {idx < 2 && (
                  <div className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-500 md:flex">
                    <span className="text-xs text-white">→</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-lg"
                    style={{ backgroundColor: "var(--bg-icon)" }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                    Step {item.step}
                  </span>
                </div>
                <h3
                  className="mt-4 text-xl font-bold"
                  style={{ color: "var(--text-heading)" }}
                >
                  {item.title}
                </h3>
                <p className="mt-3 leading-7" style={{ color: "var(--text-muted)" }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA band */}
          <div
            className="mt-12 rounded-3xl px-6 py-16 text-center sm:px-12"
            data-animate="scale-in"
            style={{ backgroundColor: "var(--bg-cta)" }}
          >
            {/* Decorative inner glow */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-indigo-500/5" />

            <div className="relative">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-2xl">
                🚀
              </div>
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
                className="btn-glow mt-8 inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Get started today →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer
        className="border-t backdrop-blur-sm transition-colors duration-300"
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
