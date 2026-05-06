import { act, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import Navigation from "../Navigation";

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

describe("Navigation", () => {
  it("renders home link with brand label", async () => {
    await act(async () => render(<Navigation />));
    expect(screen.getByLabelText("Qalb — home")).toBeInTheDocument();
    expect(screen.getByText("Qalb")).toBeInTheDocument();
  });

  it("renders primary nav labels (desktop + mobile)", async () => {
    await act(async () => render(<Navigation />));
    expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Read").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Discover").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ahadith").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Profile").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Settings")).toHaveAttribute("href", "/settings");
  });

  it("marks Home as current when pathname is /", async () => {
    usePathname.mockReturnValue("/");
    await act(async () => render(<Navigation />));
    const homeLink = screen.getAllByRole("link").find((l) => l.textContent === "Home");
    expect(homeLink).toHaveAttribute("aria-current", "page");
  });

  it("marks Discover as current when pathname is /discover", async () => {
    usePathname.mockReturnValue("/discover");
    await act(async () => render(<Navigation />));
    const discoverLink = screen.getAllByRole("link").find((l) => l.textContent === "Discover");
    expect(discoverLink).toHaveAttribute("aria-current", "page");
  });

  it("marks Settings as current on /settings", async () => {
    usePathname.mockReturnValue("/settings");
    await act(async () => render(<Navigation />));
    expect(screen.getByLabelText("Settings")).toHaveAttribute("aria-current", "page");
  });

  it("marks Ahadith as current on nested path", async () => {
    usePathname.mockReturnValue("/ahadith/bukhari");
    await act(async () => render(<Navigation />));
    const ahadithLink = screen.getAllByRole("link").find((l) => l.textContent === "Ahadith");
    expect(ahadithLink).toHaveAttribute("aria-current", "page");
  });

  it("home link points to /", async () => {
    await act(async () => render(<Navigation />));
    expect(screen.getByLabelText("Qalb — home")).toHaveAttribute("href", "/");
  });

  it("renders Sign in when unauthenticated", async () => {
    await act(async () => render(<Navigation />));
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
