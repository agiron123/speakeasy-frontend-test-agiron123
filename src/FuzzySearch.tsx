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

type DropdownOption =
  | { kind: "facet"; facetKey: string; label: string }
  | { kind: "value"; value: string | number; facetKey: string };

export function FuzzySearch({ data, onChange }: FuzzySearchProps) {
  const [tags, setTags] = useState<FacetTag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { inValueMode, facetKey, valuePrefix } = parseValueMode(inputValue);
  const inFacetMode = inputValue.indexOf(":") === -1;

  const dropdownOptions = useMemo((): DropdownOption[] => {
    if (inFacetMode) {
      const facetFilter = inputValue.trim().toLowerCase();
      return Object.entries(FACET_REGISTRY)
        .filter(([key, config]) => {
          if (!facetFilter) return true;
          const matchesKey = key.toLowerCase().includes(facetFilter);
          const matchesLabel = config.label.toLowerCase().includes(facetFilter);
          const matchesAlias = config.aliases?.some((a) =>
            a.toLowerCase().includes(facetFilter)
          );
          return matchesKey || matchesLabel || !!matchesAlias;
        })
        .map(([key, config]) => ({
          kind: "facet" as const,
          facetKey: key,
          label: config.label,
        }));
    }
    if (!inValueMode || !facetKey) return [];
    return getFilteredValues(data, facetKey, valuePrefix).map((v) => ({
      kind: "value" as const,
      value: v,
      facetKey,
    }));
  }, [data, inputValue, inFacetMode, inValueMode, facetKey, valuePrefix]);

  const showDropdown = (inFacetMode && inputFocused) || inValueMode;

  // Show dropdown when in facet mode (focused + empty) or value mode; reset highlighted index
  useEffect(() => {
    setDropdownOpen(showDropdown);
    setHighlightedIndex(0);
  }, [showDropdown]);

  // Filter data by tags and notify parent
  // Same facet chosen multiple times (e.g. method:delete, method:post) → OR within that facet
  // Different facets → AND across facets
  useEffect(() => {
    if (tags.length === 0) {
      onChange(data);
      return;
    }
    const tagsByFacet = new Map<string, Set<string>>();
    for (const tag of tags) {
      const config = FACET_REGISTRY[tag.facet];
      if (!config) continue;
      const key = String(tag.value);
      if (!tagsByFacet.has(tag.facet)) {
        tagsByFacet.set(tag.facet, new Set());
      }
      tagsByFacet.get(tag.facet)!.add(key);
    }
    const filtered = data.filter((log) => {
      for (const [facet, values] of tagsByFacet) {
        const config = FACET_REGISTRY[facet];
        if (!config) continue;
        const v = String(config.extractValue(log));
        if (!values.has(v)) return false;
      }
      return true;
    });
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

  function selectFacet(facetKey: string) {
    setInputValue(`${facetKey}:`);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  }

  function addTag(value: string | number, facetKeyForTag: string) {
    setTags((t) => [...t, { facet: facetKeyForTag, value }]);
    setInputValue("");
    setHighlightedIndex(0);
    inputRef.current?.focus();
    // Keep dropdown open - user returns to facet mode (empty input) and can add more filters
  }

  function handleSelectOption(opt: DropdownOption) {
    if (opt.kind === "facet") {
      selectFacet(opt.facetKey);
    } else {
      addTag(opt.value, opt.facetKey);
    }
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
      if (opt !== undefined) handleSelectOption(opt);
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
      <div className="flex flex-1 min-w-[120px] items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={dropdownOpen ? "true" : "false"}
          aria-controls={dropdownOpen ? listboxId : undefined}
          aria-activedescendant={
            dropdownOpen && dropdownOptions.length > 0 ? getOptionId(highlightedIndex) : undefined
          }
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-label="Filter by facet. Type facet name followed by colon, e.g. method:"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type facet: to filter..."
          className="flex-1 min-w-0 bg-transparent text-zinc-100 placeholder-zinc-500 border-none outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 rounded py-1"
        />
        {tags.length > 0 && (
          <button
            type="button"
            onClick={() => setTags([])}
            className="ml-2 shrink-0 p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 rounded transition-colors"
            aria-label="Clear all filters"
          >
            Clear
          </button>
        )}
      </div>

      {/* Screen reader live region for dropdown state */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {dropdownOpen && dropdownOptions.length > 0
          ? (() => {
              const opt = dropdownOptions[highlightedIndex];
              const selectedText = opt ? (opt.kind === "facet" ? opt.label : String(opt.value)) : "";
              return `${dropdownOptions.length} options, ${selectedText} selected`;
            })()
          : ""}
      </div>

      {/* Dropdown */}
      {dropdownOpen && dropdownOptions.length > 0 && (
        <ul
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          aria-label={inFacetMode ? "Available facets" : "Facet values"}
          className="absolute left-0 right-0 top-full mt-1 z-10 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {dropdownOptions.map((opt, i) => (
            <li
              key={opt.kind === "facet" ? opt.facetKey : `${opt.facetKey}-${opt.value}`}
              id={getOptionId(i)}
              role="option"
              aria-selected={i === highlightedIndex}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === highlightedIndex ? "bg-blue-600/30 text-zinc-100" : "text-zinc-300 hover:bg-zinc-700/50"
              }`}
              onMouseEnter={() => setHighlightedIndex(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectOption(opt)}
            >
              {opt.kind === "facet" ? opt.label : String(opt.value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
