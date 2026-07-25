export default function TagPills({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-xs px-3 py-1 rounded-full bg-[hsl(var(--blog-accent)/0.1)] text-[hsl(var(--blog-accent))] border border-[hsl(var(--blog-accent)/0.2)]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
