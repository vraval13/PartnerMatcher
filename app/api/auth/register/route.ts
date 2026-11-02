import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  try {
    const { name, email, password } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create user with email pre-confirmed — no email sent at all
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // marks email as verified instantly
      user_metadata: { full_name: name },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ userId: data.user.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
