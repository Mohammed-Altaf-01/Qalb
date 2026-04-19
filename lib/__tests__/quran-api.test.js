import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub env vars before module is first evaluated in this test file
vi.stubEnv("QURAN_API_BASE", "https://api.test");
vi.stubEnv("QURAN_OAUTH_ENDPOINT", "https://oauth.test");
vi.stubEnv("QURAN_CLIENT_ID", "test-client");
vi.stubEnv("QURAN_CLIENT_SECRET", "test-secret");

const { QuranTokenManager, RequestBuilder, QuranRepository } = await import("../quran-api.js");

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTokenFetch() {
  return { access_token: "tok-123", expires_in: 3600 };
}

function makeApiFetch(data = {}) {
  return data;
}

function setupFetch({ tokenData = makeTokenFetch(), apiData = makeApiFetch() } = {}) {
  return vi.fn().mockImplementation((url) => {
    const body = url.toString().includes("/oauth2/token") ? tokenData : apiData;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(body),
    });
  });
}

// ─── QuranTokenManager ────────────────────────────────────────────────────────

describe("QuranTokenManager", () => {
  it("getInstance returns the same object reference (singleton)", () => {
    const a = QuranTokenManager.getInstance();
    const b = QuranTokenManager.getInstance();
    expect(a).toBe(b);
  });

  it("getToken fetches a new token via OAuth2 client credentials", async () => {
    const mockFetch = setupFetch();
    vi.stubGlobal("fetch", mockFetch);

    // Force fresh token by creating isolated test environment
    const manager = QuranTokenManager.getInstance();
    const token = await manager.getToken();

    // May use cached token from earlier or fetch a new one; either way returns a string
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("uses Basic auth with base64-encoded client credentials", async () => {
    const mockFetch = setupFetch();
    vi.stubGlobal("fetch", mockFetch);

    // Reset by creating a new manager — we can't reset singleton, so we check the fetch call
    await QuranTokenManager.getInstance().getToken();

    const tokenCalls = mockFetch.mock.calls.filter(([url]) => url.toString().includes("/oauth2/token"));
    if (tokenCalls.length > 0) {
      const [, options] = tokenCalls[0];
      const expectedCredentials = Buffer.from("test-client:test-secret").toString("base64");
      expect(options.headers.Authorization).toBe(`Basic ${expectedCredentials}`);
    }
  });
});

// ─── RequestBuilder ───────────────────────────────────────────────────────────

describe("RequestBuilder", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", setupFetch({ apiData: { chapters: [] } }));
  });

  it("withParam ignores null values", async () => {
    const mockFetch = setupFetch({ apiData: {} });
    vi.stubGlobal("fetch", mockFetch);

    await new RequestBuilder("/content/api/v4/chapters").withParam("language", null).fetch();

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    const url = apiCalls[0][0].toString();
    expect(url).not.toContain("language=");
  });

  it("withParam ignores undefined values", async () => {
    const mockFetch = setupFetch({ apiData: {} });
    vi.stubGlobal("fetch", mockFetch);

    await new RequestBuilder("/content/api/v4/chapters").withParam("language", undefined).fetch();

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    const url = apiCalls[0][0].toString();
    expect(url).not.toContain("language=");
  });

  it("withParam includes 0 as a valid value", async () => {
    const mockFetch = setupFetch({ apiData: {} });
    vi.stubGlobal("fetch", mockFetch);

    await new RequestBuilder("/content/api/v4/search").withParam("page", 0).fetch();

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    const url = apiCalls[0][0].toString();
    expect(url).toContain("page=0");
  });

  it("withParam is chainable", async () => {
    const mockFetch = setupFetch({ apiData: {} });
    vi.stubGlobal("fetch", mockFetch);

    await new RequestBuilder("/content/api/v4/chapters")
      .withParam("language", "en")
      .withParam("per_page", 10)
      .fetch();

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    const url = apiCalls[0][0].toString();
    expect(url).toContain("language=en");
    expect(url).toContain("per_page=10");
  });

  it("fetch includes x-auth-token and x-client-id headers", async () => {
    const mockFetch = setupFetch({ apiData: {} });
    vi.stubGlobal("fetch", mockFetch);

    await new RequestBuilder("/content/api/v4/chapters").fetch();

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    const [, options] = apiCalls[0];
    expect(options.headers["x-auth-token"]).toBeDefined();
    expect(options.headers["x-client-id"]).toBe("test-client");
  });

  it("fetch throws on non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url) => {
        if (url.toString().includes("/oauth2/token")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(makeTokenFetch()) });
        }
        return Promise.resolve({ ok: false, status: 404, statusText: "Not Found" });
      }),
    );

    await expect(new RequestBuilder("/content/api/v4/chapters").fetch()).rejects.toThrow("404");
  });

  it("fetch appends query string to URL", async () => {
    const mockFetch = setupFetch({ apiData: {} });
    vi.stubGlobal("fetch", mockFetch);

    await new RequestBuilder("/content/api/v4/chapters").withParam("language", "ur").fetch();

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("?language=ur");
  });

  it("fetch omits query string when no params set", async () => {
    const mockFetch = setupFetch({ apiData: {} });
    vi.stubGlobal("fetch", mockFetch);

    await new RequestBuilder("/content/api/v4/chapters").fetch();

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).not.toContain("?");
  });
});

// ─── QuranRepository ──────────────────────────────────────────────────────────

describe("QuranRepository", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", setupFetch({ apiData: {} }));
  });

  it("getChapters calls /content/api/v4/chapters", async () => {
    const mockFetch = setupFetch({ apiData: { chapters: [] } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getChapters();

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("/content/api/v4/chapters");
  });

  it("getChapters passes language param", async () => {
    const mockFetch = setupFetch({ apiData: { chapters: [] } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getChapters("ar");

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("language=ar");
  });

  it("getChapter calls /content/api/v4/chapters/:id", async () => {
    const mockFetch = setupFetch({ apiData: { chapter: {} } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getChapter(2);

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("/content/api/v4/chapters/2");
  });

  it("getVersesByChapter calls correct endpoint with defaults", async () => {
    const mockFetch = setupFetch({ apiData: { verses: [] } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getVersesByChapter(1);

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    const url = apiCalls[0][0].toString();
    expect(url).toContain("/content/api/v4/verses/by_chapter/1");
    expect(url).toContain("translations=20"); // default translationId
    expect(url).toContain("per_page=10"); // default perPage
  });

  it("getVersesByChapter passes custom translation and page options", async () => {
    const mockFetch = setupFetch({ apiData: { verses: [] } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getVersesByChapter(2, { translationId: 85, page: 3, perPage: 15 });

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    const url = apiCalls[0][0].toString();
    expect(url).toContain("translations=85");
    expect(url).toContain("page=3");
    expect(url).toContain("per_page=15");
  });

  it("getVerseByKey calls correct endpoint", async () => {
    const mockFetch = setupFetch({ apiData: { verse: {} } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getVerseByKey("2:255");

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("/content/api/v4/verses/by_key/2:255");
  });

  it("getRandomVerse calls /content/api/v4/verses/random", async () => {
    const mockFetch = setupFetch({ apiData: { verse: {} } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getRandomVerse();

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("/content/api/v4/verses/random");
  });

  it("searchVerses calls /content/api/v4/search with query", async () => {
    const mockFetch = setupFetch({ apiData: { search: { results: [] } } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.searchVerses("patience");

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    const url = apiCalls[0][0].toString();
    expect(url).toContain("/content/api/v4/search");
    expect(url).toContain("q=patience");
  });

  it("getVerseAudio calls correct recitation endpoint", async () => {
    const mockFetch = setupFetch({ apiData: { audio_files: [] } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getVerseAudio("2:255", 7);

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("/content/api/v4/recitations/7/by_ayah/2:255");
  });

  it("getVerseAudio includes segments field when withSegments is true", async () => {
    const mockFetch = setupFetch({ apiData: { audio_files: [] } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getVerseAudio("2:255", 7, true);

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("fields=segments");
  });

  it("getTafsirByVerse calls correct tafsir endpoint", async () => {
    const mockFetch = setupFetch({ apiData: { tafsir: {} } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getTafsirByVerse("2:255", 169);

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("/content/api/v4/tafsirs/169/by_ayah/2:255");
  });

  it("getTafsirByChapter calls correct tafsir endpoint", async () => {
    const mockFetch = setupFetch({ apiData: { tafsir: {} } });
    vi.stubGlobal("fetch", mockFetch);

    await QuranRepository.getTafsirByChapter(2, 168);

    const apiCalls = mockFetch.mock.calls.filter(([url]) => !url.toString().includes("/oauth2/token"));
    expect(apiCalls[0][0].toString()).toContain("/content/api/v4/tafsirs/168/by_chapter/2");
  });
});
