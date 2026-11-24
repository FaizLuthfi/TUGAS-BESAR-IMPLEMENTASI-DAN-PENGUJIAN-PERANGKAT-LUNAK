// src/hooks/useNetwork.js
import { useContext } from "react";
import { NetworkContext } from "../context/NetworkContext";

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork harus dipakai di dalam NetworkProvider");
  return ctx;
}