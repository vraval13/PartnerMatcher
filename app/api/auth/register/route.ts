import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminUserCreate = {
  createUser: (params: {
    email: string;
    password: string;
    email_confirm: boolean;
    user_metadata: { full_name: string };
  }) => Promise<{
    data: { user: { id: string } } | null;
    error: { message: string } | null;
  }>;
};

export async function processRegister(
  adminAuthAdmin: AdminUserCreate,
  body: { name?: unknown; email?: unknown; password?: unknown }
): Promise<Response> {
  const { name, email, password } = body;
  if (!name || !email || !password) {
    return Response.json({ error: "Missing fields." }, { status: 400 });
  }
  const { data, error } = await adminAuthAdmin.createUser({
    email: String(email),
    password: String(password),
    email_confirm: true,
    user_metadata: { full_name: String(name) },
  });
  if (error) {
    const msg = error.message.toLowerCase();
    const isDuplicate = msg.includes("already registered") || msg.includes("already exists");
    return Response.json(
      { error: isDuplicate ? "An account with that email already exists." : error.message },
      { status: isDuplicate ? 409 : 400 }
    );
  }
  return Response.json({ userId: data!.user.id }, { status: 201 });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }
  try {
    const body = await request.json();
    const admin = createAdminClient();
    return processRegister(admin.auth.admin as unknown as AdminUserCreate, body);
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
