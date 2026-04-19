import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock next/navigation before importing Navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
  signIn: vi.fn(),
}));

import { usePathname } from "next/navigation";
import Navigation from "../Navigation";

describe("Navigation", () => {
  it("renders the Qalb logo text", async () => {
    await act(async () => render(<Navigation />));
    expect(screen.getByText("Qalb")).toBeInTheDocument();
  });

  it("renders the tagline", async () => {
    await act(async () => render(<Navigation />));
    expect(screen.getByText(/Your Daily Quran Companion/i)).toBeInTheDocument();
  });

  it("renders all nav tab labels", async () => {
    await act(async () => render(<Navigation />));
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Discover")).toBeInTheDocument();
    expect(screen.getByText("Goals")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("marks the Home tab as current when pathname is /", async () => {
    usePathname.mockReturnValue("/");
    await act(async () => render(<Navigation />));
    const homeLink = screen.getAllByRole("link").find((l) => l.textContent?.includes("Home"));
    expect(homeLink).toHaveAttribute("aria-current", "page");
  });

  it("marks the Discover tab as current when pathname is /discover", async () => {
    usePathname.mockReturnValue("/discover");
    await act(async () => render(<Navigation />));
    const discoverLink = screen.getAllByRole("link").find((l) => l.textContent?.includes("Discover"));
    expect(discoverLink).toHaveAttribute("aria-current", "page");
  });

  it("does not mark Home as current when on /discover", async () => {
    usePathname.mockReturnValue("/discover");
    await act(async () => render(<Navigation />));
    const homeLink = screen.getAllByRole("link").find((l) => l.textContent?.includes("Home"));
    expect(homeLink).not.toHaveAttribute("aria-current", "page");
  });

  it("marks the Library tab as current when pathname is /library", async () => {
    usePathname.mockReturnValue("/library");
    await act(async () => render(<Navigation />));
    const libraryLink = screen.getAllByRole("link").find((l) => l.textContent?.includes("Library"));
    expect(libraryLink).toHaveAttribute("aria-current", "page");
  });

  it("home link points to /", async () => {
    await act(async () => render(<Navigation />));
    const logoLink = screen.getByLabelText("Qalb — home");
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders the ThemeToggle button", async () => {
    await act(async () => render(<Navigation />));
    // ThemeToggle renders a button; look for it via role
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("marks Goals as active on sub-path /goals/new", async () => {
    usePathname.mockReturnValue("/goals/new");
    await act(async () => render(<Navigation />));
    const goalsLink = screen.getAllByRole("link").find((l) => l.textContent?.includes("Goals"));
    expect(goalsLink).toHaveAttribute("aria-current", "page");
  });
});
