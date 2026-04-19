"use client";

import { useEffect, useState } from "react";

import { BookOpen, Flame, Sparkles, Star, Trophy } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Flame, text: "Track your reading streak across all devices" },
  { icon: BookOpen, text: "Sync bookmarks, notes & reflections" },
  { icon: Trophy, text: "Earn XP, badges & level up your knowledge" },
  { icon: Sparkles, text: "Unlock exclusive daily challenges" },
  { icon: Star, text: "Your Quran journey, always with you" },
];

export default function SignInPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const error = params.get("error");

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  async function handleSignIn() {
    setLoading(true);
    await signIn("quranfoundation", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-5xl mb-4">🕌</div>
          <h1 className="text-3xl font-bold text-gradient-gold">Welcome to Qalb</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sign in with your Quran Foundation account to unlock your full
            <br />
            Quran journey — across every device, every session.
          </p>
        </div>

        {/* Features */}
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-4">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-accent" />
              </div>
              <span className="text-sm text-foreground/80">{text}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
            {error === "OAuthCallback"
              ? "Sign-in was cancelled. Please try again."
              : `Sign-in error: ${error}. Please try again.`}
          </div>
        )}

        {/* Sign-in button */}
        <Button
          onClick={handleSignIn}
          disabled={loading || status === "loading"}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Redirecting…
            </span>
          ) : (
            "Sign in with Quran Foundation"
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground/60 leading-relaxed">
          Don&apos;t have an account?{" "}
          <a
            href="https://quran.com/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-2 hover:text-accent/80"
          >
            Register at Quran.com
          </a>{" "}
          — then come back and sign in.
        </p>

        <p className="text-center text-xs text-muted-foreground/40">
          Continue without signing in to use Qalb in guest mode.
          <br />
          Your progress will be saved locally on this device.
        </p>
        <div className="text-center">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 transition-colors"
          >
            Continue as guest →
          </button>
        </div>
      </div>
    </div>
  );
}
