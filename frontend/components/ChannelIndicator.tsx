"use client";

import type { SoundEvent } from "@/types/sound";

type ChannelIndicatorProps = {
    sounds: SoundEvent[];
};

function getChannelFromDirection(direction: number): "left" | "right" {
    const normalized = ((direction % 360) + 360) % 360;

    if (normalized > 225 && normalized < 315) {
        return "left";
    }

    return "right";
}

function getEmojiForChannel(channel: "left" | "right"): string {
    switch (channel) {
        case "left":
            return "⬅️";
        case "right":
            return "➡️";
    }
}

function getLabelForChannel(channel: "left" | "right"): string {
    switch (channel) {
        case "left":
            return "LEFT";
        case "right":
            return "RIGHT";
    }
}

/** Displays active audio channels (left/right) as emojis. */
export function ChannelIndicator({ sounds }: ChannelIndicatorProps) {
    // Get unique active channels from current sounds
    const activeChannels = new Set<"left" | "right">();

    sounds.forEach((sound) => {
        if (sound.isActive) {
            const channel = getChannelFromDirection(sound.direction);
            activeChannels.add(channel);
        }
    });

    if (activeChannels.size === 0) {
        return (
            <div className="flex min-h-20 flex-col items-center justify-center gap-2 text-muted">
                <div className="text-4xl">↔️</div>
                <div className="text-sm font-semibold">Listening...</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-20 flex-col items-center justify-center gap-2">
            <div className="flex gap-4 text-4xl">
                {Array.from(activeChannels)
                    .sort((a, b) => {
                        const order = { left: 0, right: 1 };
                        return order[a] - order[b];
                    })
                    .map((channel) => (
                        <div
                            key={channel}
                            className="flex flex-col items-center gap-1"
                        >
                            <div>{getEmojiForChannel(channel)}</div>
                            <div className="text-xs font-semibold text-muted">
                                {getLabelForChannel(channel)}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
