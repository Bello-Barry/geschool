import { redirect } from "next/navigation";
import { getSchoolBySubdomain } from "@/lib/utils/school-resolver";

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

  return <>{children}</>;
}
