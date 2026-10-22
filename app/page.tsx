
import Link from "next/link";

const partnerTypes = [
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

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              P
            </div>
            <span className="text-xl font-bold tracking-tight">
              Partner<span className="text-indigo-600">Matcher</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-indigo-600">
              How it works
            </a>
            <a href="#partner-types" className="hover:text-indigo-600">
              Find a partner
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:block"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-100 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-violet-100 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 md:py-28 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Better learning starts together
            </div>

            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find your people.
              <span className="mt-2 block text-indigo-600">
                Learn better together.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Discover compatible study partners based on your courses,
              learning goals, availability, and preferences. Make every
              study session more meaningful.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                Find your study partner
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                See how it works
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              <span>✓ Goal-based matching</span>
              <span>✓ Flexible availability</span>
              <span>✓ Student-focused</span>
            </div>
          </div>

          {/* Preview card */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-indigo-100 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    YOUR MATCHING SPACE
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    Find your next partner
                  </h2>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3 text-2xl">
                  ✨
                </div>
              </div>

              <div className="mt-7 space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-300">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                      CS
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Course study partner</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Shared courses and learning goals
                      </p>
                    </div>
                    <span className="text-xl text-indigo-600">→</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-300">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
                      EP
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Exam preparation</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Prepare and revise together
                      </p>
                    </div>
                    <span className="text-xl text-indigo-600">→</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-300">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700">
                      SL
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Skills & languages</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Practice, improve, and grow
                      </p>
                    </div>
                    <span className="text-xl text-indigo-600">→</span>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-center text-sm text-slate-500">
                Your goals. Your schedule. Your learning community.
              </p>
            </div>
            <div className="absolute -bottom-5 -right-3 -z-10 h-32 w-32 rounded-full bg-indigo-200/70 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Partner categories */}
      <section id="partner-types" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
              Find your match
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              One platform, different learning goals
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Whatever you want to learn, connect with students who are
              working toward similar goals.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {partnerTypes.map((type) => (
              <article
                key={type.number}
                className="group rounded-2xl border border-slate-200 bg-white p-7 transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
                    {type.icon}
                  </div>
                  <span className="text-sm font-semibold text-slate-300">
                    {type.number}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-bold">{type.title}</h3>
                <p className="mt-3 min-h-20 leading-7 text-slate-600">
                  {type.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {type.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
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

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">
              Simple by design
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Your next study partner is three steps away
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Set your goals",
                description:
                  "Tell us what you want to study, practice, or improve.",
              },
              {
                step: "02",
                title: "Discover partners",
                description:
                  "Explore compatible students based on goals and availability.",
              },
              {
                step: "03",
                title: "Connect and learn",
                description:
                  "Send a connection request and plan your learning sessions.",
              },
            ].map((item) => (
              <div key={item.step} className="relative rounded-2xl bg-white p-7">
                <span className="text-sm font-bold tracking-widest text-indigo-600">
                  STEP {item.step}
                </span>
                <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-3xl bg-indigo-600 px-6 py-12 text-center text-white sm:px-12">
            <h2 className="text-3xl font-bold">
              Learning is better together.
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-indigo-100">
              Start by defining your learning goals and discover students
              who can help you reach them.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-flex rounded-xl bg-white px-6 py-3.5 font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              Get started today →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} Partner Matcher. Built for better
            learning together.
          </p>
          <p>Connect. Collaborate. Grow.</p>
        </div>
      </footer>
    </main>
  );
}
