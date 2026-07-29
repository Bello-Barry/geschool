"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Loader2 } from "lucide-react";
import Link from "next/link";

interface TdSession {
  id: string;
  type: "td" | "tp";
  title: string;
  session_date: string;
  status: string;
  subject: { name: string } | null;
  class: { name: string } | null;
  teacher: { id: string; user: { first_name: string; last_name: string } | null } | null;
}

export function TdAdminSessionsClient() {
  const [sessions, setSessions] = useState<TdSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/td");
    if (res.ok) {
      const json = await res.json();
      setSessions(json.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
      <h1 className="text-2xl font-bold mb-2">TD/TP</h1>
      <p className="text-muted-foreground mb-6">Toutes les séances de l'établissement</p>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune séance pour le moment</p>
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
                    <p className="text-sm text-muted-foreground">
                      {session.subject?.name} • {session.class?.name}
                      {session.teacher && <> • {session.teacher.user?.first_name} {session.teacher.user?.last_name}</>}
                      {" • "}{new Date(session.session_date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={session.status === "published" ? "default" : "outline"}>
                      {session.status === "published" ? "Publié" : "Brouillon"}
                    </Badge>
                    <Badge variant="secondary">{session.type.toUpperCase()}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/td/${session.id}`}><Eye className="mr-1 h-4 w-4" />Détails</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}