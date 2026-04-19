import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SplashScreen from "../SplashScreen";

describe("SplashScreen", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("renders the Bismillah Arabic text on first visit", () => {
    render(<SplashScreen />);
    expect(screen.getByText("بسم الله الرحمن الرحيم")).toBeInTheDocument();
  });

  it("renders the 'Qalb' app name", () => {
    render(<SplashScreen />);
    expect(screen.getByText("Qalb")).toBeInTheDocument();
  });

  it("renders nothing when splash has already been shown this session", () => {
    sessionStorage.setItem("qalb_splash_shown", "1");
    const { container } = render(<SplashScreen />);
    expect(container.firstChild).toBeNull();
  });

  it("sets the session flag on first render", () => {
    render(<SplashScreen />);
    expect(sessionStorage.getItem("qalb_splash_shown")).toBe("1");
  });

  it("unmounts after the exit animation completes (2700ms)", async () => {
    const { container } = render(<SplashScreen />);
    expect(container.firstChild).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(2700);
    });

    expect(container.firstChild).toBeNull();
  });

  it("starts exit animation at 2200ms (exiting phase)", async () => {
    const { container } = render(<SplashScreen />);

    await act(async () => {
      vi.advanceTimersByTime(2200);
    });

    // Component is still rendered (not gone yet) but in exiting phase
    expect(container.firstChild).not.toBeNull();
  });

  it("renders 3 pulsing dots", () => {
    const { container } = render(<SplashScreen />);
    // Three dot spans — each has a dot-pulse animation style
    const dots = container.querySelectorAll("span[style*='dot-pulse']");
    expect(dots).toHaveLength(3);
  });

  it("overlay has aria-hidden so screen readers skip it", () => {
    const { container } = render(<SplashScreen />);
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay).toBeInTheDocument();
  });
});
