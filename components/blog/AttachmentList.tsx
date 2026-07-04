import { FileText, Download } from "lucide-react";
import type { Attachment } from "@/lib/blog/types";

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function AttachmentList({ attachments }: { attachments: Record<string, Attachment> }) {
  const list = Object.values(attachments ?? {});
  if (!list.length) return null;

  return (
    <div className="space-y-2">
      {list.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          download={a.name}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))] hover:border-[hsl(var(--blog-accent))] transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 shrink-0 text-[hsl(var(--blog-muted))]" />
            <span className="truncate text-sm text-[hsl(var(--blog-fg))]">{a.name}</span>
            <span className="text-xs text-[hsl(var(--blog-muted))] shrink-0">{formatSize(a.size)}</span>
          </span>
          <Download className="w-4 h-4 shrink-0 text-[hsl(var(--blog-muted))]" />
        </a>
      ))}
    </div>
  );
}
