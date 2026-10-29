"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel: Branding ───────────────────────────── */}
      <div className="relative hidden w-[52%] flex-col overflow-hidden lg:flex"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338ca 65%, #6366f1 100%)",
        }}
      >
        {/* Ambient orbs */}
        <div
          className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, rgba(165,180,252,0.6) 0%, transparent 70%)",
            animation: "blobDrift1 10s ease-in-out infinite",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(196,181,253,0.7) 0%, transparent 70%)",
            animation: "blobDrift2 12s ease-in-out 2s infinite",
          }}
        />

        {/* Floating particle dots */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { top: "15%", left: "20%", delay: "0s"   },
            { top: "40%", left: "80%", delay: "1.2s" },
            { top: "70%", left: "15%", delay: "0.6s" },
            { top: "25%", left: "65%", delay: "1.8s" },
            { top: "80%", left: "70%", delay: "0.3s" },
          ].map((d, i) => (
            <div
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-white/40"
              style={{
                top: d.top,
                left: d.left,
                animation: `float 3.5s ease-in-out ${d.delay} infinite`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
          {/* Top: Logo */}
          <Link href="/" className="flex items-center gap-3 w-fit">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
              <svg width="22" height="18" viewBox="0 0 26 22" fill="none" aria-hidden="true">
                <path d="M1 17C1 9.268 6.373 3 13 3C19.627 3 25 9.268 25 17" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
                <path d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.45"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">PartnerMatcher</span>
          </Link>

          {/* Middle: Headline */}
          <div>
            <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
              Study smarter.<br />
              <span className="text-indigo-200">Together.</span>
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-6 text-indigo-100/70">
              Match with students who share your goals, courses, and schedule.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {[
                { icon: "🎯", label: "Goal-based matching" },
                { icon: "📅", label: "Flexible scheduling" },
                { icon: "🚀", label: "60% better retention" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm font-medium text-white/80">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Compact testimonial */}
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <p className="text-sm leading-5 text-white/75 italic">
              &quot;Found my algorithms study group in minutes. We all passed with A&rsquo;s.&quot;
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-300 text-xs font-bold text-indigo-900">
                JL
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Jordan Lee</p>
                <p className="text-xs text-indigo-200/60">CS Student, NYU</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel: Sign-in form ──────────────────────── */}
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10 transition-colors duration-300"
        style={{ backgroundColor: "var(--bg-page)" }}
      >
        <div className="w-full max-w-md">
          {/* Logo + app name (right panel) */}
          <div className="mb-8 flex flex-col items-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm"
              style={{ backgroundColor: "var(--bg-icon)", borderColor: "var(--border-card)" }}
            >
              <svg width="22" height="18" viewBox="0 0 26 22" fill="none" aria-hidden="true">
                <path d="M1 17C1 9.268 6.373 3 13 3C19.627 3 25 9.268 25 17" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" opacity="0.65"/>
                <path d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"/>
              </svg>
            </div>
          
          </div>

          {/* Heading */}
          <div className="mb-7 text-center">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--text-heading)" }}
            >
              Welcome back
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Sign in to continue finding your perfect study partner.
            </p>
          </div>

          {/* GitHub OAuth */}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md"
            style={{
              backgroundColor: "var(--bg-btn-outline)",
              borderColor: "var(--border-btn-outline)",
              color: "var(--text-btn-outline)",
            }}
          >
            {/* GitHub icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>

          {/* Google OAuth */}
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md"
            style={{
              backgroundColor: "var(--bg-btn-outline)",
              borderColor: "var(--border-btn-outline)",
              color: "var(--text-btn-outline)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div
              className="flex-1 border-t"
              style={{ borderColor: "var(--border-card)" }}
            />
            <span
              className="mx-4 text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              or
            </span>
            <div
              className="flex-1 border-t"
              style={{ borderColor: "var(--border-card)" }}
            />
          </div>

          {/* Email + Password form */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "var(--text-sub)" }}
              >
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
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none ring-0 transition-all duration-150 placeholder:opacity-50 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                  color: "var(--text-heading)",
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium"
                  style={{ color: "var(--text-sub)" }}
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
                >
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
                  className="w-full rounded-xl border px-4 py-3 pr-14 text-sm outline-none ring-0 transition-all duration-150 placeholder:opacity-50 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-card)",
                    color: "var(--text-heading)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-glow w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                color: "var(--btn-primary-fg)",
              }}
            >
              Sign in
            </button>
          </form>

          {/* Create account */}
          <p
            className="mt-6 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
