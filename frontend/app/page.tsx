"use client";

import { MotionConfig } from "framer-motion";
import { useState } from "react";

import { LegendBar } from "@/components/LegendBar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { RadarCanvas } from "@/components/RadarCanvas";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { TopBar } from "@/components/TopBar";
import { useStoredBoolean } from "@/hooks/useStoredBoolean";
import { useSystemReducedMotion } from "@/hooks/useSystemReducedMotion";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { useSoundContext } from "@/providers/SoundProvider";

const DIRECTION_BUTTONS = [
  {
    direction: 0,
    label: "Forward",
    positionClassName: "left-1/2 top-5 -translate-x-1/2",
  },
  {
    direction: 90,
    label: "Right",
    positionClassName: "right-5 top-1/2 -translate-y-1/2",
  },
  {
    direction: 180,
    label: "Behind",
    positionClassName: "bottom-5 left-1/2 -translate-x-1/2",
  },
  {
    direction: 270,
    label: "Left",
    positionClassName: "left-5 top-1/2 -translate-y-1/2",
  },
] as const;

/** Renders the live radar workspace with pause, settings, and onboarding overlays. */
export default function HomePage() {
  const {
    connectionStatus,
    isPaused,
    setIsPaused,
    sounds,
    totalIntensity,
    websocketUrl,
    triggerManualDirection,
  } = useSoundContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasOnboarded, setHasOnboarded, onboardingReady] = useStoredBoolean(
    STORAGE_KEYS.onboarded,
    false,
  );
  const [storedReduceMotion, setStoredReduceMotion] = useStoredBoolean(
    STORAGE_KEYS.reduceMotion,
    false,
  );
  const [highContrast, setHighContrast] = useStoredBoolean(
    STORAGE_KEYS.highContrast,
    false,
  );
  const systemReducedMotion = useSystemReducedMotion();
  const reduceAnimations = storedReduceMotion || systemReducedMotion;

  return (
    <MotionConfig reducedMotion={reduceAnimations ? "always" : "never"}>
      <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
        <TopBar
          connectionStatus={connectionStatus}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <main className="flex flex-1 items-center justify-center overflow-hidden px-4 py-3">
          <div className="flex h-full w-full items-center justify-center">
            <div className="relative inline-flex items-center justify-center">
              <button
                aria-label={isPaused ? "Resume radar" : "Pause radar"}
                className="flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                type="button"
                onClick={() => setIsPaused(!isPaused)}
              >
                <RadarCanvas
                  highContrast={highContrast}
                  isPaused={isPaused}
                  reduceAnimations={reduceAnimations}
                  sounds={sounds}
                  totalIntensity={totalIntensity}
                />
              </button>
              {DIRECTION_BUTTONS.map((button) => (
                <button
                  key={button.label}
                  aria-label={`Simulate ${button.label.toLowerCase()} audio`}
                  className={`absolute z-10 rounded-full border border-border/90 bg-surface/95 px-3 py-1.5 text-sm font-semibold text-foreground shadow-[0_8px_24px_rgba(13,13,13,0.08)] backdrop-blur-sm transition hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${button.positionClassName}`}
                  type="button"
                  onClick={() => triggerManualDirection(button.direction)}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </main>
        <LegendBar />
        <SettingsDrawer
          connectionStatus={connectionStatus}
          highContrast={highContrast}
          isOpen={isSettingsOpen}
          reduceAnimations={reduceAnimations}
          websocketUrl={websocketUrl}
          onClose={() => setIsSettingsOpen(false)}
          onToggleHighContrast={setHighContrast}
          onToggleReduceAnimations={setStoredReduceMotion}
        />
        <OnboardingModal
          isOpen={onboardingReady && !hasOnboarded}
          reduceAnimations={reduceAnimations}
          onClose={() => setHasOnboarded(true)}
        />
      </div>
    </MotionConfig>
  );
}
