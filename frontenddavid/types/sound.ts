export type DirectionalMagnitudes = {
  front: number;
  left: number;
  right: number;
};

export type ConnectionStatus = "live" | "offline";

export type MagnitudeMessage = {
  type: "magnitude_update";
  magnitudes: DirectionalMagnitudes;
};
