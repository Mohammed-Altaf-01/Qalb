"use client";

import { useEffect, useRef, useState } from "react";

import { useSession } from "next-auth/react";

const KEYFRAME_CSS = `
  @keyframes qalb-login-fade-in {
    0% { opacity: 0; transform: translateY(6px) scale(0.98); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes qalb-login-fade-out {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-12px); }
  }
`;

export default function LoginSuccessSplash() {
  const { data: session, status } = useSession();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const prevStatus = useRef(status);

  useEffect(() => {
    const justLoggedIn = prevStatus.current !== "authenticated" && status === "authenticated" && session?.user?.id;
    prevStatus.current = status;
    if (!justLoggedIn) return;

    setVisible(true);
    setLeaving(false);

    const leaveTimer = setTimeout(() => setLeaving(true), 1900);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      setLeaving(false);
    }, 2500);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [session?.user?.id, status]);

  if (!visible) return null;

  const firstName = session?.user?.firstName?.trim?.() || "";
  const lastName = session?.user?.lastName?.trim?.() || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const displayName = (fullName || session?.user?.name || "Friend").trim();

  return (
    <>
      <style>{KEYFRAME_CSS}</style>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at center, rgba(200,169,81,0.12) 0%, rgba(0,0,0,0.35) 52%, rgba(0,0,0,0.6) 100%)",
          animation: leaving ? "qalb-login-fade-out 0.55s ease forwards" : "qalb-login-fade-in 0.5s ease both",
        }}
      >
        <div
          className="rounded-2xl border border-accent/35 bg-card/92 px-6 py-5 shadow-2xl text-center"
          style={{ backdropFilter: "blur(4px)" }}
        >
          <p className="arabic-text arabic-text-display text-gradient-gold text-center leading-[1.8]">مرحبا {displayName}</p>
        </div>
      </div>
    </>
  );
}
