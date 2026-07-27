import { FileIcon, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  signed_url: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
}

export function CourseAttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="border-t pt-4 mt-4">
      <p className="text-xs text-muted-foreground mb-2">Pièces jointes</p>
      <div className="space-y-2">
        {attachments.map((att) => (
          <div key={att.id} className="flex items-center justify-between rounded-md border p-2">
            <div className="flex items-center gap-2 truncate min-w-0">
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm truncate">{att.file_name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                ({formatFileSize(att.file_size)})
              </span>
            </div>
            {att.signed_url && (
              <Button variant="ghost" size="icon" asChild className="shrink-0 ml-2">
                <Link href={att.signed_url} target="_blank">
                  <Download className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
