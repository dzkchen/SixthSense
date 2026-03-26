"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resolveAudioWebSocketUrl } from "@/lib/audioWebSocketUrl";
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

type UseSoundStreamOptions = {
    isPaused: boolean;
};

type UseSoundStreamResult = {
    sounds: SoundEvent[];
    connectionStatus: ConnectionStatus;
    totalIntensity: number;
    history: SoundEvent[];
    websocketUrl: string;
    triggerManualDirection: (direction: number) => void;
    isDemoMode: boolean;
    setIsDemoMode: (enabled: boolean) => void;
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
    const index = nextSounds.findIndex(
        (sound) => sound.id === incomingSound.id,
    );

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
        const id =
            message.type === "sound_update" ? message.sound.id : message.id;
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
    const [isDemoMode, setIsDemoMode] = useState(false);
    const websocketUrl = useMemo(() => resolveAudioWebSocketUrl(), []);

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
            const bufferedMessages = getLatestBufferedMessages(
                messageBufferRef.current,
            );
            messageBufferRef.current = [];
            bufferedMessages.forEach(processMessage);
        }
    }, [isPaused, processMessage]);

    // Demo mode: simulate audio from left and right channels
    useEffect(() => {
        if (!isDemoMode) {
            return;
        }

        const demoSoundIds = {
            left: "demo-left-channel",
            right: "demo-right-channel",
        };

        let demoIntervalId: number;
        let demoPhase = 0;

        const runDemoSequence = () => {
            const now = Date.now();

            // Phase 0: Show LEFT audio at 270°
            if (demoPhase === 0) {
                processMessage({
                    type: "sound_update",
                    sound: {
                        id: demoSoundIds.left,
                        direction: 270,
                        intensity: 0.8,
                        isActive: true,
                        label: "unknown",
                        lastSeenAt: now,
                        startedAt: now,
                    },
                });
                demoPhase = 1;
            }
            // Phase 1: Add RIGHT audio at 90° (both channels active)
            else if (demoPhase === 1) {
                processMessage({
                    type: "sound_update",
                    sound: {
                        id: demoSoundIds.right,
                        direction: 90,
                        intensity: 0.75,
                        isActive: true,
                        label: "unknown",
                        lastSeenAt: now,
                        startedAt: now,
                    },
                });
                demoPhase = 2;
            }
            // Phase 2: End LEFT audio
            else if (demoPhase === 2) {
                processMessage({
                    type: "sound_end",
                    id: demoSoundIds.left,
                });
                demoPhase = 3;
            }
            // Phase 3: End RIGHT audio
            else if (demoPhase === 3) {
                processMessage({
                    type: "sound_end",
                    id: demoSoundIds.right,
                });
                demoPhase = 0; // Restart sequence
            }
        };

        demoIntervalId = window.setInterval(runDemoSequence, 2000);
        setConnectionStatus("live");

        return () => {
            window.clearInterval(demoIntervalId);
            // Clean up any remaining sounds
            processMessage({ type: "sound_end", id: demoSoundIds.left });
            processMessage({ type: "sound_end", id: demoSoundIds.right });
        };
    }, [isDemoMode, processMessage]);

    useEffect(() => {
        let websocket: WebSocket;

        try {
            websocket = new WebSocket(websocketUrl);
        } catch {
            return;
        }

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
            window.clearTimeout(fallbackToManual);
            setConnectionStatus("manual");
        });

        websocket.addEventListener("close", () => {
            window.clearTimeout(fallbackToManual);
            setConnectionStatus("manual");
        });

        return () => {
            window.clearTimeout(fallbackToManual);
            websocket.close();
        };
    }, [processMessage, websocketUrl]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            const now = Date.now();

            syncSounds((previous) =>
                previous
                    .map((sound) => {
                        if (
                            sound.isActive &&
                            now - sound.lastSeenAt > EXPIRY_TIMEOUT_MS
                        ) {
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
                            sound.isActive ||
                            now - sound.lastSeenAt <= END_FADE_DURATION_MS,
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

            const existingTimeout =
                manualTimeoutsRef.current.get(snappedDirection);
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
        websocketUrl,
        triggerManualDirection,
        isDemoMode,
        setIsDemoMode,
    };
}
