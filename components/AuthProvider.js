"use client";

import { SessionProvider } from "next-auth/react";

import AppDayStamp from "@/components/AppDayStamp";
import LoginSuccessSplash from "@/components/LoginSuccessSplash";
import PresenceMilestones from "@/components/PresenceMilestones";
import SessionActivityPing from "@/components/SessionActivityPing";
import UserAppStorageSync from "@/components/UserAppStorageSync";

export default function AuthProvider({ children }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <AppDayStamp />
      <SessionActivityPing />
      <UserAppStorageSync />
      <LoginSuccessSplash />
      <PresenceMilestones />
      {children}
    </SessionProvider>
  );
}
