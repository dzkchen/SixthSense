"use client";

import { AnimatePresence, motion } from "framer-motion";

type SettingsDrawerProps = {
  connectionStatus: "live" | "manual";
  isOpen: boolean;
  onClose: () => void;
  reduceAnimations: boolean;
  highContrast: boolean;
  onToggleReduceAnimations: (value: boolean) => void;
  onToggleHighContrast: (value: boolean) => void;
};

function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{label}</p>
        <p className="text-sm leading-5 text-muted">{description}</p>
      </div>
      <button
        aria-pressed={checked}
        className={`flex h-8 w-14 items-center rounded-full p-1 transition ${
          checked ? "bg-foreground" : "bg-border"
        }`}
        type="button"
        onClick={() => onChange(!checked)}
      >
        <span
          className={`h-6 w-6 rounded-full bg-white transition ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

/** Presents display and connection controls in a bottom sheet. */
export function SettingsDrawer({
  connectionStatus,
  isOpen,
  onClose,
  reduceAnimations,
  highContrast,
  onToggleReduceAnimations,
  onToggleHighContrast,
}: SettingsDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 bg-black/20 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: reduceAnimations ? 0 : 0.2 }}
            type="button"
            onClick={onClose}
          />
          <motion.aside
            animate={{ y: 0 }}
            className="absolute inset-x-0 bottom-0 z-30 rounded-t-[24px] bg-surface px-5 pb-8 pt-3 shadow-[0_-20px_64px_rgba(13,13,13,0.16)]"
            drag="y"
            dragConstraints={{ bottom: 0, top: 0 }}
            dragElastic={0.08}
            exit={{ y: "100%" }}
            initial={{ y: "100%" }}
            transition={{ duration: reduceAnimations ? 0 : 0.3, ease: "easeOut" }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) {
                onClose();
              }
            }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
            <div className="space-y-6">
              <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                  Display
                </h2>
                <div className="divide-y divide-border">
                  <ToggleRow
                    checked={reduceAnimations}
                    description="Suppress animation and keep motion cues still."
                    label="Reduce animations"
                    onChange={onToggleReduceAnimations}
                  />
                  <ToggleRow
                    checked={highContrast}
                    description="Increase ring and dot clarity for bright conditions."
                    label="High contrast mode"
                    onChange={onToggleHighContrast}
                  />
                </div>
              </section>
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                  Input
                </h2>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm leading-6 text-muted">
                    Press and hold the eight direction buttons around the radar
                    to simulate incoming audio. The longer you hold, the more
                    intense the signal becomes.
                  </p>
                </div>
              </section>
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                  Connection
                </h2>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm text-muted">WebSocket URL</p>
                  <p className="mt-2 break-all font-mono text-sm text-foreground">
                    ws://localhost:8000/ws/audio-stream
                  </p>
                  <p className="mt-3 text-sm text-muted">
                    Current status:{" "}
                    <span className="font-medium text-foreground">
                      {connectionStatus === "live" ? "Live" : "Manual"}
                    </span>
                  </p>
                </div>
              </section>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
