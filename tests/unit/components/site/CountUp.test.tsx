import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CountUp, parseCount } from "@/components/site/CountUp";

/** O número que a tela desenha: o `sr-only` ao lado guarda sempre o valor final. */
const shown = (container: HTMLElement) => container.querySelector("[aria-hidden]")!.textContent;

describe("parseCount", () => {
  it("separa prefixo, quantidade e sufixo; o ponto é de milhar", () => {
    expect(parseCount("+1.500")).toEqual({ prefix: "+", amount: 1500, suffix: "" });
    expect(parseCount("98%")).toEqual({ prefix: "", amount: 98, suffix: "%" });
  });

  it("sem número, não há o que contar", () => {
    expect(parseCount("IA")).toBeNull();
  });
});

describe("CountUp", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("conta de zero até o valor e termina no texto original", async () => {
    vi.useFakeTimers();
    const { container } = render(<CountUp value="+1.500" delay={100} />);
    await vi.advanceTimersByTimeAsync(0);
    expect(shown(container)).toBe("+0");

    await vi.advanceTimersByTimeAsync(900);
    const midway = Number(shown(container)!.replace(/\D/g, ""));
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1500);

    await vi.advanceTimersByTimeAsync(2000);
    expect(shown(container)).toBe("+1.500");
  });

  it("o leitor de tela ouve só o valor final", async () => {
    const { container } = render(<CountUp value="98%" />);
    expect(container.querySelector(".sr-only")).toHaveTextContent("98%");
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });

  it("valor sem número aparece como está sem IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<CountUp value="IA" />);
    expect(shown(container)).toBe("IA");
  });

  it("sincroniza o indicador de IA com a duração dos contadores", async () => {
    vi.useFakeTimers();
    const onIntersections: IntersectionObserverCallback[] = [];

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        onIntersections.push(callback);
      }

      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    const { container } = render(
      <>
        <CountUp value="IA" delay={100} />
        <CountUp value="+1.500" delay={100} />
      </>,
    );
    const targets = Array.from(
      container.querySelectorAll("span[aria-hidden='true']"),
    );
    const target = targets.find((span) => span.textContent === "IA")!;
    const counterTarget = targets.find(
      (span) => span.textContent === "+0",
    )!;
    const observer: IntersectionObserver = {
      root: null,
      rootMargin: "0px",
      thresholds: [],
      disconnect: () => {},
      observe: () => {},
      takeRecords: () => [],
      unobserve: () => {},
    };

    act(() => {
      onIntersections.forEach((onIntersect, index) =>
        onIntersect(
          [
            {
              isIntersecting: true,
              target: targets[index],
            } as IntersectionObserverEntry,
          ],
          observer,
        ),
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(shown(container)).toBe("IA");
    expect(target).toHaveClass("pr-count-typing");
    expect(target.nextElementSibling).toHaveClass("pr-count-thinking");
    expect(container.querySelectorAll(".pr-count-thinking .pr-chat-dot")).toHaveLength(3);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(shown(container)).toBe("IA");
    expect(counterTarget.textContent).not.toBe("+1.500");
    expect(target).not.toHaveClass("pr-count-typing");
    expect(target).toHaveClass("pr-count-revealing");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(target).not.toHaveClass("pr-count-revealing");
    expect(counterTarget.textContent).toBe("+1.500");
  });

  it("com reduzir movimento, mostra o valor direto", async () => {
    vi.spyOn(globalThis, "matchMedia").mockImplementation(
      (query) => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
    );
    const { container } = render(<CountUp value="98%" />);
    expect(shown(container)).toBe("98%");
  });
});
