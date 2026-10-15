"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function PlayerFinishNavigator() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const match = pathname.match(/^\/play\/(\d{6})$/);
    if (!match) return;
    const code = match[1];
    let cancelled = false;

    async function checkFinished() {
      const raw = sessionStorage.getItem(`arena-player-${code}`);
      if (!raw) return;
      try {
        const session = JSON.parse(raw) as { id: string; token: string };
        const response = await fetch(`/api/rooms/${code}?playerId=${encodeURIComponent(session.id)}`, {
          headers: { "x-player-token": session.token },
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        if (data.room?.status === "finished" && !cancelled) {
          router.replace(`/results/${code}`);
        }
      } catch {
        // The play screen already handles invalid/expired sessions.
      }
    }

    void checkFinished();
    const timer = window.setInterval(() => void checkFinished(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname, router]);

  return null;
}
