"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Left panel: Branding ───────────────────────────── */}
      <div
        className="relative hidden w-[50%] flex-col overflow-hidden lg:flex"
        style={{
          background: "linear-gradient(160deg, #f0f4ff 0%, #e8edff 50%, #dde5ff 100%)",
        }}
      >
        {/* Subtle orbs */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute top-1/2 -right-16 h-56 w-56 -translate-y-1/2 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { top: "12%", left: "18%", delay: "0s" },
            { top: "38%", left: "78%", delay: "1.4s" },
            { top: "68%", left: "12%", delay: "0.7s" },
            { top: "22%", left: "62%", delay: "2s" },
            { top: "82%", left: "68%", delay: "0.4s" },
          ].map((d, i) => (
            <div
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                top: d.top,
                left: d.left,
                backgroundColor: "rgba(99,102,241,0.35)",
                animation: `float 3.5s ease-in-out ${d.delay} infinite`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 w-fit">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 border border-indigo-200">
              <svg width="22" height="18" viewBox="0 0 26 22" fill="none" aria-hidden="true">
                <path d="M1 17C1 9.268 6.373 3 13 3C19.627 3 25 9.268 25 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>
                <path d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-indigo-900">PartnerMatcher</span>
          </Link>

          {/* Hero text */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/60 px-3.5 py-1.5 text-xs font-medium text-indigo-600 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              200+ students matched
            </div>

            <h1 className="text-4xl font-bold leading-tight text-indigo-950 xl:text-5xl">
              Study smarter.<br />
              <span className="text-indigo-500">Together.</span>
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-6 text-indigo-700/65">
              Match with students who share your goals, courses, and schedule.
            </p>

            <div className="mt-8 flex flex-col gap-3.5">
              {[
                { icon: "🎯", label: "Goal-based matching" },
                { icon: "📅", label: "Flexible scheduling" },
                { icon: "🚀", label: "60% better retention" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-sm border border-indigo-100">
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium text-indigo-800">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="rounded-2xl border border-indigo-100 bg-white/60 p-4 backdrop-blur-sm shadow-sm">
            <p className="text-sm leading-5 text-slate-600 italic">
              &quot;Found my algorithms study group in minutes. We all passed with A&rsquo;s.&quot;
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                JL
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">Jordan Lee</p>
                <p className="text-xs text-slate-400">CS Student, NYU</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: Sign-in form ──────────────────────── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 sm:px-10 transition-colors duration-300"
        style={{ backgroundColor: "var(--bg-page)" }}
      >
        <div className="w-full max-w-sm">
          {/* Logo mark */}
          <div className="mb-6 flex flex-col items-center">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm"
              style={{ backgroundColor: "var(--bg-icon)", borderColor: "var(--border-card)" }}
            >
              <svg width="20" height="16" viewBox="0 0 26 22" fill="none" aria-hidden="true">
                <path d="M1 17C1 9.268 6.373 3 13 3C19.627 3 25 9.268 25 17" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>
                <path d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-heading)" }}>
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
              Sign in to continue finding your study partner.
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md"
              style={{
                backgroundColor: "var(--bg-btn-outline)",
                borderColor: "var(--border-btn-outline)",
                color: "var(--text-btn-outline)",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md"
              style={{
                backgroundColor: "var(--bg-btn-outline)",
                borderColor: "var(--border-btn-outline)",
                color: "var(--text-btn-outline)",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5 flex items-center">
            <div className="flex-1 border-t" style={{ borderColor: "var(--border-card)" }} />
            <span className="mx-4 text-xs font-medium" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="flex-1 border-t" style={{ borderColor: "var(--border-card)" }} />
          </div>

          {/* Form */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-3.5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-sub)" }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none ring-0 transition-all duration-150 placeholder:opacity-50 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                  color: "var(--text-heading)",
                }}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>
                  Password
                </label>
                <button type="button" className="text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border px-4 py-2.5 pr-14 text-sm outline-none ring-0 transition-all duration-150 placeholder:opacity-50 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-card)",
                    color: "var(--text-heading)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-glow w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-200"
              style={{ backgroundColor: "var(--btn-primary-bg)", color: "var(--btn-primary-fg)" }}
            >
              Sign in
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-indigo-500 hover:text-indigo-600 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
