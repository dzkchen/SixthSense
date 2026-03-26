"use client";

import { useEffect, useMemo, useState } from "react";

import { TopBar } from "@/components/TopBar";
import { directionToSignalDirection } from "@/lib/directionToSignalDirection";
import { soundColors } from "@/lib/soundColors";
import { useSoundContext } from "@/providers/SoundProvider";
import type { SoundEvent } from "@/types/sound";

function formatRelativeTime(timestamp: number, now: number) {
  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffSeconds < 5) {
    return "just now";
  }

  if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) {
    return "1 minute ago";
  }

  return `${diffMinutes} minutes ago`;
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-muted">
      <svg
        aria-hidden="true"
        className="h-16 w-16"
        fill="none"
        viewBox="0 0 64 64"
      >
        <path
          d="M20 18c0-6.6 5.4-12 12-12s12 5.4 12 12v11c0 6.6-5.4 12-12 12s-12-5.4-12-12V18Z"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M12 28c0 11 9 20 20 20s20-9 20-20"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path d="M10 10 54 54" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      </svg>
      <p className="text-base">No sounds detected yet</p>
    </div>
  );
}

function HistoryRow({ now, sound }: { now: number; sound: SoundEvent }) {
  return (
    <li className="flex items-center gap-3 border-b border-border py-4">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: soundColors[sound.label] }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-bold capitalize text-foreground">{sound.label}</p>
          <p className="shrink-0 text-sm text-muted">
            {formatRelativeTime(sound.lastSeenAt, now)}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {directionToSignalDirection(sound.direction)}
          </p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-12 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: soundColors[sound.label],
                  width: `${sound.intensity * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Displays the session-long sound history in a scrollable feed. */
export default function HistoryPage() {
  const { connectionStatus, history } = useSoundContext();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(intervalId);
  }, []);

  const sortedHistory = useMemo(
    () => [...history].reverse(),
    [history],
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <TopBar
        connectionStatus={connectionStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        showBackButton
      />
      <main className="flex min-h-0 flex-1 flex-col">
        {sortedHistory.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-4">
            {sortedHistory.map((sound, index) => (
              <HistoryRow
                key={`${sound.id}-${sound.lastSeenAt}-${index}`}
                now={now}
                sound={sound}
              />
            ))}
          </ul>
        )}
      </main>
      {isSettingsOpen ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 px-6 backdrop-blur-sm">
          <div className="rounded-2xl bg-surface p-6 text-center shadow-[0_24px_80px_rgba(13,13,13,0.16)]">
            <p className="text-base font-semibold text-foreground">
              Settings live on the radar screen
            </p>
            <p className="mt-2 text-sm text-muted">
              Return to the main view to adjust motion, contrast, or run the demo.
            </p>
            <button
              className="mt-5 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white"
              type="button"
              onClick={() => setIsSettingsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
