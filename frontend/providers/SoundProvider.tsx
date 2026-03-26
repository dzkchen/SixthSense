"use client";

import {
    createContext,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import { useSoundStream } from "@/hooks/useSoundStream";
import type { ConnectionStatus, SoundEvent } from "@/types/sound";

type SoundContextValue = {
    sounds: SoundEvent[];
    history: SoundEvent[];
    connectionStatus: ConnectionStatus;
    totalIntensity: number;
    websocketUrl: string;
    isPaused: boolean;
    setIsPaused: (value: boolean) => void;
    triggerManualDirection: (direction: number) => void;
    isDemoMode: boolean;
    setIsDemoMode: (value: boolean) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

/** Provides shared sound state so radar and history stay in sync across routes. */
export function SoundProvider({ children }: { children: ReactNode }) {
    const [isPaused, setIsPaused] = useState(false);
    const soundStream = useSoundStream({ isPaused });

    const value = useMemo<SoundContextValue>(
        () => ({
            ...soundStream,
            isPaused,
            setIsPaused,
        }),
        [isPaused, soundStream],
    );

    return (
        <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
    );
}

export function useSoundContext() {
    const context = useContext(SoundContext);

    if (!context) {
        throw new Error("useSoundContext must be used within SoundProvider.");
    }

    return context;
}
