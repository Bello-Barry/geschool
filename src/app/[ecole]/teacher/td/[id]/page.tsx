import { TdSessionDetailClient } from "@/components/td/td-session-detail-client";

export default async function TeacherTdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TdSessionDetailClient sessionId={id} />;
}