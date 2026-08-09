"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { MathToolbar } from "./math-toolbar";
import { MathPreview } from "./math-preview";

interface MathEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function MathEditor({ id, value, onChange, placeholder, rows }: MathEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const latestValue = React.useRef(value);
  latestValue.current = value;

  const handleInsert = React.useCallback(
    (snippet: string) => {
      const el = textareaRef.current;
      const current = latestValue.current;
      if (!el) {
        onChange(current + snippet);
        return;
      }
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? current.length;
      const next = current.slice(0, start) + snippet + current.slice(end);
      latestValue.current = next;
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + snippet.length, start + snippet.length);
      });
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <MathToolbar onInsert={handleInsert} />
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
      <MathPreview text={value} />
      <p className="text-xs text-muted-foreground">
        Utilisez <code className="rounded bg-muted px-1">$...$</code> pour une formule en
        ligne et <code className="rounded bg-muted px-1">$$...$$</code> pour une formule
        isolée.
      </p>
      <p className="text-xs text-muted-foreground">
        Pour un schéma ou une figure géométrique, prenez-la en photo et joignez-la en
        pièce jointe.
      </p>
    </div>
  );
}
