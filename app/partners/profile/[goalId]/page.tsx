import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PartnerProfileClient from "./PartnerProfileClient";

export const instant = false;

export default async function PartnerProfilePage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  await connection();

  const { goalId } = await params;
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect("/signin");

  const { data: goal, error } = await db
    .from("matching_goals")
    .select(
      "id, user_id, display_name, institution, course_code, topic, assignment_id, category, subject_or_skill, proficiency_level, mode, location_preference, location, due_date"
    )
    .eq("id", goalId)
    .eq("is_listed", true)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !goal || goal.user_id === user.id) notFound();

  const { data: favorite } = await db
    .from("favorite_partners")
    .select("id")
    .eq("user_id", user.id)
    .eq("favorite_user_id", goal.user_id)
    .maybeSingle();

  return (
    <PartnerProfileClient
      partner={goal}
      initiallyFavorited={Boolean(favorite)}
    />
  );
}
