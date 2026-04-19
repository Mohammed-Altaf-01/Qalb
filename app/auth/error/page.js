"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES = {
  Configuration:  "There is a problem with the server configuration.",
  AccessDenied:   "You do not have permission to sign in.",
  Verification:   "The sign-in link is no longer valid.",
  OAuthCallback:  "There was a problem during sign-in. Please try again.",
  Default:        "An unexpected error occurred during sign-in.",
};

export default function AuthErrorPage() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Default";
  const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="text-5xl">😔</div>
        <h1 className="text-2xl font-bold text-foreground">Sign-in Error</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/auth/signin">Try Again</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Continue as Guest</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
