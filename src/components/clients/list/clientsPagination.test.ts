import { describe, expect, it } from "vitest";
import { INITIAL_CLIENTS_PAGINATION, paginationFromEnvelope } from "./clientsPagination";

describe("paginationFromEnvelope", () => {
  it("adota a paginação do servidor", () => {
    expect(
      paginationFromEnvelope(INITIAL_CLIENTS_PAGINATION, {
        pagination: {
          pageNumber: 3,
          pageSize: 10,
          totalRecords: 125,
          totalPages: 13,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      }),
    ).toEqual({
      pageNumber: 3,
      pageSize: 10,
      totalRecords: 125,
      totalPages: 13,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("campo ausente ou inválido mantém o anterior — não zera as páginas", () => {
    const previous = { ...INITIAL_CLIENTS_PAGINATION, totalPages: 7, totalRecords: 70 };
    const next = paginationFromEnvelope(previous, {
      pagination: { pageNumber: 2, totalPages: Number.NaN },
    });
    expect(next.totalPages).toBe(7);
    expect(next.totalRecords).toBe(70);
    expect(next.pageNumber).toBe(2);
    expect(next.hasNextPage).toBe(false);
  });

  it("sem paginação no envelope, devolve o mesmo objeto (sem render à toa)", () => {
    const previous = { ...INITIAL_CLIENTS_PAGINATION };
    expect(paginationFromEnvelope(previous, {})).toBe(previous);
    expect(paginationFromEnvelope(previous, { pagination: null })).toBe(previous);
  });
});
