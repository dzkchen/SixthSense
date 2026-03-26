"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  ConnectionStatus,
  DirectionalMagnitudes,
  MagnitudeMessage,
} from "@/types/sound";

const FRAME_INTERVAL_MS = 50;
const MAGNITUDE_LERP_FACTOR = 0.22;
const STREAM_STALE_TIMEOUT_MS = 1200;
const WEBSOCKET_TIMEOUT_MS = 2000;
const WS_URL = "ws://localhost:8000/ws/audio-stream";

const ZERO_MAGNITUDES: DirectionalMagnitudes = {
  front: 0,
  left: 0,
  right: 0,
};

type UseSoundStreamResult = {
  magnitudes: DirectionalMagnitudes;
  connectionStatus: ConnectionStatus;
  totalIntensity: number;
};

function clampMagnitude(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeMagnitudes(
  magnitudes: Partial<DirectionalMagnitudes> | null | undefined,
): DirectionalMagnitudes {
  return {
    front: clampMagnitude(magnitudes?.front),
    left: clampMagnitude(magnitudes?.left),
    right: clampMagnitude(magnitudes?.right),
  };
}

function parseMagnitudeMessage(rawMessage: string): MagnitudeMessage | null {
  try {
    const parsed = JSON.parse(rawMessage) as {
      type?: unknown;
      magnitudes?: Partial<DirectionalMagnitudes>;
    };

    if (parsed.type !== "magnitude_update") {
      return null;
    }

    return {
      type: "magnitude_update",
      magnitudes: normalizeMagnitudes(parsed.magnitudes),
    };
  } catch {
    return null;
  }
}

function blendMagnitude(current: number, target: number) {
  const nextValue = current + (target - current) * MAGNITUDE_LERP_FACTOR;

  if (Math.abs(nextValue - target) <= 0.005) {
    return target;
  }

  return nextValue;
}

function blendMagnitudes(
  current: DirectionalMagnitudes,
  target: DirectionalMagnitudes,
) {
  return {
    front: blendMagnitude(current.front, target.front),
    left: blendMagnitude(current.left, target.left),
    right: blendMagnitude(current.right, target.right),
  };
}

function magnitudesEqual(
  first: DirectionalMagnitudes,
  second: DirectionalMagnitudes,
) {
  return (
    first.front === second.front &&
    first.left === second.left &&
    first.right === second.right
  );
}

/** Streams live directional magnitudes and smooths them for rendering. */
export function useSoundStream(): UseSoundStreamResult {
  const [magnitudes, setMagnitudes] =
    useState<DirectionalMagnitudes>(ZERO_MAGNITUDES);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("offline");

  const targetMagnitudesRef = useRef<DirectionalMagnitudes>(ZERO_MAGNITUDES);
  const lastMessageAtRef = useRef(0);

  useEffect(() => {
    const websocket = new WebSocket(WS_URL);
    let didResolveConnection = false;

    const setOfflineState = () => {
      targetMagnitudesRef.current = ZERO_MAGNITUDES;
      lastMessageAtRef.current = 0;
      setConnectionStatus("offline");
    };

    const fallbackToOffline = window.setTimeout(() => {
      if (!didResolveConnection) {
        setOfflineState();
        websocket.close();
      }
    }, WEBSOCKET_TIMEOUT_MS);

    websocket.addEventListener("open", () => {
      didResolveConnection = true;
      window.clearTimeout(fallbackToOffline);
      setConnectionStatus("live");
    });

    websocket.addEventListener("message", (event) => {
      const message = parseMagnitudeMessage(event.data);

      if (!message) {
        return;
      }

      lastMessageAtRef.current = Date.now();
      targetMagnitudesRef.current = message.magnitudes;
    });

    websocket.addEventListener("error", () => {
      setOfflineState();
    });

    websocket.addEventListener("close", () => {
      setOfflineState();
    });

    return () => {
      window.clearTimeout(fallbackToOffline);
      websocket.close();
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now();

      if (
        connectionStatus === "live" &&
        lastMessageAtRef.current > 0 &&
        now - lastMessageAtRef.current > STREAM_STALE_TIMEOUT_MS
      ) {
        targetMagnitudesRef.current = ZERO_MAGNITUDES;
      }

      setMagnitudes((current) => {
        const next = blendMagnitudes(current, targetMagnitudesRef.current);
        return magnitudesEqual(current, next) ? current : next;
      });
    }, FRAME_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [connectionStatus]);

  const totalIntensity = useMemo(
    () => Math.max(magnitudes.front, magnitudes.left, magnitudes.right),
    [magnitudes],
  );

  return {
    magnitudes,
    connectionStatus,
    totalIntensity,
  };
}
