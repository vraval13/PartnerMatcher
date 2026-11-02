export const instant = false;

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage() {
  await connection();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // If already onboarded, skip to dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("university")
    .eq("user_id", user.id)
    .single();

  if (profile?.university) redirect("/dashboard");

  return <OnboardingClient user={user} />;
}
