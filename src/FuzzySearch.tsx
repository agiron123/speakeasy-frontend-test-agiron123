import { useState, useRef, useEffect } from "react";
import type { HttpLog, FacetTag } from "./types";

interface FuzzySearchProps {
  data: HttpLog[];
  onChange: (data: HttpLog[]) => void;
}

export function FuzzySearch({ data, onChange }: FuzzySearchProps) {
  const [tags, setTags] = useState<FacetTag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-wrap items-center gap-2 w-full max-w-2xl border border-zinc-700 rounded-lg bg-zinc-900 p-2 min-h-[44px]"
    >
      {/* Tags area */}
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag, i) => (
          <span
            key={`${tag.facet}-${tag.value}-${i}`}
            className="inline-flex items-center gap-1 bg-blue-600/80 text-zinc-100 rounded px-2 py-0.5 text-sm"
          >
            {tag.facet}:{tag.value}
            <button
              type="button"
              onClick={() => setTags((t) => t.filter((_, j) => j !== i))}
              className="ml-1 hover:bg-blue-500/50 rounded leading-none"
              aria-label={`Remove ${tag.facet}:${tag.value}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Inline input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={() => {}}
        placeholder="Type facet: to filter..."
        className="flex-1 min-w-[120px] bg-transparent text-zinc-100 placeholder-zinc-500 border-none outline-none focus:ring-0 py-1"
      />

      {/* Absolutely positioned dropdown */}
      {dropdownOpen && (
        <ul
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1 z-10 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          <li className="px-3 py-2 text-zinc-400 text-sm">Dropdown placeholder</li>
        </ul>
      )}
    </div>
  );
}
