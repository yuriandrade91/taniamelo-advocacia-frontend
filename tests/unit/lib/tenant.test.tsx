import { beforeEach, describe, expect, it } from "vitest";
import {
  chooseTenantSlug,
  getTenantHeaderValue,
  setTenant,
} from "@/lib/tenant";

describe("chooseTenantSlug", () => {
  beforeEach(() => localStorage.clear());

  it("usa o slug escolhido no header, no lugar do UUID guardado", () => {
    setTenant("uuid-do-escritorio-antigo", "tania");
    chooseTenantSlug("demo");
    expect(getTenantHeaderValue()).toBe("demo");
  });

  it("slug vazio volta ao padrão do ambiente", () => {
    chooseTenantSlug("demo");
    chooseTenantSlug("  ");
    expect(getTenantHeaderValue()).toBe("tania");
  });
});
