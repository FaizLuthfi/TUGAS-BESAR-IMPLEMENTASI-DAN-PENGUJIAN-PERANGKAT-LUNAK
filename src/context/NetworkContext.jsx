// src/context/NetworkContext.jsx
import { createContext, useCallback, useEffect, useState } from "react";
import { isNetworkFailing, setNetworkFailing } from "../services/network";

export const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const [offline, setOffline] = useState(isNetworkFailing());

  useEffect(() => {
    const sync = () => setOffline(isNetworkFailing());
    window.addEventListener("wk99:storage", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("wk99:storage", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleOffline = useCallback(() => {
    const next = !isNetworkFailing();
    setNetworkFailing(next);
    setOffline(next);
  }, []);

  const setSimulatedOffline = useCallback((v) => {
    setNetworkFailing(v);
    setOffline(!!v);
  }, []);

  return (
    <NetworkContext.Provider value={{ offline, toggleOffline, setSimulatedOffline }}>
      {children}
    </NetworkContext.Provider>
  );
}