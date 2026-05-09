"use client";

import { SessionProvider } from "next-auth/react";

import LoginSuccessSplash from "@/components/LoginSuccessSplash";
import UserAppStorageSync from "@/components/UserAppStorageSync";

export default function AuthProvider({ children }) {
  return (
    <SessionProvider>
      <UserAppStorageSync />
      <LoginSuccessSplash />
      {children}
    </SessionProvider>
  );
}
