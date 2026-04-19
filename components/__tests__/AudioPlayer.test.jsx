import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AudioPlayer from "../AudioPlayer";

function mockFetchAudio(url = "https://cdn.example.com/audio.mp3") {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ audioUrl: url }),
  });
}

function mockFetchError() {
  return vi.fn().mockResolvedValue({ ok: false, status: 500 });
}

describe("AudioPlayer", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom doesn't implement HTMLMediaElement.play/pause — stub them
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ── Loading state ─────────────────────────────────────────────────────────────

  it("shows loading indicator while fetching audio URL", async () => {
    let resolveFetch;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((res) => (resolveFetch = res))));
    render(<AudioPlayer verseKey="2:255" />);
    expect(screen.getByText(/Loading recitation/i)).toBeInTheDocument();
    // resolve to avoid async warning
    resolveFetch({ ok: true, json: async () => ({ audioUrl: "https://test.mp3" }) });
  });

  it("hides loading indicator after URL is fetched", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => expect(screen.queryByText(/Loading recitation/i)).not.toBeInTheDocument());
  });

  // ── Error state ───────────────────────────────────────────────────────────────

  it("shows error message when audio URL fetch fails", async () => {
    vi.stubGlobal("fetch", mockFetchError());
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => expect(screen.getByText(/Audio unavailable for this verse/i)).toBeInTheDocument());
  });

  it("shows error when API returns no audioUrl in response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ audioUrl: null }) }));
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => expect(screen.getByText(/Audio unavailable for this verse/i)).toBeInTheDocument());
  });

  // ── Ready state — player controls ────────────────────────────────────────────

  it("renders Play button when audio is ready", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => expect(screen.getByLabelText("Play")).toBeInTheDocument());
  });

  it("renders Restart button when audio is ready", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => expect(screen.getByLabelText("Restart")).toBeInTheDocument());
  });

  it("renders time display (0:00 / 0:00) initially", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => expect(screen.getByText("0:00 / 0:00")).toBeInTheDocument());
  });

  it("renders speed button showing 1× by default", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => expect(screen.getByLabelText("Speed 1x")).toBeInTheDocument());
  });

  it("cycles speed on speed button click", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    const user = userEvent.setup();
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => screen.getByLabelText("Speed 1x"));
    await user.click(screen.getByLabelText("Speed 1x"));
    expect(screen.getByLabelText("Speed 1.25x")).toBeInTheDocument();
  });

  it("shows Pause button after clicking Play", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    const user = userEvent.setup();
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => screen.getByLabelText("Play"));
    await user.click(screen.getByLabelText("Play"));
    expect(screen.getByLabelText("Pause")).toBeInTheDocument();
  });

  it("shows Play button again after clicking Pause", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    const user = userEvent.setup();
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => screen.getByLabelText("Play"));
    await user.click(screen.getByLabelText("Play"));
    await user.click(screen.getByLabelText("Pause"));
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
  });

  // ── Reciter picker ────────────────────────────────────────────────────────────

  it("shows current reciter name", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => expect(screen.getByText("Mishari Alafasy")).toBeInTheDocument());
  });

  it("opens reciter picker on reciter button click", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    const user = userEvent.setup();
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => screen.getByLabelText("Change reciter"));
    await user.click(screen.getByLabelText("Change reciter"));
    expect(screen.getByText("Abdul Rahman Al-Sudais")).toBeInTheDocument();
  });

  it("closes reciter picker after selecting a reciter", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    const user = userEvent.setup();
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => screen.getByLabelText("Change reciter"));
    await user.click(screen.getByLabelText("Change reciter"));
    await user.click(screen.getByText("Abdul Rahman Al-Sudais"));
    expect(screen.queryByText("Mahmoud Al-Husary")).not.toBeInTheDocument();
  });

  it("persists selected reciter to localStorage", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    const user = userEvent.setup();
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => screen.getByLabelText("Change reciter"));
    await user.click(screen.getByLabelText("Change reciter"));
    await user.click(screen.getByText("Abdul Rahman Al-Sudais"));
    expect(localStorage.getItem("qalb_reciter_id")).toBe("3");
  });

  it("loads saved reciter from localStorage on mount", async () => {
    localStorage.setItem("qalb_reciter_id", "3"); // Abdul Rahman Al-Sudais
    vi.stubGlobal("fetch", mockFetchAudio());
    await act(async () => render(<AudioPlayer verseKey="2:255" />));
    await waitFor(() => expect(screen.getByText("Abdul Rahman Al-Sudais")).toBeInTheDocument());
  });

  // ── Region accessibility ──────────────────────────────────────────────────────

  it("wraps player in a region with accessible label", async () => {
    vi.stubGlobal("fetch", mockFetchAudio());
    render(<AudioPlayer verseKey="2:255" />);
    expect(screen.getByRole("region", { name: /Verse audio player/i })).toBeInTheDocument();
  });
});
