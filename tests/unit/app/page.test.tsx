import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RootPage from "@/app/page";
import { router } from "../support/next";
import { signIn } from "../support/session";

describe("Raiz", () => {
  it("leva para a home com sessão e para o site sem", async () => {
    signIn();
    const first = render(<RootPage />);
    expect(router.replace).toHaveBeenCalledWith("/home");
    first.unmount();
    document.cookie = "token=; path=/; max-age=0";
    render(<RootPage />);
    expect(router.replace).toHaveBeenLastCalledWith(expect.stringMatching(/site|\//));
  });
});
