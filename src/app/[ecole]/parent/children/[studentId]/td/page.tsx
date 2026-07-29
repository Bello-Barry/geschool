import { TdParentChildSessionsClient } from "@/components/td/td-parent-child-sessions-client";

export default async function ParentChildTdPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  return <TdParentChildSessionsClient studentId={studentId} />;
}