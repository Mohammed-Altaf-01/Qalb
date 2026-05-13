import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { decodeJwtSub, getStoredMobileJwt, signInWithHostedNextAuth, signOutMobile } from "../lib/mobile-auth";
import { pullAccountScopedStorageIntoDevice } from "../lib/user-app-sync";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [jwt, setJwt] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    getStoredMobileJwt()
      .then(async (t) => {
        setJwt(t);
        if (t) await pullAccountScopedStorageIntoDevice();
      })
      .finally(() => setHydrated(true));
  }, []);

  const userId = useMemo(() => (jwt ? decodeJwtSub(jwt) : null), [jwt]);

  const signIn = useCallback(async () => {
    const r = await signInWithHostedNextAuth();
    if (r.ok) {
      const t = await getStoredMobileJwt();
      setJwt(t);
      await pullAccountScopedStorageIntoDevice();
    }
    return r;
  }, []);

  const signOut = useCallback(async () => {
    await signOutMobile();
    setJwt(null);
  }, []);

  const refreshJwt = useCallback(async () => {
    setJwt(await getStoredMobileJwt());
  }, []);

  const value = useMemo(
    () => ({
      jwt,
      userId,
      hydrated,
      isSignedIn: Boolean(jwt),
      signIn,
      signOut,
      refreshJwt,
    }),
    [jwt, userId, hydrated, signIn, signOut, refreshJwt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
