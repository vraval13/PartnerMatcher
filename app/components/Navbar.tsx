import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <nav
      className="sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-200"
      style={{
        backgroundColor: "var(--bg-nav)",
        borderColor: "var(--border-nav)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
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
            className="text-[17px] font-bold tracking-tight"
            style={{ color: "var(--text-heading)" }}
          >
            Partner<span className="text-indigo-500">Matcher</span>
          </span>
        </Link>

        {/* Center nav links */}
        <div
          className="hidden items-center gap-7 text-sm font-medium md:flex"
          style={{ color: "var(--text-nav)" }}
        >
          <a
            href="#features"
            className="transition-colors duration-150 hover:text-indigo-500"
            style={{ color: "inherit" }}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="transition-colors duration-150 hover:text-indigo-500"
            style={{ color: "inherit" }}
          >
            How It Works
          </a>
          <a
            href="#partner-types"
            className="transition-colors duration-150 hover:text-indigo-500"
            style={{ color: "inherit" }}
          >
            Docs
          </a>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/signup"
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200"
            style={{
              backgroundColor: "var(--btn-primary-bg)",
              color: "var(--btn-primary-fg)",
            }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
