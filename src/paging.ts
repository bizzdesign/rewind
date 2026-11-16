/**
 * Reading a whole result in big pages, several at once.
 *
 * Measured on a busy Bizzdesign test environment (Nov 2026, Rewind's year queries, 3 pages in flight):
 * a request costs 7–10 s however small, so bigger pages are nearly free.
 *
 *   page size   100   250   500   1,000   2,000   4,000   5,000
 *   elements/s   34    75   207     294     519     578     727
 *   links/s                                384   (fails: response too big)
 *
 * 2,000 keeps clear of the response size limit (links carry both ends) while
 * taking most of the gain. A page that fails anyway is fetched again as two
 * halves, down to MIN_PAGE, so a tenant with heavier rows still loads.
 */

export const PAGE = 2_000;
export const MIN_PAGE = 250;
/** Pages in flight per list. */
export const PARALLEL = 4;

export interface Paged<T> {
  getCount(): Promise<number>;
  asPages(options: { pageSize: number }): { getPage(index: number): Promise<readonly T[]> };
}

/** Reads up to `cap` items; true when there were more. */
export async function readAll<T>(
  result: Paged<T>,
  each: (item: T) => void,
  options: { cap: number; onTotal?: (n: number) => void; page?: number; parallel?: number },
): Promise<boolean> {
  const size = options.page ?? PAGE;
  const parallel = options.parallel ?? PARALLEL;
  // The first pages go out with the count, not after it: each request costs seconds.
  const counted = result.getCount().then((total) => {
    wanted = Math.min(total, options.cap);
    options.onTotal?.(wanted);
    return total;
  });
  let wanted = Infinity;

  const bySize = new Map<number, ReturnType<Paged<T>['asPages']>>();
  const pagesOf = (s: number) => {
    let p = bySize.get(s);
    if (!p) bySize.set(s, (p = result.asPages({ pageSize: s })));
    return p;
  };
  // Page `index` at size `s`; on failure, the same items as pages 2i and 2i+1 at s/2.
  const fetch = async (s: number, index: number): Promise<void> => {
    if (index * s >= wanted) return;
    let page: readonly T[];
    try {
      page = await pagesOf(s).getPage(index);
    } catch (error) {
      if (s / 2 < MIN_PAGE) throw error;
      await fetch(s / 2, index * 2);
      await fetch(s / 2, index * 2 + 1);
      return;
    }
    await counted;
    // The last page may run past the cap.
    page.slice(0, Math.max(0, wanted - index * s)).forEach(each);
  };

  let next = 0;
  await Promise.all(
    Array.from({ length: parallel }, async () => {
      for (;;) {
        const index = next++;
        // Page 0 goes out with the count; the rest wait for it, so a small list doesn't send empty requests.
        if (index > 0) await counted;
        if (index * size >= wanted) return;
        await fetch(size, index);
      }
    }),
  );
  return (await counted) > options.cap;
}
