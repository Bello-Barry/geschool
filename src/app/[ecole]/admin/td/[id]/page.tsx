import { TdAdminDetailClient } from "@/components/td/td-admin-detail-client";

export default async function AdminTdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TdAdminDetailClient sessionId={id} />;
}