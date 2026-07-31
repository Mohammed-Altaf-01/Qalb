import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import BismillahHeader from "../BismillahHeader";

/**
 * Stub `(hover: hover) and (pointer: fine)`.
 * @param {boolean} matches
 */
function stubPointer(matches) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("BismillahHeader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the Arabic Bismillah text", () => {
    stubPointer(true);
    render(<BismillahHeader />);
    expect(screen.getByText("بسم الله الرحمن الرحيم")).toBeInTheDocument();
  });

  it("shows energy rings on mouse enter with a fine pointer", () => {
    stubPointer(true);
    const { container } = render(<BismillahHeader />);
    const hoverTarget = container.querySelector("[style*='filter']");
    fireEvent.mouseEnter(hoverTarget);
    const rings = container.querySelectorAll(".bismillah-ring-1, .bismillah-ring-2");
    expect(rings.length).toBeGreaterThan(0);
  });

  it("removes rings on mouse leave", () => {
    stubPointer(true);
    const { container } = render(<BismillahHeader />);
    const hoverTarget = container.querySelector("[style*='filter']");
    fireEvent.mouseEnter(hoverTarget);
    fireEvent.mouseLeave(hoverTarget);
    const rings = container.querySelectorAll(".bismillah-ring-1, .bismillah-ring-2");
    expect(rings.length).toBe(0);
  });

  it("does not fire the hover burst on touch, where a tap emits mouseenter", () => {
    stubPointer(false);
    const { container } = render(<BismillahHeader />);
    const hoverTarget = container.querySelector("[style*='filter']");
    fireEvent.mouseEnter(hoverTarget);
    const rings = container.querySelectorAll(".bismillah-ring-1, .bismillah-ring-2");
    expect(rings.length).toBe(0);
  });
});
