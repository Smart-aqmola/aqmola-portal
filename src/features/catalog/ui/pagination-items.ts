export type PaginationItem = { type: "page"; page: number } | { type: "gap"; key: string };

/**
 * Which page numbers to show: the first, the last and the current one with its neighbours,
 * with a gap marker where numbers are skipped. 1 … 5 6 7 … 11
 */
export function paginationItems(current: number, pageCount: number): PaginationItem[] {
  const wanted = new Set([1, pageCount, current - 1, current, current + 1]);
  const pages = [...wanted].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);

  const items: PaginationItem[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      // A single skipped number is cheaper to show than a gap marker.
      if (page - pages[index - 1] === 2) items.push({ type: "page", page: page - 1 });
      else items.push({ type: "gap", key: `gap-${page}` });
    }
    items.push({ type: "page", page });
  });
  return items;
}
