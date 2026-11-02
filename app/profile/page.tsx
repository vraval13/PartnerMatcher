export const instant = false;

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("university, major, year_of_study, study_style, comm_pref, timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  // Course associations are optional here; profile editing should still work if
  // a course relationship is not configured or the student has no courses yet.
  const { data: courseRows } = await supabase
    .from("user_courses")
    .select("goal, semester, courses(name, code)")
    .eq("user_id", user.id);

  const courses = (courseRows ?? []).map((row: { goal: string | null; semester: string | null; courses: { name: string | null; code: string | null } | { name: string | null; code: string | null }[] | null }) => {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    return course ? { name: course.name ?? "Course", code: course.code ?? "", goal: row.goal ?? "study", semester: row.semester ?? "" } : null;
  }).filter(Boolean);

  return <ProfileClient user={user} profile={profile ?? null} courses={courses as { name: string; code: string; goal: string; semester: string }[]} />;
}
