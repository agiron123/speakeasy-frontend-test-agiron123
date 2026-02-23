import { useState, useRef, useEffect, useMemo } from "react";
import type { HttpLog, FacetTag } from "./types";
import { FACET_REGISTRY, resolveFacetKey } from "./types";

interface FuzzySearchProps {
  data: HttpLog[];
  onChange: (data: HttpLog[]) => void;
}

/** Parse inputValue to detect value-selection mode: facetName:(optionalValuePrefix) */
function parseValueMode(inputValue: string): {
  inValueMode: boolean;
  facetKey: string | null;
  valuePrefix: string;
} {
  const colonIdx = inputValue.indexOf(":");
  if (colonIdx === -1) {
    return { inValueMode: false, facetKey: null, valuePrefix: "" };
  }
  const facetName = inputValue.slice(0, colonIdx).trim();
  const valuePrefix = inputValue.slice(colonIdx + 1).trim();
  const facetKey = resolveFacetKey(facetName);
  if (!facetKey) {
    return { inValueMode: false, facetKey: null, valuePrefix: "" };
  }
  return { inValueMode: true, facetKey, valuePrefix };
}

/** Get unique values for a facet from data, filtered by valuePrefix (case-insensitive) */
function getFilteredValues(
  data: HttpLog[],
  facetKey: string,
  valuePrefix: string
): (string | number)[] {
  const config = FACET_REGISTRY[facetKey];
  if (!config) return [];
  const seen = new Set<string>();
  const values: (string | number)[] = [];
  const prefix = valuePrefix.toLowerCase();
  for (const log of data) {
    const v = config.extractValue(log);
    const str = String(v);
    if (seen.has(str)) continue;
    seen.add(str);
    if (!prefix || str.toLowerCase().includes(prefix)) {
      values.push(v);
    }
  }
  return values.sort((a, b) => String(a).localeCompare(String(b)));
}

export function FuzzySearch({ data, onChange }: FuzzySearchProps) {
  const [tags, setTags] = useState<FacetTag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { inValueMode, facetKey, valuePrefix } = parseValueMode(inputValue);

  const dropdownOptions = useMemo(() => {
    if (!inValueMode || !facetKey) return [];
    return getFilteredValues(data, facetKey, valuePrefix);
  }, [data, inValueMode, facetKey, valuePrefix]);

  // Show dropdown when in value mode and facet is valid
  useEffect(() => {
    setDropdownOpen(inValueMode);
    setHighlightedIndex(0);
  }, [inValueMode]);

  // Filter data by tags and notify parent
  useEffect(() => {
    let filtered = data;
    for (const tag of tags) {
      const config = FACET_REGISTRY[tag.facet];
      if (!config) continue;
      filtered = filtered.filter((log) => {
        const v = config.extractValue(log);
        return String(v) === String(tag.value);
      });
    }
    onChange(filtered);
  }, [data, tags, onChange]);

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

  function addTag(value: string | number) {
    if (!facetKey) return;
    setTags((t) => [...t, { facet: facetKey, value }]);
    setInputValue("");
    setDropdownOpen(false);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setDropdownOpen(false);
      return;
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      setTags((t) => t.slice(0, -1));
      return;
    }
    if (!dropdownOpen || dropdownOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % dropdownOptions.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + dropdownOptions.length) % dropdownOptions.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = dropdownOptions[highlightedIndex];
      if (opt !== undefined) addTag(opt);
    }
  }

  const listboxId = "fuzzy-search-listbox";
  const getOptionId = (i: number) => `fuzzy-search-option-${i}`;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-wrap items-center gap-2 w-full max-w-2xl border border-zinc-700 rounded-lg bg-zinc-900 p-2 min-h-[44px]"
    >
      {/* Tags area - pills with remove on hover */}
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag, i) => (
          <span
            key={`${tag.facet}-${tag.value}-${i}`}
            className="group inline-flex items-center gap-1 bg-blue-600/80 text-zinc-100 rounded px-2 py-0.5 text-sm"
          >
            {tag.facet}:{tag.value}
            <button
              type="button"
              onClick={() => setTags((t) => t.filter((_, j) => j !== i))}
              className="ml-1 opacity-70 group-hover:opacity-100 hover:bg-blue-500/50 rounded leading-none transition-opacity"
              aria-label={`Remove ${tag.facet}:${tag.value}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Inline input - combobox pattern */}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={dropdownOpen}
        aria-controls={dropdownOpen ? listboxId : undefined}
        aria-activedescendant={
          dropdownOpen && dropdownOptions.length > 0 ? getOptionId(highlightedIndex) : undefined
        }
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-label="Filter by facet. Type facet name followed by colon, e.g. method:"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type facet: to filter..."
        className="flex-1 min-w-[120px] bg-transparent text-zinc-100 placeholder-zinc-500 border-none outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded py-1"
      />

      {/* Screen reader live region for dropdown state */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {dropdownOpen && dropdownOptions.length > 0
          ? `${dropdownOptions.length} options, ${String(dropdownOptions[highlightedIndex])} selected`
          : ""}
      </div>

      {/* Dropdown */}
      {dropdownOpen && dropdownOptions.length > 0 && (
        <ul
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          aria-label="Facet values"
          className="absolute left-0 right-0 top-full mt-1 z-10 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {dropdownOptions.map((opt, i) => (
            <li
              key={String(opt)}
              id={getOptionId(i)}
              role="option"
              aria-selected={i === highlightedIndex ? "true" : "false"}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === highlightedIndex ? "bg-blue-600/30 text-zinc-100" : "text-zinc-300 hover:bg-zinc-700/50"
              }`}
              onMouseEnter={() => setHighlightedIndex(i)}
              onClick={() => addTag(opt)}
            >
              {String(opt)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
