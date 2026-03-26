"use client";

import { AnimatePresence, motion } from "framer-motion";

type OnboardingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reduceAnimations: boolean;
};

/** Introduces the radar behavior and color system on first visit. */
export function OnboardingModal({
  isOpen,
  onClose,
  reduceAnimations,
}: OnboardingModalProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: reduceAnimations ? 0 : 0.2 }}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-80 rounded-2xl bg-surface p-6 shadow-[0_24px_80px_rgba(13,13,13,0.16)]"
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={{ duration: reduceAnimations ? 0 : 0.24, ease: "easeOut" }}
          >
            <div className="space-y-5">
              <section className="space-y-1.5">
                <h2 className="text-base font-bold text-foreground">
                  What is SixthSense
                </h2>
                <p className="text-sm leading-6 text-muted">
                  We turn the sounds around you into a visual map, updated in real
                  time.
                </p>
              </section>
              <section className="space-y-1.5">
                <h2 className="text-base font-bold text-foreground">
                  How to read the radar
                </h2>
                <p className="text-sm leading-6 text-muted">
                  You are at the centre. The radar swells toward the strongest
                  incoming side, so taller spokes and a lifted outer wave mean
                  more sound energy in that direction.
                </p>
              </section>
              <section className="space-y-2">
                <h2 className="text-base font-bold text-foreground">How signals blend</h2>
                <p className="text-sm leading-6 text-muted">
                  Front, left, and right magnitudes mix into one continuous
                  field. If two channels rise together, the strongest motion
                  appears between them instead of snapping to a fixed lane.
                </p>
              </section>
            </div>
            <button
              className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white transition hover:opacity-90"
              type="button"
              onClick={onClose}
            >
              Start listening
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
