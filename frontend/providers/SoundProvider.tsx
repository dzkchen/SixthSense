"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useSoundStream } from "@/hooks/useSoundStream";
import type { ConnectionStatus, SoundEvent } from "@/types/sound";

type SoundContextValue = {
  sounds: SoundEvent[];
  history: SoundEvent[];
  connectionStatus: ConnectionStatus;
  totalIntensity: number;
  startManualDirection: (direction: number) => void;
  stopManualDirection: (direction: number) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

/** Provides shared sound state so radar and history stay in sync across routes. */
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
