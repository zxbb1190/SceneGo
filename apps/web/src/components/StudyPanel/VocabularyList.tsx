import type { VocabularyItem } from "@scenego/shared";

export interface VocabularyListProps {
  items: VocabularyItem[];
}

export function VocabularyList({ items }: VocabularyListProps) {
  return (
    <ul className="divide-y divide-line rounded border border-line bg-white">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between px-4 py-3">
          <span className="font-medium">{item.word}</span>
          <span className="text-sm text-slate-600">{item.meaning}</span>
        </li>
      ))}
    </ul>
  );
}

