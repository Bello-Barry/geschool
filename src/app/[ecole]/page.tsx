import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/utils/auth-utils";

export default async function SchoolHomePage({
  params,
}: {
  params: Promise<{ ecole: string }>;
}) {
  const { ecole } = await params;
  const auth = await getAuthUser(ecole);

  if (!auth) {
    redirect(`/login?school=${ecole}`);
  }

  const redirectPath = auth.role === "super_admin" || auth.role === "admin_school"
    ? `/${ecole}/admin`
    : auth.role === "teacher"
      ? `/${ecole}/teacher`
      : auth.role === "parent"
        ? `/${ecole}/parent`
        : `/${ecole}/student`;

  redirect(redirectPath);
}
