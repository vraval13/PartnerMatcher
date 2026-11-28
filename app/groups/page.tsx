"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Goal = { id: string; category: string; mode: string | null; institution: string | null; course_code: string | null; topic: string | null; assignment_id: string | null; exam_date: string | null; subject_or_skill: string | null };
type Group = { id: string; matching_goal_id: string; capacity: number; participant_count: number; created_at: string; matching_goals: Goal | Goal[] | null };
const supabase = createClient();

function goalLabel(value: Goal | Goal[] | null) {
  const goal = Array.isArray(value) ? value[0] : value;
  if (!goal) return "Study session";
  if (goal.category === "exam_prep") return "Exam prep · " + (goal.subject_or_skill || "Exam") + (goal.exam_date ? " · " + goal.exam_date : "");
  if (goal.category === "skill_practice") return "Skill practice · " + (goal.subject_or_skill || "Study");
  const course = [goal.institution, goal.course_code].filter(Boolean).join(" · " ) || "Course study";
  return course + (goal.mode === "assignment" ? " · Assignment " + (goal.assignment_id || "") : goal.topic ? " · " + goal.topic : "");
}

function errorMessage(error: { message?: string; code?: string } | null) {
  const message = ((error?.message || "") + " " + (error?.code || "")).toUpperCase();
  if (message.includes("GROUP_FULL")) return "This study group is full (5 of 5).";
  if (message.includes("GROUP_NOT_ELIGIBLE")) return "You can’t join this group. Your active course, assignment, or exam goal does not match.";
  if (message.includes("ALREADY") || message.includes("DUPLICATE")) return "You are already in this group.";
  return error?.message || "Something went wrong. Please try again.";
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth.user;
    setUserId(currentUser?.id ?? null);
    if (!currentUser) { setGoals([]); setGroups([]); setLoading(false); return; }
    const [goalResult, groupResult] = await Promise.all([
      supabase.from("matching_goals").select("id,category,mode,institution,course_code,topic,assignment_id,exam_date,subject_or_skill").eq("user_id", currentUser.id).eq("is_listed", true).is("archived_at", null),
      supabase.from("study_groups").select("id,matching_goal_id,capacity,participant_count,created_at,matching_goals(category,mode,institution,course_code,topic,assignment_id,exam_date,subject_or_skill)").order("created_at", { ascending: false }),
    ]);
    if (goalResult.error) setError(goalResult.error.message);
    else { setGoals((goalResult.data || []) as Goal[]); setSelectedGoal((current) => current || goalResult.data?.[0]?.id || ""); }
    if (groupResult.error) setError(groupResult.error.message);
    else setGroups((groupResult.data || []) as Group[]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function createGroup() {
    if (!selectedGoal) return;
    setBusyId("create"); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("create_study_group", { target_goal_id: selectedGoal });
    if (rpcError) setError(errorMessage(rpcError));
    else { setNotice("Study group created. You are the first participant."); await refresh(); }
    setBusyId(null);
  }

  async function joinGroup(groupId: string) {
    setBusyId(groupId); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc("join_study_group", { target_group_id: groupId });
    if (rpcError) setError(errorMessage(rpcError));
    else { setNotice("You joined the study group."); await refresh(); }
    setBusyId(null);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <a href="/dashboard" className="text-sm font-medium text-indigo-700 hover:underline">← Dashboard</a>
        <header className="mb-8 mt-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">PartnerMatcher · US-21</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Small group study sessions</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Create a study group around an active course, assignment, or exam goal. Groups hold up to five students, and membership is checked against the goal.</p>
        </header>
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</div>}
        {!userId && !loading && <section className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Sign in to participate</h2><p className="mt-2 text-sm text-slate-600">You need an account and an active matching goal to create or join a study group.</p><a className="mt-4 inline-flex rounded-md bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800" href="/signin">Sign in</a></section>}
        {userId && <section className="mb-8 rounded-xl border border-indigo-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">Start a study group</h2>
          <p className="mt-1 text-sm text-slate-600">Choose one of your listed goals. You will be added as participant 1; the group can grow to five students.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <select aria-label="Matching goal for the study group" className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2" value={selectedGoal} onChange={(event) => setSelectedGoal(event.target.value)} disabled={!goals.length}>
              {goals.length ? goals.map((goal) => <option key={goal.id} value={goal.id}>{goalLabel(goal)}</option>) : <option value="">No active listed goals</option>}
            </select>
            <button onClick={createGroup} disabled={!selectedGoal || busyId === "create"} className="rounded-md bg-indigo-700 px-5 py-2 font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">{busyId === "create" ? "Creating…" : "Create group (max 5)"}</button>
          </div>
          {!goals.length && <p className="mt-3 text-sm text-amber-700">Create or list a course, assignment, or exam matching goal first.</p>}
        </section>}
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Open study groups</h2><p className="mt-1 text-sm text-slate-600">Joining is allowed only when your active goal matches the group.</p></div><button onClick={() => void refresh()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100">Refresh</button></div>
        {loading ? <p className="rounded-xl border bg-white p-6 text-slate-600">Loading study groups…</p> : groups.length === 0 ? <p className="rounded-xl border bg-white p-6 text-slate-600">No study groups yet. Start one from your active matching goal.</p> : <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => { const full = group.participant_count >= group.capacity; const spots = group.capacity - group.participant_count; return <article key={group.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{goalLabel(group.matching_goals)}</h3><span className={"shrink-0 rounded-full px-3 py-1 text-sm font-semibold " + (full ? "bg-slate-100 text-slate-600" : "bg-green-100 text-green-800")}>{group.participant_count}/{group.capacity}</span></div>
            <p className="mt-3 text-sm text-slate-600">{full ? "This group has reached its five-student limit." : String(spots) + " spot" + (spots === 1 ? "" : "s") + " available"}</p>
            {userId && <button onClick={() => void joinGroup(group.id)} disabled={full || busyId === group.id} className="mt-4 rounded-md border border-indigo-700 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">{busyId === group.id ? "Joining…" : full ? "Group full" : "Join group"}</button>}
          </article>; })}
        </div>}
      </div>
    </main>
  );
}
