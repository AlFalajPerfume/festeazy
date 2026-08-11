import type { PostgrestError } from "@supabase/supabase-js";

type PageResult<T> = {
  data: T[] | null;
  error: PostgrestError | null;
};

/**
 * Fetches every row from a Supabase query in deterministic pages.
 * Supabase projects commonly return at most 1,000 rows per request.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    allRows.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}
