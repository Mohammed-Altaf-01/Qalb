import { describe, expect, it } from "vitest";

import {
  deriveListenServerFromStreamUrl,
  findListenReciter,
  getPlayableListenSurahs,
} from "../listen-reciters";

const reciters = [
  { id: 1, name: "Reciter A", server: "https://cdn.example/a/", surahIds: [1, 2, 56] },
  { id: 2, name: "Reciter B", server: "https://cdn.example/b/", surahIds: [1, 3] },
];

const chapters = [
  { id: 1, name_simple: "Al-Fatihah" },
  { id: 2, name_simple: "Al-Baqarah" },
  { id: 56, name_simple: "Al-Waqi'ah" },
];

describe("deriveListenServerFromStreamUrl", () => {
  it("strips surah filename from mp3 url", () => {
    expect(deriveListenServerFromStreamUrl("https://cdn.example/a/056.mp3")).toBe("https://cdn.example/a/");
  });
});

describe("findListenReciter", () => {
  it("finds by reciter id", () => {
    expect(findListenReciter(reciters, { reciterId: 2 })?.name).toBe("Reciter B");
  });

  it("finds by stream url server", () => {
    expect(findListenReciter(reciters, { streamUrl: "https://cdn.example/a/019.mp3" })?.id).toBe(1);
  });
});

describe("getPlayableListenSurahs", () => {
  it("filters chapters by reciter surah list", () => {
    const list = getPlayableListenSurahs(chapters, reciters[0]);
    expect(list.map((c) => c.id)).toEqual([1, 2, 56]);
  });
});
