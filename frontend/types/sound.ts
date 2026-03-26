export type SoundLabel = "voice" | "vehicle" | "alarm" | "unknown";

export type SoundEvent = {
  id: string;
  direction: number;
  intensity: number;
  label: SoundLabel;
  startedAt: number;
  lastSeenAt: number;
  isActive: boolean;
};

export type ConnectionStatus = "live" | "manual";

export type SoundUpdateMessage = {
  type: "sound_update";
  sound: SoundEvent;
};

export type SoundEndMessage = {
  type: "sound_end";
  id: string;
};

export type SoundMessage = SoundUpdateMessage | SoundEndMessage;
