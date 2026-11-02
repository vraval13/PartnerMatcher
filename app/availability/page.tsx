export const instant = false;

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityClient, type AvailabilityGoal } from "./AvailabilityClient";

export default async function AvailabilityPage() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { data, error } = await supabase
    .from("matching_goals")
    .select("id,mode,course_code,topic,assignment_id,timezone")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Learning goals could not be loaded. Please retry.");
  }

  return <AvailabilityClient goals={(data ?? []) as AvailabilityGoal[]} />;
}
