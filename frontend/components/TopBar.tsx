"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { designTokens } from "@/lib/designTokens";
import type { ConnectionStatus } from "@/types/sound";

type TopBarProps = {
    connectionStatus: ConnectionStatus;
    onOpenSettings: () => void;
    isDemoMode?: boolean;
    onToggleDemoMode?: (enabled: boolean) => void;
    showBackButton?: boolean;
};

function IconButton({
    ariaLabel,
    children,
    href,
    onClick,
}: {
    ariaLabel: string;
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
}) {
    const baseClassName =
        "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

    if (href) {
        return (
            <Link aria-label={ariaLabel} className={baseClassName} href={href}>
                {children}
            </Link>
        );
    }

    return (
        <button
            aria-label={ariaLabel}
            className={baseClassName}
            type="button"
            onClick={onClick}
        >
            {children}
        </button>
    );
}

/** Renders the fixed application header with connection state and route actions. */
export function TopBar({
    connectionStatus,
    onOpenSettings,
    isDemoMode = false,
    onToggleDemoMode,
    showBackButton = false,
}: TopBarProps) {
    const router = useRouter();

    return (
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
            <div>
                <p className="text-2xl font-bold tracking-[-0.04em] text-foreground">
                    {designTokens.appName}
                </p>
            </div>
            <div className="flex items-center gap-2">
                {isDemoMode && (
                    <button
                        className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                        type="button"
                        onClick={() => onToggleDemoMode?.(false)}
                    >
                        <span aria-hidden="true" className="text-lg">
                            🧪
                        </span>
                        <span>Demo Mode</span>
                    </button>
                )}
                <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
                    <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                            backgroundColor:
                                connectionStatus === "live"
                                    ? designTokens.colors.statusLive
                                    : designTokens.colors.statusDemo,
                        }}
                    />
                    <span>
                        {connectionStatus === "live" ? "Live" : "Manual"}
                    </span>
                </div>
                <IconButton ariaLabel="Open settings" onClick={onOpenSettings}>
                    <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            d="M10.2 2.9a1 1 0 0 1 1.6 0l1 1.37a7.9 7.9 0 0 1 1.75.72l1.62-.52a1 1 0 0 1 1.24.62l.83 2.02a1 1 0 0 1-.37 1.23l-1.35.95c.07.41.11.84.11 1.28 0 .44-.04.87-.11 1.29l1.35.94a1 1 0 0 1 .37 1.23l-.83 2.02a1 1 0 0 1-1.24.62l-1.62-.52c-.55.31-1.14.55-1.75.72l-1 1.37a1 1 0 0 1-1.6 0l-1-1.37a7.91 7.91 0 0 1-1.75-.72l-1.62.52a1 1 0 0 1-1.24-.62l-.83-2.02a1 1 0 0 1 .37-1.23l1.35-.94A7.98 7.98 0 0 1 7.2 12c0-.44.04-.87.11-1.28l-1.35-.95a1 1 0 0 1-.37-1.23l.83-2.02a1 1 0 0 1 1.24-.62l1.62.52c.55-.31 1.14-.55 1.75-.72l1-1.37Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        />
                        <circle
                            cx="12"
                            cy="12"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        />
                    </svg>
                </IconButton>
                {showBackButton ? (
                    <IconButton
                        ariaLabel="Go back"
                        onClick={() => router.back()}
                    >
                        <svg
                            aria-hidden="true"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M14.5 6.5 9 12l5.5 5.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                            />
                        </svg>
                    </IconButton>
                ) : (
                    <IconButton ariaLabel="Open history" href="/history">
                        <svg
                            aria-hidden="true"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M12 8v4l2.5 2.5M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                            />
                        </svg>
                    </IconButton>
                )}
            </div>
        </header>
    );
}
