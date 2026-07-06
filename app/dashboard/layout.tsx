import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import Sidebar from "../../components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar businessName={business?.business_name ?? "Your business"} />
      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
