import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <header className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 anim-nav">
      <nav
        className="flex items-center gap-1 rounded-full border px-2 py-2 backdrop-blur-xl shadow-lg transition-colors duration-300"
        style={{
          backgroundColor: "var(--bg-nav)",
          borderColor: "var(--border-nav)",
          boxShadow: "0 4px 24px var(--nav-shadow)",
        }}
      >
        {/* Nav links */}
        {[
          { label: "Features",    href: "#features" },
          { label: "How It Works",href: "#how-it-works" },
          { label: "Docs",        href: "#partner-types" },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-600"
            style={{ color: "var(--text-nav)" }}
          >
            {link.label}
          </a>
        ))}

        {/* Divider */}
        <span
          className="mx-1 h-5 w-px rounded-full"
          style={{ backgroundColor: "var(--border-toggle)" }}
          aria-hidden="true"
        />

        {/* Theme toggle */}
        <ThemeToggle />
      </nav>
    </header>
  );
}
