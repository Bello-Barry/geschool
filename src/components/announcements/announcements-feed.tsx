import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: string;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

export function AnnouncementsFeed({ announcements }: { announcements: Announcement[] }) {
  if (!announcements.length) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground text-sm">
          Aucune annonce pour le moment.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <Card key={a.id}>
          <CardHeader className="px-4 md:px-6 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary shrink-0" />
              {a.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 space-y-2">
            <p className="text-sm whitespace-pre-wrap">{a.content}</p>
            <p className="text-[11px] text-muted-foreground">
              Publiée le {new Date(a.created_at).toLocaleDateString("fr-FR")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}