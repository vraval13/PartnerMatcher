export const instant = false;

import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CoursesClient } from "./CoursesClient";

export const metadata: Metadata = {
  title: "Manage courses",
  description: "Add, edit or remove the courses you are studying.",
};

type CourseRef = { name: string | null; code: string | null };

type UserCourseRow = {
  course_id: string;
  goal: string | null;
  semester: string | null;
  courses: CourseRef | CourseRef[] | null;
};

function currentSemester(): string {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  if (m <= 5) return `Spring ${y}`;
  if (m <= 7) return `Summer ${y}`;
  return `Fall ${y}`;
}

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

  const fallbackSemester = currentSemester();

  const courses = ((courseRows ?? []) as UserCourseRow[]).flatMap((row) => {
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    if (!course) return [];

    return [
      {
        course_id: row.course_id,
        name: course.name ?? "",
        code: course.code ?? "",
        goal: row.goal ?? "study",
        semester: row.semester ?? fallbackSemester,
      },
    ];
  });

  return (
    <CoursesClient
      user={user}
      userId={user.id}
      university={profile.university}
      initialCourses={courses}
    />
  );
}
