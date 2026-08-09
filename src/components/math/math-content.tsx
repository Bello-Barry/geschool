import katex from "katex";
import { cn } from "@/lib/utils";

type MathSegment =
  | { type: "text"; value: string }
  | { type: "inline"; value: string }
  | { type: "block"; value: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSegment(segment: MathSegment): string {
  if (segment.type === "text") {
    return escapeHtml(segment.value);
  }
  const latex = segment.value.trim();
  if (!latex) {
    return "";
  }
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: segment.type === "block",
      strict: false,
    });
  } catch {
    return `<span class="text-red-600">Formule invalide : ${escapeHtml(latex)}</span>`;
  }
}

export function renderMath(text: string): string {
  const segments: MathSegment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$(\S[^$\n]*?\S|\S)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const isBlock = match[1] !== undefined;
    segments.push({
      type: isBlock ? "block" : "inline",
      value: match[isBlock ? 1 : 2] ?? "",
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments.map(renderSegment).join("");
}

interface MathContentProps {
  text: string | null | undefined;
  className?: string;
}

export function MathContent({ text, className }: MathContentProps) {
  if (!text) {
    return null;
  }
  return (
    <div
      className={cn("whitespace-pre-line", className)}
      dangerouslySetInnerHTML={{ __html: renderMath(text) }}
    />
  );
}
