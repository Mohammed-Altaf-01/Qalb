import LiveClient from "./LiveClient";

export const metadata = {
  title: "Live — Qalb",
  description: "Watch Makkah and Madinah live streams directly inside Qalb.",
};

export default async function LivePage() {
  let channels = [];
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/live/tv?language=eng`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      channels = Array.isArray(data?.channels) ? data.channels : [];
    }
  } catch {}

  if (channels.length === 0) {
    channels = [
      { id: 3, name: "Quran channel (Makkah)", url: "https://win.holol.com/live/quran/playlist.m3u8" },
      { id: 4, name: "Sunna channel (Madinah)", url: "https://win.holol.com/live/sunnah/playlist.m3u8" },
    ];
  }

  return <LiveClient channels={channels} />;
}
