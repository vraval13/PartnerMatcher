export const instant = false;

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CoursesClient } from "./CoursesClient";

export default async function EditCoursesPage() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("university")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.university) redirect("/onboarding");

  const { data: courseRows, error } = await supabase
    .from("user_courses")
    .select("course_id, goal, semester, courses(name, code)")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load courses:", error.message);
  }

  const courses = (courseRows ?? [])
    .map((row: {
      course_id: string;
      goal: string | null;
      semester: string | null;
      courses:
        | { name: string | null; code: string | null }
        | { name: string | null; code: string | null }[]
        | null;
    }) => {
      const course = Array.isArray(row.courses)
        ? row.courses[0]
        : row.courses;

      if (!course) return null;

      return {
        course_id: row.course_id,
        name: course.name ?? "",
        code: course.code ?? "",
        goal: row.goal ?? "study",
        semester: row.semester ?? "Fall 2026",
      };
    })
    .filter((course) => course !== null);

  return (
    <CoursesClient
      userId={user.id}
      university={profile.university}
      initialCourses={courses}
    />
  );
}