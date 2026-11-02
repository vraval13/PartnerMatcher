import type { SupabaseClient } from "@supabase/supabase-js";
export type CourseEntry = { name: string; code: string; goal: string };
export function courseSaveError(error: { code?: string }): string {
  if (error.code === "42501")
    return "Course saving was blocked by database permissions. Please ask your team administrator to check the course insertion policy.";
  if (error.code === "23502" || error.code === "23514" || error.code === "22P02")
    return "Please check the course name, course code, and study goal, then try again.";
  if (error.code === "PGRST301" || error.code === "PGRST303")
    return "Your session has expired. Please sign in again.";
  return "Unable to save all courses. Please retry; already saved courses will not be duplicated.";
}
export async function saveCourses(
  db: SupabaseClient,
  userId: string,
  university: string,
  courses: CourseEntry[]
) {
  const valid = courses.filter((c) => c.name.trim());
  if (!valid.length) throw new Error("Please add at least one course.");
  if (!university.trim()) throw new Error("Please enter your university before saving courses.");
  if (valid.some((c) => !c.code.trim()))
    throw new Error("Please enter a course code for every course.");
  for (const course of valid) {
    // Shared catalog entries are immutable here. Reuse existing entries without UPDATE.
    const code = course.code.trim(),
      institution = university.trim();
    const inserted = await db
      .from("courses")
      .upsert(
        { name: course.name.trim(), code, university: institution },
        { onConflict: "code,university", ignoreDuplicates: true }
      );
    if (inserted.error) throw new Error(courseSaveError(inserted.error));
    // DO NOTHING returns no row on conflict. Read the canonical ID separately.
    const existing = await db
      .from("courses")
      .select("id")
      .eq("code", code)
      .eq("university", institution)
      .single();
    if (existing.error || !existing.data) throw new Error(courseSaveError(existing.error ?? {}));
    const linked = await db
      .from("user_courses")
      .upsert(
        { user_id: userId, course_id: existing.data.id, goal: course.goal, semester: "Fall 2026" },
        { onConflict: "user_id,course_id,goal", ignoreDuplicates: true }
      );
    if (linked.error) throw new Error(courseSaveError(linked.error));
  }
  return valid.length;
}
