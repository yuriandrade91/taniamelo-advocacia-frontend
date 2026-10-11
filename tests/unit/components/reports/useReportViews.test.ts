import { describe, expect, it } from "vitest";
import { moveId, orderViews } from "@/components/reports/useReportViews";

const views = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("orderViews", () => {
  it("sem ordem salva, a padrão", () => {
    expect(orderViews(views, null).map((v) => v.id)).toEqual(["a", "b", "c"]);
  });

  it("segue a salva, descarta o que sumiu e põe no fim o que é novo", () => {
    expect(orderViews(views, ["c", "x", "a"]).map((v) => v.id)).toEqual(["c", "a", "b"]);
  });
});

describe("moveId", () => {
  it("leva para a posição pedida, limitada às pontas", () => {
    expect(moveId(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
    expect(moveId(["a", "b", "c"], "a", 99)).toEqual(["b", "c", "a"]);
    expect(moveId(["a", "b", "c"], "b", -3)).toEqual(["b", "a", "c"]);
  });
});
