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

  return <DashboardClient user={user} profile={profile ?? null} courseCount={courseCount ?? 0} />;
}
