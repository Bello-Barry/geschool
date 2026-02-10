import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

export async function getSchoolFromHeaders(headers: Headers | ReadonlyHeaders) {
  const schoolId = headers.get("x-school-id");
  const schoolName = headers.get("x-school-name");
  const schoolSubdomain = headers.get("x-school-subdomain");
  const schoolColor = headers.get("x-school-color");

  if (!schoolId) return null;

  return {
    id: schoolId,
    name: schoolName || "École",
    subdomain: schoolSubdomain || "",
    primary_color: schoolColor || "#3B82F6",
  };
}
