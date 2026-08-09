"use client";

import * as React from "react";
import { renderMath } from "./math-content";

interface MathPreviewProps {
  text: string;
}

export function MathPreview({ text }: MathPreviewProps) {
  const [html, setHtml] = React.useState<string>(() => (text ? renderMath(text) : ""));

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHtml(text ? renderMath(text) : "");
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [text]);

  if (!html) {
    return null;
  }

  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <p className="mb-2 text-xs text-muted-foreground">Aperçu</p>
      <div
        className="whitespace-pre-line text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
