"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, FileText } from "lucide-react";

interface TdSession {
  id: string;
  type: "td" | "tp";
  title: string;
  session_date: string;
  description: string | null;
  subject: { name: string } | null;
  materials?: any[];
  attendance?: { status: string }[];
}

export function TdStudentSessionsClient() {
  const [sessions, setSessions] = useState<TdSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/td?status=published");
      if (res.ok) {
        const json = await res.json();
        setSessions(json.data || []);
      }
      setLoading(false);
    })();
  }, []);

  const attendanceBadge = (session: TdSession) => {
    if (!session.attendance || session.attendance.length === 0) {
      return <Badge variant="outline">Pas encore marqué</Badge>;
    }
    const a = session.attendance[0]!;
    if (a.status === "present") return <Badge className="bg-green-100 text-green-800">Présent</Badge>;
    return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Mes TD/TP</h1>
      <p className="text-muted-foreground mb-6">Consultez vos séances de travaux dirigés et pratiques</p>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune séance publiée pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(session.session_date).toLocaleDateString("fr-FR")}
                      {session.subject && <> • {session.subject.name}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attendanceBadge(session)}
                    <Badge variant="secondary">{session.type.toUpperCase()}</Badge>
                  </div>
                </div>
              </CardHeader>
              {session.description && (
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground">{session.description}</p>
                </CardContent>
              )}
              {session.materials && session.materials.length > 0 && (
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <FileText className="h-4 w-4" />{session.materials.length} document(s) disponible(s)
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}