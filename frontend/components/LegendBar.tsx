import { soundColors } from "@/lib/soundColors";

const LEGEND_ITEMS = [
  { label: "Voice", tone: soundColors.voice },
  { label: "Vehicle", tone: soundColors.vehicle },
  { label: "Alarm", tone: soundColors.alarm },
  { label: "Unknown", tone: soundColors.unknown },
] as const;

/** Shows the sound color legend and the manual direction hint. */
export function LegendBar() {
  return (
    <section className="flex h-20 flex-col justify-center border-t border-border bg-surface">
      <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
        {LEGEND_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.tone }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <p className="px-4 text-sm text-muted">
        Use the direction buttons to simulate sound from any angle
      </p>
    </section>
  );
}
