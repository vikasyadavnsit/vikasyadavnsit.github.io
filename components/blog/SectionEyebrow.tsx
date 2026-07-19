import type { LucideIcon } from "lucide-react";

export default function SectionEyebrow({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[hsl(var(--blog-muted))] mb-4">
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </h2>
  );
}
