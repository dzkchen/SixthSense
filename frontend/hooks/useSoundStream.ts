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
const MANUAL_SOUND_DURATION_MS = 1200;
const MAX_TOTAL_INTENSITY_SOUNDS = 3;
const SIGNAL_DIRECTIONS = [0, 90, 180, 270] as const;
const WEBSOCKET_TIMEOUT_MS = 2000;
const WS_URL = "ws://localhost:8000/ws/audio-stream";

type UseSoundStreamOptions = {
  isPaused: boolean;
};

type UseSoundStreamResult = {
  sounds: SoundEvent[];
  connectionStatus: ConnectionStatus;
  totalIntensity: number;
  history: SoundEvent[];
  triggerManualDirection: (direction: number) => void;
};

function clampIntensity(value: number) {
  return Math.max(0, Math.min(1, value));
}

function snapToSignalDirection(direction: number) {
  const normalized = ((direction % 360) + 360) % 360;
  const index = Math.round(normalized / 90) % SIGNAL_DIRECTIONS.length;

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

function getLatestBufferedMessages(buffer: SoundMessage[]) {
  const latestById = new Map<string, SoundMessage>();

  for (const message of buffer) {
    const id = message.type === "sound_update" ? message.sound.id : message.id;
    latestById.set(id, message);
  }

  return [...latestById.values()];
}

export function useSoundStream({
  isPaused,
}: UseSoundStreamOptions): UseSoundStreamResult {
  const [sounds, setSounds] = useState<SoundEvent[]>([]);
  const [history, setHistory] = useState<SoundEvent[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("manual");

  const pausedRef = useRef(isPaused);
  const wsRef = useRef<WebSocket | null>(null);
  const messageBufferRef = useRef<SoundMessage[]>([]);
  const manualTimeoutsRef = useRef<Map<number, number>>(new Map());

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
      if (pausedRef.current) {
        messageBufferRef.current.push(message);
        return;
      }

      if (message.type === "sound_update") {
        processUpdate(message);
        return;
      }

      processEnd(message);
    },
    [processEnd, processUpdate],
  );

  useEffect(() => {
    pausedRef.current = isPaused;

    if (!isPaused && messageBufferRef.current.length > 0) {
      const bufferedMessages = getLatestBufferedMessages(messageBufferRef.current);
      messageBufferRef.current = [];
      bufferedMessages.forEach(processMessage);
    }
  }, [isPaused, processMessage]);

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
      manualTimeoutsRef.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
      manualTimeoutsRef.current.clear();
    },
    [],
  );

  const triggerManualDirection = useCallback(
    (direction: number) => {
      const now = Date.now();
      const snappedDirection = snapToSignalDirection(direction);
      const soundId = `manual-${snappedDirection}`;

      processMessage({
        type: "sound_update",
        sound: {
          id: soundId,
          direction: snappedDirection,
          intensity: 0.9,
          isActive: true,
          label: "unknown",
          lastSeenAt: now,
          startedAt: now,
        },
      });

      const existingTimeout = manualTimeoutsRef.current.get(snappedDirection);
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      const timeoutId = window.setTimeout(() => {
        processMessage({ type: "sound_end", id: soundId });
        manualTimeoutsRef.current.delete(snappedDirection);
      }, MANUAL_SOUND_DURATION_MS);

      manualTimeoutsRef.current.set(snappedDirection, timeoutId);
    },
    [processMessage],
  );

  const totalIntensity = useMemo(() => {
    const rawSum = sounds.reduce((sum, sound) => {
      if (!sound.isActive) {
        return sum;
      }

      return sum + sound.intensity;
    }, 0);

    return Math.min(1, rawSum / MAX_TOTAL_INTENSITY_SOUNDS);
  }, [sounds]);

  return {
    sounds,
    connectionStatus,
    totalIntensity,
    history,
    triggerManualDirection,
  };
}
