"use client";

import { MotionConfig } from "framer-motion";
import { useState } from "react";

import { OnboardingModal } from "@/components/OnboardingModal";
import { RadarCanvas } from "@/components/RadarCanvas";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { TopBar } from "@/components/TopBar";
import { useStoredBoolean } from "@/hooks/useStoredBoolean";
import { useSystemReducedMotion } from "@/hooks/useSystemReducedMotion";
import { STORAGE_KEYS } from "@/lib/storageKeys";
import { useSoundContext } from "@/providers/SoundProvider";

/** Renders the live radar workspace with settings and onboarding overlays. */
export default function HomePage() {
  const { connectionStatus, magnitudes, totalIntensity } = useSoundContext();
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
          <RadarCanvas
            highContrast={highContrast}
            magnitudes={magnitudes}
            reduceAnimations={reduceAnimations}
            totalIntensity={totalIntensity}
          />
        </main>
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
