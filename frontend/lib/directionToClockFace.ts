const CLOCK_LABELS = [
  "12 o'clock",
  "1 o'clock",
  "2 o'clock",
  "3 o'clock",
  "4 o'clock",
  "5 o'clock",
  "6 o'clock",
  "7 o'clock",
  "8 o'clock",
  "9 o'clock",
  "10 o'clock",
  "11 o'clock",
] as const;

export function directionToClockFace(direction: number): string {
  const normalized = ((direction % 360) + 360) % 360;
  const index = Math.round(normalized / 30) % CLOCK_LABELS.length;

  return CLOCK_LABELS[index];
}
