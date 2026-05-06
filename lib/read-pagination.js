/**
 * Normalize Quran Foundation chapter-verse pagination (snake_case vs camelCase).
 * @param {object} [pagination]
 * @param {number} page — 1-based page just fetched
 * @param {number} perPage
 * @param {number} batchLength — verses returned in this page
 */
export function paginationHasNextPage(pagination, page, perPage, batchLength) {
  const p = pagination ?? {};
  const totalPages = p.total_pages ?? p.totalPages;
  if (typeof totalPages === "number" && totalPages > 0) {
    return page < totalPages;
  }
  const lastPage = p.last_page ?? p.lastPage;
  if (typeof lastPage === "number" && lastPage > 0) {
    return page < lastPage;
  }
  const totalRecords = p.total_records ?? p.totalRecords;
  if (typeof totalRecords === "number" && totalRecords > 0) {
    return page * perPage < totalRecords;
  }
  if (batchLength === 0) return false;
  return batchLength >= perPage;
}
