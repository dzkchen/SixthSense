"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ConnectionStatus,
  SoundEndMessage,
  SoundEvent,
  SoundMessage,
  SoundUpdateMessage,
} from "@/types/sound";

const CLEANUP_INTERVAL_MS = 200;
const END_FADE_DURATION_MS = 1500;
const EXPIRY_TIMEOUT_MS = 4000;
const MANUAL_HOLD_RAMP_DURATION_MS = 1800;
const MANUAL_HOLD_TICK_MS = 80;
const MANUAL_MIN_INTENSITY = 0.22;
const MANUAL_MAX_INTENSITY = 1;
const MAX_TOTAL_INTENSITY_SOUNDS = 3;
const SIGNAL_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const WEBSOCKET_TIMEOUT_MS = 2000;
const WS_URL = "ws://localhost:8000/ws/audio-stream";

type UseSoundStreamResult = {
  sounds: SoundEvent[];
  connectionStatus: ConnectionStatus;
  totalIntensity: number;
  history: SoundEvent[];
  startManualDirection: (direction: number) => void;
  stopManualDirection: (direction: number) => void;
};

type ManualHoldState = {
  intervalId: number;
  startedAt: number;
};

function clampIntensity(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getSoundIntensityContribution(sound: SoundEvent, now: number) {
  if (sound.isActive) {
    return sound.intensity;
  }

  const fadeProgress = Math.max(
    0,
    1 - (now - sound.lastSeenAt) / END_FADE_DURATION_MS,
  );

  return sound.intensity * fadeProgress;
}

function getManualHoldIntensity(startedAt: number, now: number) {
  const progress = Math.min(
    1,
    Math.max(0, (now - startedAt) / MANUAL_HOLD_RAMP_DURATION_MS),
  );

  return clampIntensity(
    MANUAL_MIN_INTENSITY +
      progress * (MANUAL_MAX_INTENSITY - MANUAL_MIN_INTENSITY),
  );
}

function snapToSignalDirection(direction: number) {
  const normalized = ((direction % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % SIGNAL_DIRECTIONS.length;

  return SIGNAL_DIRECTIONS[index];
}

function normalizeIncomingSound(sound: SoundEvent): SoundEvent {
  const timestamp = Date.now();

  return {
    ...sound,
    direction: snapToSignalDirection(sound.direction),
    intensity: clampIntensity(sound.intensity),
    isActive: sound.isActive ?? true,
    lastSeenAt: sound.lastSeenAt || timestamp,
    startedAt: sound.startedAt || timestamp,
  };
}

function upsertSound(currentSounds: SoundEvent[], incomingSound: SoundEvent) {
  const nextSounds = [...currentSounds];
  const index = nextSounds.findIndex((sound) => sound.id === incomingSound.id);

  if (index === -1) {
    nextSounds.push(incomingSound);
    return nextSounds;
  }

  nextSounds[index] = {
    ...nextSounds[index],
    ...incomingSound,
    startedAt: nextSounds[index].startedAt,
  };

  return nextSounds;
}

function markSoundEnded(currentSounds: SoundEvent[], id: string) {
  const endedAt = Date.now();

  return currentSounds.map((sound) =>
    sound.id === id
      ? {
          ...sound,
          isActive: false,
          lastSeenAt: endedAt,
        }
      : sound,
  );
}

export function useSoundStream(): UseSoundStreamResult {
  const [sounds, setSounds] = useState<SoundEvent[]>([]);
  const [history, setHistory] = useState<SoundEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("manual");

  const wsRef = useRef<WebSocket | null>(null);
  const manualHoldsRef = useRef<Map<number, ManualHoldState>>(new Map());

  const syncSounds = useCallback(
    (updater: (previous: SoundEvent[]) => SoundEvent[]) => {
      setSounds((previous) => updater(previous));
    },
    [],
  );

  const syncHistory = useCallback(
    (updater: (previous: SoundEvent[]) => SoundEvent[]) => {
      setHistory((previous) => updater(previous));
    },
    [],
  );

  const processUpdate = useCallback(
    (message: SoundUpdateMessage) => {
      const normalizedSound = normalizeIncomingSound({
        ...message.sound,
        isActive: true,
        lastSeenAt: Date.now(),
      });

      syncSounds((previous) => upsertSound(previous, normalizedSound));
      syncHistory((previous) => [...previous, normalizedSound]);
    },
    [syncHistory, syncSounds],
  );

  const processEnd = useCallback(
    (message: SoundEndMessage) => {
      syncSounds((previous) => markSoundEnded(previous, message.id));
    },
    [syncSounds],
  );

  const processMessage = useCallback(
    (message: SoundMessage) => {
      if (message.type === "sound_update") {
        processUpdate(message);
        return;
      }

      processEnd(message);
    },
    [processEnd, processUpdate],
  );

  useEffect(() => {
    const websocket = new WebSocket(WS_URL);
    wsRef.current = websocket;

    let didResolveConnection = false;

    const fallbackToManual = window.setTimeout(() => {
      if (!didResolveConnection) {
        setConnectionStatus("manual");
        websocket.close();
      }
    }, WEBSOCKET_TIMEOUT_MS);

    websocket.addEventListener("open", () => {
      didResolveConnection = true;
      window.clearTimeout(fallbackToManual);
      setConnectionStatus("live");
    });

    websocket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as SoundMessage;
      processMessage(message);
    });

    websocket.addEventListener("error", () => {
      if (!didResolveConnection) {
        setConnectionStatus("manual");
      }
    });

    websocket.addEventListener("close", () => {
      if (!didResolveConnection) {
        setConnectionStatus("manual");
      }
    });

    return () => {
      window.clearTimeout(fallbackToManual);
      websocket.close();
    };
  }, [processMessage]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);

      syncSounds((previous) =>
        previous
          .map((sound) => {
            if (sound.isActive && now - sound.lastSeenAt > EXPIRY_TIMEOUT_MS) {
              return {
                ...sound,
                isActive: false,
                lastSeenAt: now,
              };
            }

            return sound;
          })
          .filter(
            (sound) =>
              sound.isActive || now - sound.lastSeenAt <= END_FADE_DURATION_MS,
          ),
      );
    }, CLEANUP_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [syncSounds]);

  useEffect(
    () => () => {
      manualHoldsRef.current.forEach((holdState) =>
        window.clearInterval(holdState.intervalId),
      );
      manualHoldsRef.current.clear();
    },
    [],
  );

  const emitManualDirectionUpdate = useCallback(
    (direction: number, startedAt: number) => {
      const now = Date.now();
      const snappedDirection = snapToSignalDirection(direction);

      processMessage({
        type: "sound_update",
        sound: {
          id: `manual-${snappedDirection}`,
          direction: snappedDirection,
          intensity: getManualHoldIntensity(startedAt, now),
          isActive: true,
          label: "unknown",
          lastSeenAt: now,
          startedAt,
        },
      });
    },
    [processMessage],
  );

  const startManualDirection = useCallback(
    (direction: number) => {
      const snappedDirection = snapToSignalDirection(direction);

      if (manualHoldsRef.current.has(snappedDirection)) {
        return;
      }

      const startedAt = Date.now();
      emitManualDirectionUpdate(snappedDirection, startedAt);

      const intervalId = window.setInterval(() => {
        emitManualDirectionUpdate(snappedDirection, startedAt);
      }, MANUAL_HOLD_TICK_MS);

      manualHoldsRef.current.set(snappedDirection, {
        intervalId,
        startedAt,
      });
    },
    [emitManualDirectionUpdate],
  );

  const stopManualDirection = useCallback(
    (direction: number) => {
      const snappedDirection = snapToSignalDirection(direction);
      const activeHold = manualHoldsRef.current.get(snappedDirection);

      if (!activeHold) {
        return;
      }

      window.clearInterval(activeHold.intervalId);
      manualHoldsRef.current.delete(snappedDirection);
      processMessage({
        type: "sound_end",
        id: `manual-${snappedDirection}`,
      });
    },
    [processMessage],
  );

  const totalIntensity = useMemo(() => {
    const rawSum = sounds.reduce((sum, sound) => {
      return sum + getSoundIntensityContribution(sound, currentTime);
    }, 0);

    return Math.min(1, rawSum / MAX_TOTAL_INTENSITY_SOUNDS);
  }, [currentTime, sounds]);

  return {
    sounds,
    connectionStatus,
    totalIntensity,
    history,
    startManualDirection,
    stopManualDirection,
  };
}
