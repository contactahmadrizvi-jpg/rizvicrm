"use client";

import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useNetwork } from "@/context/NetworkContext";

export function NetworkBanner() {
  const { status } = useNetwork();
  const [showRecovered, setShowRecovered] = useState(false);
  const prevRef = useRef(status);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = status;
    if (prev !== "online" && status === "online") {
      setShowRecovered(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowRecovered(false), 3000);
    }
    if (status !== "online") {
      setShowRecovered(false);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }
  }, [status]);

  if (status === "offline") {
    return (
      <div className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 bg-[#c0392b] text-white text-xs font-medium tracking-wide">
        <WifiOff size={13} className="shrink-0" />
        No internet — working offline. Changes sync when reconnected.
      </div>
    );
  }

  if (showRecovered) {
    return (
      <div className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 bg-[#1a7f5a] text-white text-xs font-medium tracking-wide animate-fade-in">
        <Wifi size={13} className="shrink-0" />
        Back online.
      </div>
    );
  }

  return null;
}
