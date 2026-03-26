"use client";

import { ChannelIndicator } from "@/components/ChannelIndicator";
import { TopBar } from "@/components/TopBar";
import { useSoundContext } from "@/providers/SoundProvider";

/** Dedicated page for channel indicator. */
export default function ChannelDemoPage() {
    const { connectionStatus, sounds } = useSoundContext();

    return (
        <div className="flex h-screen flex-col bg-background">
            <TopBar
                connectionStatus={connectionStatus}
                onOpenSettings={() => {}}
            />
            <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8">
                <div className="text-center">
                    <h1 className="mb-4 text-4xl font-bold text-foreground">
                        🎵 Audio Channel Detection
                    </h1>
                    <p className="text-lg text-muted">
                        Listening for audio from the left/right channels
                    </p>
                </div>

                <ChannelIndicator sounds={sounds} />

                <div className="mt-8 max-w-2xl rounded-lg border border-border bg-surface p-6">
                    <h2 className="mb-4 text-2xl font-semibold text-foreground">
                        Status
                    </h2>
                    <div className="space-y-3 text-sm text-muted">
                        <p>
                            <strong>⬅️ LEFT (270°):</strong> Audio detected from
                            the left channel
                        </p>
                        <p>
                            <strong>➡️ RIGHT (90°):</strong> Audio detected from
                            the right channel
                        </p>
                        <p className="mt-4 font-semibold">
                            Status:{" "}
                            {connectionStatus === "live"
                                ? "🟢 Live"
                                : "🔴 Manual"}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
