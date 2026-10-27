import type { SearchField, Tab } from "@/lib/query";

export function boardHref(options: {
  tab?: Tab;
  field?: SearchField;
  q?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (options.tab && options.tab !== "all") params.set("tab", options.tab);
  if (options.field && options.field !== "all") params.set("field", options.field);
  if (options.q) params.set("q", options.q);
  if (options.page && options.page > 1) params.set("page", String(options.page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
