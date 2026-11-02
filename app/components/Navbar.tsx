import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 anim-nav">
      <div className="mx-auto max-w-7xl">
        <nav
          className="flex items-center justify-between rounded-2xl border px-4 py-2.5 backdrop-blur-xl shadow-lg transition-colors duration-300"
          style={{
            backgroundColor: "var(--bg-nav)",
            borderColor: "var(--border-nav)",
            boxShadow: "0 4px 24px var(--nav-shadow)",
          }}
        >
          {/* ── Left: Logo + Brand ── */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <svg
              width="26"
              height="22"
              viewBox="0 0 26 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M1 17C1 9.268 6.373 3 13 3C19.627 3 25 9.268 25 17"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M5 17C5 11.477 8.582 7 13 7C17.418 7 21 11.477 21 17"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.65"
              />
              <path
                d="M9 17C9 13.686 10.791 11 13 11C15.209 11 17 13.686 17 17"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.35"
              />
            </svg>
            <span
              className="text-[16px] font-bold tracking-tight"
              style={{ color: "var(--text-heading)" }}
            >
              Partner<span className="text-indigo-500">Matcher</span>
            </span>
          </Link>

          {/* ── Center: Nav links ── */}
          <div
            className="hidden items-center gap-1 md:flex"
            style={{ color: "var(--text-nav)" }}
          >
            {[
              { label: "Features",     href: "#features" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Docs",         href: "#partner-types" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-600"
                style={{ color: "inherit" }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* ── Right: Toggle + CTA ── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />

            <Link
              href="/signin"
              className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-px hover:shadow-md"
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                color: "var(--btn-primary-fg)",
              }}
            >
              Get Started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
