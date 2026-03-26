const DEFAULT_AUDIO_PORT = "8000";
const DEFAULT_AUDIO_PATH = "/ws/audio-stream";
const DEFAULT_LOCAL_AUDIO_URL = `ws://localhost:${DEFAULT_AUDIO_PORT}${DEFAULT_AUDIO_PATH}`;

function normalizeConfiguredUrl(configuredUrl: string) {
  if (configuredUrl.startsWith("ws://") || configuredUrl.startsWith("wss://")) {
    return configuredUrl;
  }

  if (configuredUrl.startsWith("/")) {
    if (typeof window === "undefined") {
      return DEFAULT_LOCAL_AUDIO_URL;
    }

    const websocketProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${websocketProtocol}://${window.location.host}${configuredUrl}`;
  }

  return configuredUrl;
}

/** Resolves candidate backend WebSocket URLs for local dev, LAN testing, or deployments. */
export function resolveAudioWebSocketUrls() {
  const candidates: string[] = [];
  const configuredUrl = process.env.NEXT_PUBLIC_AUDIO_WS_URL?.trim();

  if (configuredUrl) {
    candidates.push(normalizeConfiguredUrl(configuredUrl));
  }

  if (typeof window === "undefined") {
    candidates.push(DEFAULT_LOCAL_AUDIO_URL);
    return [...new Set(candidates)];
  }

  const websocketProtocol = window.location.protocol === "https:" ? "wss" : "ws";

  candidates.push(`${websocketProtocol}://${window.location.host}${DEFAULT_AUDIO_PATH}`);
  candidates.push(
    `${websocketProtocol}://${window.location.hostname}:${DEFAULT_AUDIO_PORT}${DEFAULT_AUDIO_PATH}`,
  );

  if (window.location.hostname !== "localhost") {
    candidates.push(DEFAULT_LOCAL_AUDIO_URL);
  }

  return [...new Set(candidates)];
}

export function resolveAudioWebSocketUrl() {
  return resolveAudioWebSocketUrls()[0] ?? DEFAULT_LOCAL_AUDIO_URL;
}
