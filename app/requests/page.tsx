export const instant = false;

import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RequestsClient from "./RequestsClient";

export const metadata: Metadata = {
  title: "Connection requests",
  description: "Review, accept, decline and track your study session requests.",
};

export default async function RequestsPage() {
  await connection();

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect("/signin");

  return <RequestsClient user={user} />;
}
