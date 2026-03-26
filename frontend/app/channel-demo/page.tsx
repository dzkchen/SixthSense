"use client";

import { useEffect, useMemo, useState } from "react";

import { TopBar } from "@/components/TopBar";
import { resolveAudioWebSocketUrl } from "@/lib/audioWebSocketUrl";
import type {
    ChannelSnapshot,
    ConnectionStatus,
    SoundMessage,
} from "@/types/sound";

function getDirectionLabel(direction: number | undefined) {
    if (direction === 270) {
        return "Left";
    }

    if (direction === 90) {
        return "Right";
    }

    if (direction === 0) {
        return "Center";
    }

    return "Waiting";
}

function formatIntensity(value: number | undefined) {
    return (value ?? 0).toFixed(2);
}

function formatPeak(value: number | undefined) {
    return (value ?? 0).toFixed(4);
}

function ChannelRow({
    label,
    peak,
    intensity,
}: {
    label: "Left" | "Center" | "Right";
    peak: number | undefined;
    intensity: number | undefined;
}) {
    const intensityPercentage = `${Math.round((intensity ?? 0) * 100)}%`;

    return (
        <div className="space-y-2 rounded-3xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                    {label}
                </p>
            </div>
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-muted">
                        Peak
                    </p>
                    <p className="font-mono text-2xl font-semibold text-foreground">
                        {formatPeak(peak)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted">
                        Intensity
                    </p>
                    <p className="font-mono text-lg font-semibold text-foreground">
                        {formatIntensity(intensity)}
                    </p>
                </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-border/80">
                <div
                    className="h-full rounded-full bg-foreground transition-[width]"
                    style={{ width: intensityPercentage }}
                />
            </div>
        </div>
    );
}

/** Dedicated page for channel indicator. */
export default function ChannelDemoPage() {
    const websocketUrl = useMemo(() => resolveAudioWebSocketUrl(), []);
    const [connectionStatus, setConnectionStatus] =
        useState<ConnectionStatus>("manual");
    const [latestChannelSnapshot, setLatestChannelSnapshot] =
        useState<ChannelSnapshot | null>(null);
    const channelPeaks = latestChannelSnapshot?.channelPeaks;
    const channelIntensities = latestChannelSnapshot?.channelIntensities;
    const directionLabel = getDirectionLabel(latestChannelSnapshot?.direction);

    useEffect(() => {
        let websocket: WebSocket;

        try {
            websocket = new WebSocket(websocketUrl);
        } catch {
            return;
        }

        const fallbackToManual = window.setTimeout(() => {
            setConnectionStatus("manual");
            websocket.close();
        }, 2000);

        websocket.addEventListener("open", () => {
            window.clearTimeout(fallbackToManual);
            setConnectionStatus("live");
        });

        websocket.addEventListener("message", (event) => {
            const message = JSON.parse(event.data) as SoundMessage;

            if (message.type === "channel_snapshot") {
                setLatestChannelSnapshot(message.snapshot);
            }
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
    }, [websocketUrl]);

    return (
        <div className="flex h-screen flex-col bg-background">
            <TopBar
                connectionStatus={connectionStatus}
                onOpenSettings={() => {}}
                showBackButton
            />
            <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-8">
                <div className="rounded-[32px] border border-border bg-surface p-6 text-center shadow-[0_20px_60px_rgba(13,13,13,0.08)]">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                        Channel Demo
                    </p>
                    <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-foreground">
                        {directionLabel}
                    </h1>
                    <p className="mt-3 text-base text-muted">
                        Latest channel intensities from the backend stream in{" "}
                        <span className="font-medium text-foreground">
                            {connectionStatus === "live" ? "live" : "manual"}
                        </span>{" "}
                        mode.
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-muted">
                        {websocketUrl}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <ChannelRow
                        label="Left"
                        peak={channelPeaks?.left}
                        intensity={channelIntensities?.left}
                    />
                    <ChannelRow
                        label="Center"
                        peak={channelPeaks?.center}
                        intensity={channelIntensities?.center}
                    />
                    <ChannelRow
                        label="Right"
                        peak={channelPeaks?.right}
                        intensity={channelIntensities?.right}
                    />
                </div>

                <div className="rounded-3xl border border-border bg-surface p-6">
                    <h2 className="text-lg font-semibold text-foreground">
                        Raw Payload
                    </h2>
                    <pre className="mt-4 overflow-x-auto rounded-2xl bg-background p-4 text-sm text-muted">
                        {JSON.stringify(
                            {
                                direction: latestChannelSnapshot?.direction ?? null,
                                channelPeaks: {
                                    left: channelPeaks?.left ?? 0,
                                    center: channelPeaks?.center ?? 0,
                                    right: channelPeaks?.right ?? 0,
                                },
                                channelIntensities: {
                                    left: channelIntensities?.left ?? 0,
                                    center: channelIntensities?.center ?? 0,
                                    right: channelIntensities?.right ?? 0,
                                },
                                detectedAt:
                                    latestChannelSnapshot?.detectedAt ?? null,
                            },
                            null,
                            2,
                        )}
                    </pre>
                </div>
            </main>
        </div>
    );
}
