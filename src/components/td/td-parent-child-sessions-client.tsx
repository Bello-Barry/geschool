"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, User, Check, X } from "lucide-react";
import Link from "next/link";

interface TdSession {
  id: string;
  type: "td" | "tp";
  title: string;
  session_date: string;
  description: string | null;
  subject: { name: string } | null;
  class: { name: string } | null;
  attendance?: { student_id: string; status: string }[];
}

interface Props {
  studentId: string;
}

export function TdParentChildSessionsClient({ studentId }: Props) {
  const [sessions, setSessions] = useState<TdSession[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [sessionsRes, studentRes] = await Promise.all([
        fetch("/api/td?status=published"),
        fetch(`/api/students/${studentId}`),
      ]);
      if (sessionsRes.ok) {
        const json = await sessionsRes.json();
        setSessions(json.data || []);
      }
      if (studentRes.ok) {
        const json = await studentRes.json();
        setStudent(json.data);
      }
      setLoading(false);
    })();
  }, [studentId]);

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
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" asChild><Link href="/parent/children"><User className="mr-1 h-4 w-4" />Mes enfants</Link></Button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold">TD/TP de {student?.user?.first_name} {student?.user?.last_name}</h1>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucune séance pour le moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => {
            const att = (session.attendance || []).find(a => a.student_id === studentId);
            return (
              <Card key={session.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{session.title}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.session_date).toLocaleDateString("fr-FR")}
                        {session.subject && <> • {session.subject.name}</>}
                        {session.class && <> • {session.class.name}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!att ? (
                        <Badge variant="outline">Pas encore marqué</Badge>
                      ) : att.status === "present" ? (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Présent
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                          <X className="h-3 w-3" /> Absent
                        </Badge>
                      )}
                      <Badge variant="secondary">{session.type.toUpperCase()}</Badge>
                    </div>
                  </div>
                </CardHeader>
                {session.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{session.description}</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}