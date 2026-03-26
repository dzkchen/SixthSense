const SIGNAL_DIRECTIONS = [
  { label: "Front", value: 0 },
  { label: "Front right", value: 45 },
  { label: "Right", value: 90 },
  { label: "Behind right", value: 135 },
  { label: "Behind", value: 180 },
  { label: "Behind left", value: 225 },
  { label: "Left", value: 270 },
  { label: "Front left", value: 315 },
] as const;

export function directionToSignalDirection(direction: number) {
  const normalized = ((direction % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % SIGNAL_DIRECTIONS.length;

  return SIGNAL_DIRECTIONS[index].label;
}
