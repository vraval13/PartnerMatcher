"use client";

import { useState } from "react";
import Link from "next/link";

type Partner = {
  id: string;
  display_name: string | null;
  institution: string | null;
  course_code: string | null;
  topic: string | null;
  assignment_id: string | null;
  category: string | null;
  subject_or_skill: string | null;
  proficiency_level: string | null;
  mode: string | null;
  location_preference: string;
  location: string | null;
  due_date: string | null;
};

export default function PartnerProfileClient({
  partner,
  initiallyFavorited,
}: {
  partner: Partner;
  initiallyFavorited: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(initiallyFavorited);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleFavorite() {
    if (isFavorite && !window.confirm("Remove this student from your favorites?")) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/v1/favorites", {
        method: isFavorite ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_goal_id: partner.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Something went wrong. Please try again.");
      } else {
        setIsFavorite(!isFavorite);
        setMessage(result.message ?? "Favorites updated.");
      }
    } catch {
      setMessage("Unable to update favorites. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/partners" className="text-sm text-indigo-500 hover:underline">
          ← Back to partners
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-500/30 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
            Student profile
          </p>

          <h1 className="mt-3 text-3xl font-bold">
            {partner.display_name || "A student"}
          </h1>

          <div className="mt-6 space-y-3 text-sm">
            {partner.institution && (
              <p><strong>Institution:</strong> {partner.institution}</p>
            )}
            {partner.category === "course" ? (
              <>
                {partner.course_code && (
                  <p><strong>Course:</strong> {partner.course_code}</p>
                )}
                {partner.topic && <p><strong>Topic:</strong> {partner.topic}</p>}
                {partner.assignment_id && (
                  <p><strong>Assignment:</strong> {partner.assignment_id}</p>
                )}
              </>
            ) : (
              <>
                {partner.subject_or_skill && (
                  <p><strong>Learning goal:</strong> {partner.subject_or_skill}</p>
                )}
                {partner.proficiency_level && (
                  <p><strong>Proficiency:</strong> {partner.proficiency_level}</p>
                )}
              </>
            )}
            {partner.mode && <p><strong>Mode:</strong> {partner.mode}</p>}
            <p><strong>Location preference:</strong> {partner.location_preference}</p>
            {partner.location && <p><strong>Meeting location:</strong> {partner.location}</p>}
            {partner.due_date && <p><strong>Due date:</strong> {partner.due_date}</p>}
          </div>

          <button
            type="button"
            onClick={toggleFavorite}
            disabled={busy}
            className="mt-8 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Please wait…" : isFavorite ? "Remove from favorites" : "Add to favorites"}
          </button>

          {message && (
            <p role="status" className="mt-3 text-sm">
              {message}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
