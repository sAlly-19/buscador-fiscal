export const PAGE_SIZE_OPTIONS = [50, 100, 200, 500, 1000] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export function isPageSize(value: unknown): value is PageSize {
  return typeof value === 'number'
    && Number.isInteger(value)
    && PAGE_SIZE_OPTIONS.some((option) => option === value);
}

export function normalizePageSize(value: unknown): PageSize {
  return isPageSize(value) ? value : 50;
}
