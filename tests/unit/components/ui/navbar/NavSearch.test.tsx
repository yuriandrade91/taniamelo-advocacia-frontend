import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NavSearch from "@/components/ui/navbar/NavSearch";

describe("NavSearch", () => {
  it("aberta: digita, Enter busca, Esc fecha; vazio não busca", async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<NavSearch isOpen value="" onChange={onChange} onSubmit={onSubmit} onClose={onClose} />);
    const input = screen.getByRole("searchbox");
    const user = userEvent.setup();
    await user.type(input, "M");
    expect(onChange).toHaveBeenCalledWith("M");
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(<NavSearch isOpen value="  Maria " onChange={onChange} onSubmit={onSubmit} onClose={onClose} />);
    await user.click(screen.getByRole("searchbox"));
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("Maria");
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    await user.keyboard("a");

    rerender(<NavSearch isOpen={false} value="" onChange={onChange} onSubmit={onSubmit} onClose={onClose} />);
  });
});
