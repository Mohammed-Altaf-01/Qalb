import HifzClient from "./HifzClient";

export const metadata = {
  title: "Hifz practice — Qalb",
  description: "Spaced repetition cues for verses you’re memorizing (local to this browser).",
};

export default function HifzPage() {
  return (
    <div className="mx-auto max-w-xl px-4 md:px-8 py-8 space-y-2">
      <h1 className="text-xl font-bold text-foreground">Hifz desk</h1>
      <p className="text-xs text-muted-foreground mb-4">
        SM-2 style scheduling persists in <code className="text-[10px]">qalb_hifz_progress_v1</code>.
      </p>
      <HifzClient />
    </div>
  );
}
