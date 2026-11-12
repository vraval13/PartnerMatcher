export const instant = false;

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient, type AcceptedConnectionRow } from "./DashboardClient";

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

  const { data: pendingSentRequests } = await supabase
    .from("connections")
    .select("id, receiver_id, session_topic, proposed_start, proposed_end, created_at")
    .eq("requester_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  // US-13 relating: accepted connections count + recent list for "Active Connections" section
  const { count: acceptedConnectionsCount } = await supabase
    .from("connections")
    .select("id", { count: "exact", head: true })
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "accepted");

  const { data: rawAccepted } = await supabase
    .from("connections")
    .select(
      "id, requester_id, receiver_id, session_topic, proposed_start, proposed_end, created_at"
    )
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(4);

  // Batch-fetch partner display names (first non-archived goal per partner user)
  const partnerIds = [
    ...new Set(
      (rawAccepted ?? []).map((c) => (c.requester_id === user.id ? c.receiver_id : c.requester_id))
    ),
  ];
  const partnerNames: Record<string, string> = {};
  if (partnerIds.length > 0) {
    const { data: goals } = await supabase
      .from("matching_goals")
      .select("user_id, display_name")
      .in("user_id", partnerIds)
      .is("archived_at", null);
    (goals ?? []).forEach((g) => {
      if (g.user_id && !partnerNames[g.user_id]) partnerNames[g.user_id] = g.display_name;
    });
  }

  const recentConnections: AcceptedConnectionRow[] = (rawAccepted ?? []).map((c) => {
    const partnerId = c.requester_id === user.id ? c.receiver_id : c.requester_id;
    return {
      id: c.id,
      partner_id: partnerId,
      partner_display_name: partnerNames[partnerId] ?? null,
      session_topic: c.session_topic,
      proposed_start: c.proposed_start,
      proposed_end: c.proposed_end,
      created_at: c.created_at,
    };
  });

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
      pendingSentRequests={pendingSentRequests ?? []}
      acceptedConnectionsCount={acceptedConnectionsCount ?? 0}
      recentConnections={recentConnections}
    />
  );
}
