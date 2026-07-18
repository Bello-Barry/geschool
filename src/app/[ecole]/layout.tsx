import { redirect } from "next/navigation";
import { getSchoolBySubdomain } from "@/lib/utils/school-resolver";
import { getAuthUser } from "@/lib/utils/auth-utils";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ecole: string }>;
}) {
  const { ecole } = await params;
  const school = await getSchoolBySubdomain(ecole);

  if (!school) {
    redirect("/school-not-found");
  }

  const auth = await getAuthUser(ecole);

  if (!auth) {
    return <>{children}</>;
  }

  return (
    <DashboardShell
      role={auth.role}
      schoolName={school.name}
      schoolSlug={ecole}
      logoUrl={school.logo_url}
      primaryColor={school.primary_color}
    >
      {children}
    </DashboardShell>
  );
}
