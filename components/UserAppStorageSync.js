"use client";

import { useEffect, useRef } from "react";

import { useSession } from "next-auth/react";

import { pullAccountScopedStorageIntoBrowser } from "@/lib/user-app-sync-bridge";

/**
 * On successful NextAuth login, merges Supabase app_user_storage (keyed by user id) into localStorage,
 * then dispatches ACCOUNT_STORAGE_SYNCED_EVENT so lists (Home, etc.) re-read persisted history.
 */
export default function UserAppStorageSync() {
  const { data: session, status } = useSession();
  const pulledForUserRef = useRef(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated" || !session?.user?.id) {
      pulledForUserRef.current = null;
      return;
    }

    const uid = session.user.id;
    if (pulledForUserRef.current === uid) return;
    pulledForUserRef.current = uid;

    void pullAccountScopedStorageIntoBrowser();
  }, [session?.user?.id, status]);

  return null;
}
