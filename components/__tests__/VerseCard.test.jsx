import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// AudioPlayer makes fetch calls — stub it out for VerseCard tests
vi.mock("../AudioPlayer", () => ({
  default: ({ verseKey }) => <div data-testid="audio-player" data-verse={verseKey} />,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";
import VerseCard from "../VerseCard";

const mockVerse = {
  verse_key: "2:255",
  verse_number: 255,
  chapter_id: 2,
  text_uthmani: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ",
  translations: [{ text: "Allah — there is no deity except Him, the Ever-Living, the Sustainer" }],
};

describe("VerseCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  // ── Rendering ────────────────────────────────────────────────────────────────

  it("renders null when no verse is passed", () => {
    const { container } = render(<VerseCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the Arabic text", () => {
    render(<VerseCard verse={mockVerse} />);
    expect(screen.getByText(mockVerse.text_uthmani)).toBeInTheDocument();
  });

  it("renders the translation text", () => {
    render(<VerseCard verse={mockVerse} />);
    expect(screen.getByText(/Allah — there is no deity except Him/)).toBeInTheDocument();
  });

  it("strips HTML tags from translation", () => {
    const verse = {
      ...mockVerse,
      translations: [{ text: "<em>Allah</em> is the Light of the heavens" }],
    };
    render(<VerseCard verse={verse} />);
    expect(screen.getByText("Allah is the Light of the heavens")).toBeInTheDocument();
  });

  it("renders chapter name and verse number when chapterName is provided", () => {
    render(<VerseCard verse={mockVerse} chapterName="Al-Baqarah" />);
    expect(screen.getByText("Al-Baqarah · 255")).toBeInTheDocument();
  });

  it("renders verse key when no chapterName", () => {
    render(<VerseCard verse={mockVerse} />);
    expect(screen.getByText("2:255")).toBeInTheDocument();
  });

  it("renders the theme badge when theme is provided", () => {
    render(<VerseCard verse={mockVerse} theme="Tawakkul" />);
    expect(screen.getByText("Tawakkul")).toBeInTheDocument();
  });

  it("does not render theme badge when theme is absent", () => {
    render(<VerseCard verse={mockVerse} />);
    expect(screen.queryByText(/Tawakkul/)).not.toBeInTheDocument();
  });

  it("renders AI explanation when aiExplanation is provided", () => {
    render(<VerseCard verse={mockVerse} aiExplanation="This verse speaks to trust in Allah." />);
    expect(screen.getByText("This verse speaks to trust in Allah.")).toBeInTheDocument();
  });

  it("does not render AI explanation section when absent", () => {
    render(<VerseCard verse={mockVerse} />);
    expect(screen.queryByText(/speaks to trust/)).not.toBeInTheDocument();
  });

  it("renders 'Reflect on this verse' link pointing to /verse/:key", () => {
    render(<VerseCard verse={mockVerse} />);
    const link = screen.getByText(/Reflect on this verse/);
    expect(link.closest("a")).toHaveAttribute("href", "/verse/2:255");
  });

  it("has accessible article label with verse key", () => {
    render(<VerseCard verse={mockVerse} />);
    expect(screen.getByRole("article", { name: /Verse 2:255/ })).toBeInTheDocument();
  });

  // ── Audio Player toggle ───────────────────────────────────────────────────────

  it("does not show audio player initially", () => {
    render(<VerseCard verse={mockVerse} />);
    expect(screen.queryByTestId("audio-player")).not.toBeInTheDocument();
  });

  it("shows audio player after clicking the audio toggle button", async () => {
    const user = userEvent.setup();
    render(<VerseCard verse={mockVerse} />);
    await user.click(screen.getByLabelText("Play verse recitation"));
    expect(screen.getByTestId("audio-player")).toBeInTheDocument();
  });

  it("hides audio player after second click on audio toggle", async () => {
    const user = userEvent.setup();
    render(<VerseCard verse={mockVerse} />);
    await user.click(screen.getByLabelText("Play verse recitation"));
    await user.click(screen.getByLabelText("Hide audio player"));
    expect(screen.queryByTestId("audio-player")).not.toBeInTheDocument();
  });

  // ── Bookmark ─────────────────────────────────────────────────────────────────

  it("does not render bookmark button when userToken is absent", () => {
    render(<VerseCard verse={mockVerse} />);
    expect(screen.queryByLabelText(/Bookmark/)).not.toBeInTheDocument();
  });

  it("renders bookmark button when userToken is provided", () => {
    render(<VerseCard verse={mockVerse} userToken="tok-abc" />);
    expect(screen.getByLabelText("Bookmark this verse")).toBeInTheDocument();
  });

  it("shows 'Remove bookmark' label when initialBookmarked is true", () => {
    render(<VerseCard verse={mockVerse} userToken="tok-abc" initialBookmarked={true} />);
    expect(screen.getByLabelText("Remove bookmark")).toBeInTheDocument();
  });

  it("optimistically toggles to bookmarked on click and shows success toast", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const user = userEvent.setup();
    render(<VerseCard verse={mockVerse} userToken="tok-abc" />);

    await user.click(screen.getByLabelText("Bookmark this verse"));

    await waitFor(() => expect(screen.getByLabelText("Remove bookmark")).toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Verse bookmarked");
  });

  it("rolls back bookmark state and shows error toast on API failure", async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    const user = userEvent.setup();
    render(<VerseCard verse={mockVerse} userToken="tok-abc" />);

    await user.click(screen.getByLabelText("Bookmark this verse"));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByLabelText("Bookmark this verse")).toBeInTheDocument();
  });

  it("sends DELETE when removing an existing bookmark", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const user = userEvent.setup();
    render(<VerseCard verse={mockVerse} userToken="tok-abc" initialBookmarked={true} />);

    await user.click(screen.getByLabelText("Remove bookmark"));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/user/bookmark", expect.objectContaining({ method: "DELETE" })));
    expect(toast.success).toHaveBeenCalledWith("Bookmark removed");
  });

  // ── Tafsir ────────────────────────────────────────────────────────────────────

  it("does not render tafsir section when tafsirText is absent", () => {
    render(<VerseCard verse={mockVerse} />);
    expect(screen.queryByText(/Show tafsir/)).not.toBeInTheDocument();
  });

  it("renders 'Show tafsir' toggle when tafsirText is provided", () => {
    render(<VerseCard verse={mockVerse} tafsirText="Ibn Kathir says: This is Ayat al-Kursi." />);
    expect(screen.getByText(/Show tafsir/)).toBeInTheDocument();
  });

  it("expands tafsir on toggle click and shows content", async () => {
    const user = userEvent.setup();
    render(<VerseCard verse={mockVerse} tafsirText="Ibn Kathir says: <b>This</b> is Ayat al-Kursi." />);
    await user.click(screen.getByText(/Show tafsir/));
    expect(screen.getByText(/Ibn Kathir says: This is Ayat al-Kursi\./)).toBeInTheDocument();
  });

  it("strips HTML from tafsir content when expanded", async () => {
    const user = userEvent.setup();
    render(<VerseCard verse={mockVerse} tafsirText="<b>Bold</b> tafsir text" />);
    await user.click(screen.getByText(/Show tafsir/));
    expect(screen.getByText(/Bold tafsir text/)).toBeInTheDocument();
    expect(screen.queryByText(/<b>/)).not.toBeInTheDocument();
  });

  it("collapses tafsir on second click", async () => {
    const user = userEvent.setup();
    render(<VerseCard verse={mockVerse} tafsirText="Ibn Kathir text here." />);
    await user.click(screen.getByText(/Show tafsir/));
    await user.click(screen.getByText(/Hide tafsir/));
    expect(screen.queryByText("Ibn Kathir text here.")).not.toBeInTheDocument();
  });

  it("toggle button has aria-expanded=false initially", () => {
    render(<VerseCard verse={mockVerse} tafsirText="Some tafsir." />);
    const btn = screen.getByRole("button", { name: /Show tafsir/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("toggle button has aria-expanded=true after expansion", async () => {
    const user = userEvent.setup();
    render(<VerseCard verse={mockVerse} tafsirText="Some tafsir." />);
    await user.click(screen.getByRole("button", { name: /Show tafsir/ }));
    expect(screen.getByRole("button", { name: /Hide tafsir/ })).toHaveAttribute("aria-expanded", "true");
  });
});
