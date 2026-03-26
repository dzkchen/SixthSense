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
    positionClassName: "-top-3 left-1/2 -translate-x-1/2",
  },
  {
    direction: 90,
    label: "Right",
    positionClassName: "right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
  },
  {
    direction: 180,
    label: "Behind",
    positionClassName: "-bottom-3 left-1/2 -translate-x-1/2",
  },
  {
    direction: 270,
    label: "Left",
    positionClassName: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
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
          <div className="relative flex h-full w-full items-center justify-center">
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
                className={`absolute z-10 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-[0_8px_24px_rgba(13,13,13,0.08)] transition hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${button.positionClassName}`}
                type="button"
                onClick={() => triggerManualDirection(button.direction)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </main>
        <LegendBar />
        <SettingsDrawer
          connectionStatus={connectionStatus}
          highContrast={highContrast}
          isOpen={isSettingsOpen}
          reduceAnimations={reduceAnimations}
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
