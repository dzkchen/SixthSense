import type { SoundLabel } from "@/types/sound";

export const designTokens = {
  appName: "SixthSense",
  colors: {
    background: "#F8F9FA",
    border: "#E2E8F0",
    canvasGradientEnd: "#6366F1",
    foreground: "#0D0D0D",
    muted: "#6B7280",
    statusDemo: "#94A3B8",
    statusLive: "#10B981",
    surface: "#FFFFFF",
    white: "#FFFFFF",
  },
  radar: {
    alarmFlash: "#EF4444",
    centerDot: "#0D0D0D",
    centerGlow: "37, 99, 235",
    ringStroke: "#E2E8F0",
  },
  soundColors: {
    alarm: "#EF4444",
    unknown: "#94A3B8",
    vehicle: "#F43F5E",
    voice: "#2563EB",
  } satisfies Record<SoundLabel, string>,
} as const;
