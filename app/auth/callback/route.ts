import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  // Allow only relative paths starting with /
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

export async function processCallback(
  url: URL,
  exchange: (code: string) => Promise<{ error: { message?: string } | null }>
): Promise<{ redirect: string }> {
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const { error } = await exchange(code);
    if (!error) return { redirect: `${url.origin}${next}` };
  }
  return { redirect: `${url.origin}/signin?error=auth_callback_failed` };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { redirect } = await processCallback(url, async (code) => {
    const supabase = await createClient();
    return supabase.auth.exchangeCodeForSession(code);
  });
  return NextResponse.redirect(redirect);
}
