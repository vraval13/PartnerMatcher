export const instant = false;

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  await connection(); // opt into dynamic rendering — required with cacheComponents: true
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("university, major, year_of_study, study_style, comm_pref, timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  const { count: courseCount } = await supabase
    .from("user_courses")
    .select("course_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: pendingRequests } = await supabase
    .from("connections")
    .select("id, requester_id, session_topic, proposed_start, proposed_end, message, created_at")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: matchingGoals } = await supabase
    .from("matching_goals")
    .select("id, matching_availability(id)")
    .eq("user_id", user.id)
    .is("archived_at", null);

  const availabilityCount = (matchingGoals ?? []).reduce((total, goal) => {
    const slots = Array.isArray(goal.matching_availability) ? goal.matching_availability : [];
    return total + slots.length;
  }, 0);

  return (
    <DashboardClient
      user={user}
      profile={profile ?? null}
      courseCount={courseCount ?? 0}
      availabilityCount={availabilityCount}
      pendingRequests={pendingRequests ?? []}
    />
  );
}
