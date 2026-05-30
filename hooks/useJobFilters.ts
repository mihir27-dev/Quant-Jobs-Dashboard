// hooks/useJobFilters.ts
"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type Filters,
  type SortKey,
  EMPTY_FILTERS,
  filtersToSearchParams,
  searchParamsToFilters,
} from "@/lib/filtering";

type ArrayKey = "tiers" | "roles" | "locations" | "languages" | "firms";

/**
 * The URL query string is the single source of truth, but we use a local
 * state to achieve 0ms input feedback. router.replace() runs concurrently in
 * the background to keep the address bar and shareability in sync.
 */
export function useJobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from searchParams
  const [filters, setFilters] = useState<Filters>(() =>
    searchParamsToFilters(new URLSearchParams(searchParams.toString()))
  );

  // Sync state with searchParams if browser URL changes externally (e.g. back/forward navigation)
  const searchParamsStr = searchParams.toString();
  useEffect(() => {
    setFilters(searchParamsToFilters(new URLSearchParams(searchParamsStr)));
  }, [searchParamsStr]);

  // Update local state instantly + update URL in the background
  const commit = useCallback(
    (next: Filters) => {
      setFilters(next);
      const qs = filtersToSearchParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const toggle = useCallback(
    (key: ArrayKey, value: string) => {
      const cur = filters[key];
      const next = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      commit({ ...filters, [key]: next });
    },
    [filters, commit]
  );

  // Debounce the input in the component (~250ms) before calling this,
  // so fast typing doesn't thrash router.replace().
  const setQuery = useCallback((q: string) => commit({ ...filters, q }), [filters, commit]);

  const setSort = useCallback((sort: SortKey) => commit({ ...filters, sort }), [filters, commit]);

  const clearAll = useCallback(() => commit(EMPTY_FILTERS), [commit]);

  return { filters, toggle, setQuery, setSort, clearAll };
}
