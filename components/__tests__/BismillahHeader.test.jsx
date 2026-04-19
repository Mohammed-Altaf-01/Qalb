import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BismillahHeader from "../BismillahHeader";

describe("BismillahHeader", () => {
  it("renders the Arabic Bismillah text", () => {
    render(<BismillahHeader />);
    expect(screen.getByText("بسم الله الرحمن الرحيم")).toBeInTheDocument();
  });

  it("shows energy rings on mouse enter", () => {
    const { container } = render(<BismillahHeader />);
    const hoverTarget = container.querySelector("[style*='filter']");
    fireEvent.mouseEnter(hoverTarget);
    // Rings wrapper appears (aria-hidden ring container)
    const rings = container.querySelectorAll(".bismillah-ring-1, .bismillah-ring-2");
    expect(rings.length).toBeGreaterThan(0);
  });

  it("removes rings on mouse leave", () => {
    const { container } = render(<BismillahHeader />);
    const hoverTarget = container.querySelector("[style*='filter']");
    fireEvent.mouseEnter(hoverTarget);
    fireEvent.mouseLeave(hoverTarget);
    const rings = container.querySelectorAll(".bismillah-ring-1, .bismillah-ring-2");
    expect(rings.length).toBe(0);
  });
});
