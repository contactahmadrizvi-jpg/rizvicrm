"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { enableNetwork, disableNetwork } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type NetworkStatus = "online" | "slow" | "offline";

interface NetworkContextType {
  status: NetworkStatus;
}

const NetworkContext = createContext<NetworkContextType>({ status: "online" });

// After this long without a successful reconnect, flip to "offline"
const SLOW_TO_OFFLINE_MS = 8000;

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  // Always start "online" on the server to avoid hydration mismatch.
  // Sync with the real browser state after mount in useEffect.
  const [status, setStatus] = useState<NetworkStatus>("online");
  // Timer that escalates "slow" → "offline" if we don't recover in time
  const escalateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEscalate = () => {
    if (escalateTimerRef.current) {
      clearTimeout(escalateTimerRef.current);
      escalateTimerRef.current = null;
    }
  };

  useEffect(() => {
    // Sync real browser state now that we're on the client
    if (!navigator.onLine) {
      setStatus("offline");
      disableNetwork(db).catch(() => {});
    }

    const handleOffline = () => {
      clearEscalate();
      disableNetwork(db).catch(() => {});
      setStatus("offline");
    };

    const handleOnline = () => {
      // Browser says we're back — attempt to reconnect Firestore
      enableNetwork(db).catch(() => {});
      // Show "slow" briefly while Firestore reconnects, then clear to "online"
      // The Firestore reconnect is fast on a healthy connection, so we just
      // set online immediately — the banner's own "back online" flash handles UX.
      clearEscalate();
      setStatus("online");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearEscalate();
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ status }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
