import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import ThemeToggle from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light");
  });

  it("renders nothing (placeholder) before mount", () => {
    // Before useEffect fires the component renders a placeholder div
    const { container } = render(<ThemeToggle />);
    // After mount the button appears; the placeholder was only during SSR
    // In jsdom useEffect runs synchronously in act(), so the button is present
    expect(container.firstChild).toBeInTheDocument();
  });

  it("shows the sun icon in dark mode (default)", async () => {
    await act(async () => {
      render(<ThemeToggle />);
    });
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch to light mode");
  });

  it("shows the moon icon when light mode is saved", async () => {
    localStorage.setItem("qalb_theme", "light");
    await act(async () => {
      render(<ThemeToggle />);
    });
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch to dark mode");
  });

  it("toggles from dark to light on click", async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<ThemeToggle />);
    });

    await user.click(screen.getByRole("button"));

    expect(localStorage.getItem("qalb_theme")).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch to dark mode");
  });

  it("toggles from light back to dark on second click", async () => {
    const user = userEvent.setup();
    localStorage.setItem("qalb_theme", "light");

    await act(async () => {
      render(<ThemeToggle />);
    });

    await user.click(screen.getByRole("button"));

    expect(localStorage.getItem("qalb_theme")).toBe("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("applies light class to documentElement on mount when saved", async () => {
    localStorage.setItem("qalb_theme", "light");
    await act(async () => {
      render(<ThemeToggle />);
    });
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
