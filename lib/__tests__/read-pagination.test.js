import { describe, expect, it } from "vitest";

import { paginationHasNextPage } from "../read-pagination.js";

describe("paginationHasNextPage", () => {
  it("uses total_pages (snake)", () => {
    expect(paginationHasNextPage({ total_pages: 3 }, 1, 20, 20)).toBe(true);
    expect(paginationHasNextPage({ total_pages: 3 }, 3, 20, 5)).toBe(false);
  });

  it("uses totalPages (camel)", () => {
    expect(paginationHasNextPage({ totalPages: 2 }, 1, 20, 20)).toBe(true);
    expect(paginationHasNextPage({ totalPages: 2 }, 2, 20, 10)).toBe(false);
  });

  it("infers from total_records when total_pages missing", () => {
    expect(paginationHasNextPage({ total_records: 50 }, 1, 20, 20)).toBe(true);
    expect(paginationHasNextPage({ total_records: 50 }, 3, 20, 10)).toBe(false);
  });

  it("falls back to full batch means more pages", () => {
    expect(paginationHasNextPage({}, 1, 20, 20)).toBe(true);
    expect(paginationHasNextPage({}, 1, 20, 5)).toBe(false);
  });
});
