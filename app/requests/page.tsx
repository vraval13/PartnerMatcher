export const instant = false;

import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
  await connection();
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/signin");
  return <RequestsClient />;
}
