import { ArrowLeft, Footprints } from "lucide-react";
import Link from "next/link";

import UserJourneyHistory from "@/components/UserJourneyHistory";

export const metadata = {
  title: "Your journey · Qalb",
  description:
    "Key themes from reading, Discover searches, reflection prompts, and verse chats — your recent activity in one place.",
};

export default function JourneyPage() {
  return (
    <div className="pb-24 md:pb-12">
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-6 md:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-2 text-accent mb-2">
            <Footprints className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider">Your journey</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">History &amp; memory</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            A gentle record of what you have explored — key themes, discoveries, reflection prompts, and conversations
            with verses. It fills in as you finish each AI step.
          </p>
        </header>

        <UserJourneyHistory />
      </div>
    </div>
  );
}
