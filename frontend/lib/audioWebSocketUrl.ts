const DEFAULT_AUDIO_PORT = "8000";
const DEFAULT_AUDIO_PATH = "/ws/audio-stream";
const DEFAULT_LOCAL_AUDIO_URL = `ws://localhost:${DEFAULT_AUDIO_PORT}${DEFAULT_AUDIO_PATH}`;

/** Resolves the backend WebSocket URL for local dev, LAN testing, or deployments. */
export function resolveAudioWebSocketUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_AUDIO_WS_URL?.trim();

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === "undefined") {
    return DEFAULT_LOCAL_AUDIO_URL;
  }

  const websocketProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${websocketProtocol}://${window.location.hostname}:${DEFAULT_AUDIO_PORT}${DEFAULT_AUDIO_PATH}`;
}
