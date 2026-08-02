"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DetailSkeleton } from "@/components/ui/skeletons";

interface Props {
  sessionId: string;
}

export function TdAdminDetailClient({ sessionId }: Props) {
  const params = useParams();
  const ecole = params?.ecole as string;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/td/${sessionId}`);
    if (res.ok) {
      const json = await res.json();
      setSession(json.data);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <DetailSkeleton />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Session introuvable</p>
        <Button variant="outline" asChild><Link href={`/${ecole}/admin/td`}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link></Button>
      </div>
    );
  }

  const presentCount = (session.attendance || []).filter((a: any) => a.status === "present").length;
  const totalCount = (session.attendance || []).length;

  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" asChild className="mb-4">
        <Link href={`/${ecole}/admin/td`}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <p className="text-muted-foreground">
          {session.subject?.name} • {session.class?.name} • {new Date(session.session_date).toLocaleDateString("fr-FR")}
          {session.teacher && <> • {session.teacher.user?.first_name} {session.teacher.user?.last_name}</>}
        </p>
        <div className="flex gap-2 mt-2">
          <StatusBadge status={session.status === "published" ? "published" : "draft"} />
          <Badge variant="secondary">{session.type.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {session.description && (
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent><p>{session.description}</p></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Présences ({presentCount}/{totalCount})</CardTitle></CardHeader>
          <CardContent>
            {session.attendance?.length > 0 ? (
              <div className="space-y-1">
                {session.attendance.map((a: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm p-2 border-b last:border-0">
                    <span>Élève #{a.student_id?.slice(0, 8)}</span>
                    <StatusBadge status={a.status === "present" ? "present" : "absent"} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune présence enregistrée</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Documents ({session.materials?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {session.materials?.length > 0 ? (
              <ul className="space-y-1">
                {session.materials.map((m: any) => (
                  <li key={m.id} className="text-sm p-2 border rounded">{m.file_name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Aucun document</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}