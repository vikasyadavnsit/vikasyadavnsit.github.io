import { Eye } from "lucide-react";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

export default function ViewCounterBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--blog-muted))]">
      <Eye className="w-4 h-4" />
      {formatCount(count ?? 0)} views
    </span>
  );
}
