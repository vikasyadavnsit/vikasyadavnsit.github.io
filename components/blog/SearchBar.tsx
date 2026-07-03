import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[hsl(var(--blog-border))] bg-[hsl(var(--blog-card))]">
      <Search className="w-4 h-4 text-[hsl(var(--blog-muted))]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search posts..."}
        className="flex-1 bg-transparent outline-none text-[hsl(var(--blog-fg))] placeholder:text-[hsl(var(--blog-muted))]"
      />
    </div>
  );
}
