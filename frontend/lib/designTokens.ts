import type { SoundLabel } from "@/types/sound";

export const designTokens = {
  appName: "SixthSense",
  colors: {
    background: "#F4EEE2",
    border: "#D4C8AE",
    canvasGradientEnd: "#8D7B5A",
    foreground: "#1F180F",
    muted: "#766956",
    statusDemo: "#8C7F6B",
    statusLive: "#10B981",
    surface: "#FBF7EE",
    white: "#FFFDF8",
  },
  radar: {
    alarmFlash: "#C84A31",
    centerDot: "#1F180F",
    centerGlow: "74, 91, 153",
    ringStroke: "#B9AB8E",
  },
  soundColors: {
    alarm: "#C84A31",
    unknown: "#8E806A",
    vehicle: "#C66A42",
    voice: "#4A5B99",
  } satisfies Record<SoundLabel, string>,
} as const;
