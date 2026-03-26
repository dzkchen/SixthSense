export type SoundLabel = "voice" | "vehicle" | "alarm" | "unknown";

export type ChannelIntensities = {
    left?: number;
    center?: number;
    right?: number;
};

export type ChannelPeaks = {
    left?: number;
    center?: number;
    right?: number;
};

export type ChannelSnapshot = {
    direction: number;
    channelPeaks: ChannelPeaks;
    channelIntensities: ChannelIntensities;
    detectedAt: number;
};

export type SoundEvent = {
    id: string;
    direction: number;
    intensity: number;
    label: SoundLabel;
    startedAt: number;
    lastSeenAt: number;
    isActive: boolean;
    channelPeaks?: ChannelPeaks;
    channelIntensities?: ChannelIntensities;
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

export type ChannelSnapshotMessage = {
    type: "channel_snapshot";
    snapshot: ChannelSnapshot;
};

export type SoundMessage =
    | SoundUpdateMessage
    | SoundEndMessage
    | ChannelSnapshotMessage;
