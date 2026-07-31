import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SplashScreen, { SPLASH_EXIT_MS, SPLASH_HOLD_MS } from "../SplashScreen";

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

  it("unmounts after the hold plus the exit animation", async () => {
    const { container } = render(<SplashScreen />);
    expect(container.firstChild).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(SPLASH_HOLD_MS + SPLASH_EXIT_MS);
    });

    expect(container.firstChild).toBeNull();
  });

  it("enters the exiting phase once the hold elapses", async () => {
    const { container } = render(<SplashScreen />);

    await act(async () => {
      vi.advanceTimersByTime(SPLASH_HOLD_MS);
    });

    // Still rendered (not gone yet) but marked as exiting
    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector("#qalb-splash")).toHaveAttribute("data-phase", "exiting");
  });

  it("keeps the whole hold under a second and a half", () => {
    // A per-tab-session splash is not a rare first-run moment; it must not
    // sit between a returning user and the app.
    expect(SPLASH_HOLD_MS).toBeLessThanOrEqual(1500);
  });

  it("skips to the exit on pointerdown instead of blocking input", async () => {
    const { container } = render(<SplashScreen />);

    await act(async () => {
      window.dispatchEvent(new window.PointerEvent("pointerdown"));
    });

    expect(container.querySelector("#qalb-splash")).toHaveAttribute("data-phase", "exiting");

    await act(async () => {
      vi.advanceTimersByTime(SPLASH_EXIT_MS);
    });

    expect(container.firstChild).toBeNull();
  });

  it("skips to the exit on keydown", async () => {
    const { container } = render(<SplashScreen />);

    await act(async () => {
      window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(container.querySelector("#qalb-splash")).toHaveAttribute("data-phase", "exiting");
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
