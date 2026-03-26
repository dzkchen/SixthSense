"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useSoundStream } from "@/hooks/useSoundStream";
import type {
  ConnectionStatus,
  DirectionalMagnitudes,
} from "@/types/sound";

type SoundContextValue = {
  magnitudes: DirectionalMagnitudes;
  connectionStatus: ConnectionStatus;
  totalIntensity: number;
};

const SoundContext = createContext<SoundContextValue | null>(null);

/** Provides shared live magnitude state to the radar surface and shell UI. */
export function SoundProvider({ children }: { children: ReactNode }) {
  const soundStream = useSoundStream();

  const value = useMemo<SoundContextValue>(
    () => soundStream,
    [soundStream],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSoundContext() {
  const context = useContext(SoundContext);

  if (!context) {
    throw new Error("useSoundContext must be used within SoundProvider.");
  }

  return context;
}
