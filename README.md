# Setup

```bash
pnpm install
```

# Run

```bash
pnpm dev
```

# Production Considerations

This demo uses **client-side** filtering. For production at scale:

- **Backend API**: Filtering and pagination should be handled by a backend API. Pass facet tags as query params and let the server return filtered, paginated results.
- **Facet value suggestions**: Use debounced requests (e.g. 200–300ms) when fetching facet values from the API to avoid excessive calls as the user types.
- **Scale**: Facet values should come from an index or aggregation (e.g. Elasticsearch facets, database GROUP BY), not a full scan of all records.
- **Optional enhancements**:
  - **Virtualization**: For large value sets (1000+ options), use a virtualized list (e.g. `react-window`) in the dropdown.
  - **Fuzzy matching**: For typo-tolerant value search, consider `fuse.js` or similar.
