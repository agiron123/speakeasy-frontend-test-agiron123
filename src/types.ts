export interface HttpLog {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  statusCode: number;
  id: string;
  domain: string;
}

export interface FacetTag {
  facet: string;
  value: string | number;
}

export type FacetValueExtractor = (log: HttpLog) => string | number;

export interface FacetConfig {
  label: string;
  extractValue: FacetValueExtractor;
  /** Alias names that map to this facet (e.g. "status" → "statusCode") */
  aliases?: string[];
}

/** Facet registry: maps facet key to display label, value extractor, and optional aliases */
export const FACET_REGISTRY: Record<string, FacetConfig> = {
  method: {
    label: "Method",
    extractValue: (log) => log.method,
  },
  path: {
    label: "Path",
    extractValue: (log) => log.path,
  },
  status: {
    label: "Status",
    extractValue: (log) => log.statusCode,
    aliases: ["status"],
  },
  domain: {
    label: "Domain",
    extractValue: (log) => log.domain,
  },
};

/** Resolve facet name (including alias) to canonical facet key */
export function resolveFacetKey(input: string): string | null {
  const key = input.toLowerCase();
  if (key in FACET_REGISTRY) return key;
  for (const [facetKey, config] of Object.entries(FACET_REGISTRY)) {
    if (config.aliases?.some((a) => a.toLowerCase() === key)) return facetKey;
  }
  return null;
}
