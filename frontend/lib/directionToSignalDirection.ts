const SIGNAL_DIRECTIONS = [
  { label: "Front", value: 0 },
  { label: "Right", value: 90 },
  { label: "Behind", value: 180 },
  { label: "Left", value: 270 },
] as const;

export function directionToSignalDirection(direction: number) {
  const normalized = ((direction % 360) + 360) % 360;
  const index = Math.round(normalized / 90) % SIGNAL_DIRECTIONS.length;

  return SIGNAL_DIRECTIONS[index].label;
}
