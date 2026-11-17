"use client";

import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/app/dashboard/Sidebar";
import { useRouter } from "next/navigation";

export function PageLayout({ children, user }: { children: React.ReactNode; user: User }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundColor: "var(--bg-page)",
        color: "var(--text-page)",
      }}
    >
      {/* Sidebar */}
      <Sidebar user={user} onSignOut={handleSignOut} />

      {/* Main Content */}
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}
