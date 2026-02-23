# Fuzzy Search Component – Implementation Issues

Issues derived from the Fuzzy Search Component Implementation Plan.

---

## Issue 1: Define Facet Configuration ✅

**Priority:** High

Create a facet registry that maps facet names to:
- Display label (e.g., `statusCode` → "Status")
- Value extractor: `(log: HttpLog) => string | number`
- Optional: alias (e.g., `status` → `statusCode`)

**Facets from HttpLog:** `method`, `path`, `statusCode`, `domain`. Exclude `id`. Add `status` as alias for `statusCode`.

**Files:** `src/FuzzySearch.tsx`, optionally `src/types.ts`

---

## Issue 2: Build FuzzySearch Component Structure ✅

**Priority:** High

Implement the layout and state:
- **Layout:** Container (flex wrap, border, rounded), tags area, inline input, absolutely positioned dropdown
- **State:** `tags`, `inputValue`, `dropdownOpen`, `highlightedIndex`

**Files:** `src/FuzzySearch.tsx`

---

## Issue 3: Parsing Logic – Detect "Value Mode" ✅

**Priority:** High

Parse `inputValue` to detect when user is in value-selection mode:
- Match pattern: `(facetName):(optionalValuePrefix)`
- If `facetName` matches a known facet and ends with `:`, enter value mode
- Extract `valuePrefix` for filtering dropdown (case-insensitive substring)

**Example:** `method:` → show all methods; `domain:ex` → show domains starting with "ex"

**Files:** `src/FuzzySearch.tsx`

---

## Issue 4: Dropdown Behavior ✅

**Priority:** High

Implement dropdown interactions:
- Show when `facet:` detected and facet is valid
- Data source: unique values from data, filtered by `valuePrefix`
- ArrowDown / ArrowUp to change `highlightedIndex`, wrap at edges
- Enter or click → add tag, clear input, close dropdown
- Escape → close dropdown
- Click outside → close dropdown

**Files:** `src/FuzzySearch.tsx`

---

## Issue 5: Tag Completion and Display ✅

**Priority:** High

- On select: append `{ facet, value }` to `tags`, clear input, close dropdown
- Render tags as pills with `facet:value` and remove (×) button
- Backspace on empty input → remove last tag

**Files:** `src/FuzzySearch.tsx`

---

## Issue 6: Filtering Logic ✅

**Priority:** High

Filter `data` by tags (AND logic):
- Each tag: `log[facet] === value` (use `String()` for numeric facets like statusCode)
- Call `onChange(filtered)` whenever `tags` change

**Files:** `src/FuzzySearch.tsx`

---

## Issue 7: Accessibility and UX

**Priority:** Medium

- Full keyboard support: arrows, Enter, Escape, Backspace
- ARIA: `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `aria-controls`
- Focus management: keep focus in input; dropdown items via `aria-activedescendant`
- Screen reader announcements for dropdown state and selection

**Files:** `src/FuzzySearch.tsx`

---

## Issue 8: Styling (Tailwind)

**Priority:** Medium

- Dark theme: `bg-zinc-900`, `border-zinc-700`, `text-zinc-100`
- Tags: `bg-blue-600/80`, rounded, px-2 py-0.5, remove button on hover
- Dropdown: `bg-zinc-800`, border, shadow-lg, max-height with scroll
- Highlighted row: `bg-zinc-700` or `bg-blue-600/30`
- Focus ring for accessibility

**Files:** `src/FuzzySearch.tsx`

---

## Issue 9: Production Considerations Documentation

**Priority:** Low

Document in README or code comments:
- Client-side vs server: production would use backend API for filtering/pagination
- Debounced requests for facet value suggestions
- Scale: facet values from index/aggregation, not full scan
- Optional: virtualization for large value sets, fuzzy matching (fuse.js)

**Files:** `README.md`, `src/FuzzySearch.tsx`

---

## Issue 10: Export FacetTag Type (Optional) ✅

**Priority:** Low

Export `FacetTag` type from `src/types.ts` if used across components.

**Files:** `src/types.ts`

---

## Issue 11: Verify App Integration

**Priority:** Low

Ensure `App.tsx` passes `sampleData` to FuzzySearch and `onChange` receives filtered data. Verify integration is correct.

**Files:** `src/App.tsx`

---

## Optional Enhancements (Backlog)

- Facet name autocomplete when user types before `:`
- Fuzzy matching on values (e.g., fuse.js)
- Virtualized dropdown for large value sets
- Loading state for async facet values

---

## Testing Checklist

- [ ] Type `method:` → dropdown shows GET, POST, PUT, DELETE, PATCH
- [ ] Type `domain:ex` → dropdown shows example.com
- [ ] Arrow keys highlight; Enter selects
- [ ] Click on value selects and adds tag
- [ ] Multiple tags filter with AND
- [ ] Backspace on empty input removes last tag
- [ ] Escape closes dropdown
- [ ] Table updates when tags change
