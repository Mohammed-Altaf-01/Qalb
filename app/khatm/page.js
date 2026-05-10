import KhatmClient from "./KhatmClient";

export const metadata = {
  title: "Khatm Tracker — Qalb",
  description: "Track progress across all 604 mushaf pages on this device.",
};

export default function KhatmPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 md:px-8 py-8">
      <h1 className="text-xl font-bold text-foreground mb-1">Khatm tracker</h1>
      <p className="text-xs text-muted-foreground mb-6">Local checklist — complements your Quran Foundation activity log.</p>
      <KhatmClient />
    </div>
  );
}
