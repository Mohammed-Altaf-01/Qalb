import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import AudioPlayer from "../src/components/AudioPlayer";

// Stable player reference shared between mock and tests
jest.mock("expo-audio", () => {
  const player = {
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    replace: jest.fn(),
  };
  return {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    useAudioPlayer: jest.fn(() => player),
    useAudioPlayerStatus: jest.fn(() => ({
      playing: false,
      currentTime: 0,
      duration: 120,
      didJustFinish: false,
    })),
  };
});

jest.mock("../src/lib/quran-api", () => ({
  QuranRepository: {
    getVerseAudio: jest.fn().mockResolvedValue({
      audioUrl: "https://verses.quran.com/audio/001_001.mp3",
    }),
  },
}));

jest.mock("../src/lib/storage", () => ({
  __esModule: true,
  default: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
  STORAGE_KEYS: { RECITER_ID: "qalb_reciter_id" },
}));

function getMocks() {
  const { useAudioPlayer, useAudioPlayerStatus } = require("expo-audio");
  return { player: useAudioPlayer(), useAudioPlayerStatus };
}

beforeEach(() => {
  const { useAudioPlayerStatus } = require("expo-audio");
  useAudioPlayerStatus.mockReturnValue({
    playing: false,
    currentTime: 0,
    duration: 120,
    didJustFinish: false,
  });
  jest.clearAllMocks();
  // Re-apply resolved value cleared by clearAllMocks
  const { setAudioModeAsync } = require("expo-audio");
  setAudioModeAsync.mockResolvedValue(undefined);
  const { QuranRepository } = require("../src/lib/quran-api");
  QuranRepository.getVerseAudio.mockResolvedValue({
    audioUrl: "https://verses.quran.com/audio/001_001.mp3",
  });
  const storage = require("../src/lib/storage").default;
  storage.get.mockResolvedValue(null);
});

describe("AudioPlayer", () => {
  it("shows loading state initially", () => {
    const { getByText } = render(<AudioPlayer verseKey="1:1" />);
    expect(getByText("Loading recitation…")).toBeTruthy();
  });

  it("shows play button after audio loads", async () => {
    const { getByText } = render(<AudioPlayer verseKey="1:1" />);
    await waitFor(() => expect(getByText("▶")).toBeTruthy());
  });

  it("calls player.play() when play button is pressed", async () => {
    const { player } = getMocks();
    const { getByText } = render(<AudioPlayer verseKey="1:1" />);
    await waitFor(() => getByText("▶"));
    await act(async () => {
      fireEvent.press(getByText("▶"));
    });
    expect(player.play).toHaveBeenCalled();
  });

  it("shows pause icon when status is playing", async () => {
    const { useAudioPlayerStatus } = getMocks();
    useAudioPlayerStatus.mockReturnValue({
      playing: true,
      currentTime: 10,
      duration: 120,
      didJustFinish: false,
    });
    const { getByText } = render(<AudioPlayer verseKey="1:1" />);
    await waitFor(() => expect(getByText("⏸")).toBeTruthy());
  });

  it("shows reciter picker when reciter row is tapped", async () => {
    const { getByText } = render(<AudioPlayer verseKey="1:1" />);
    await waitFor(() => getByText("▶"));
    await act(async () => {
      fireEvent.press(getByText("Mishari Alafasy ▾"));
    });
    expect(getByText("Abdul Rahman Al-Sudais")).toBeTruthy();
  });

  it("shows error state when no audio URL is found", async () => {
    const { QuranRepository } = require("../src/lib/quran-api");
    QuranRepository.getVerseAudio.mockResolvedValue({});
    const { getByText } = render(<AudioPlayer verseKey="1:1" />);
    await waitFor(() => expect(getByText("Audio unavailable for this verse.")).toBeTruthy());
  });
});
