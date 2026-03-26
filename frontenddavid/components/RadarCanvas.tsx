"use client";

import { useEffect, useRef } from "react";

import { designTokens } from "@/lib/designTokens";
import type { DirectionalMagnitudes } from "@/types/sound";

type RadarCanvasProps = {
  magnitudes: DirectionalMagnitudes;
  totalIntensity: number;
  highContrast: boolean;
  reduceAnimations: boolean;
};

type FieldState = {
  height: number;
  strength: number;
};

const REAR_BLEND_FACTOR = 0.7;
const REAR_FRONT_INFERENCE = 0.15;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

function directionDegreesToCanvasRadians(directionDegrees: number) {
  return ((directionDegrees - 90) * Math.PI) / 180;
}

function angleDeltaDegrees(angleA: number, angleB: number) {
  return Math.abs((((angleA - angleB) % 360) + 540) % 360 - 180);
}

function getRearMagnitude(magnitudes: DirectionalMagnitudes) {
  return clamp(
    ((magnitudes.left + magnitudes.right) / 2) * REAR_BLEND_FACTOR +
      magnitudes.front * REAR_FRONT_INFERENCE,
  );
}

function getDirectionalFieldStrength(
  magnitudes: DirectionalMagnitudes,
  angleDegrees: number,
) {
  const rearMagnitude = getRearMagnitude(magnitudes);
  const contributions = [
    { angle: 0, magnitude: magnitudes.front, sharpness: 4.8 },
    { angle: 90, magnitude: magnitudes.right, sharpness: 4.8 },
    { angle: 270, magnitude: magnitudes.left, sharpness: 4.8 },
    { angle: 180, magnitude: rearMagnitude, sharpness: 2.9 },
  ];

  const totalField = contributions.reduce((sum, source) => {
    const deltaRadians =
      (angleDeltaDegrees(angleDegrees, source.angle) * Math.PI) / 180;
    const influence = Math.pow(Math.max(0, Math.cos(deltaRadians)), source.sharpness);

    return sum + source.magnitude * influence;
  }, 0);

  return clamp(totalField);
}

function getFieldState(
  magnitudes: DirectionalMagnitudes,
  angleDegrees: number,
): FieldState {
  const samples = [
    { offset: -18, weight: 1 },
    { offset: -12, weight: 2 },
    { offset: -6, weight: 3 },
    { offset: 0, weight: 4 },
    { offset: 6, weight: 3 },
    { offset: 12, weight: 2 },
    { offset: 18, weight: 1 },
  ] as const;
  let weightedStrength = 0;
  let totalWeight = 0;

  samples.forEach((sample) => {
    weightedStrength +=
      getDirectionalFieldStrength(magnitudes, angleDegrees + sample.offset) *
      sample.weight;
    totalWeight += sample.weight;
  });

  const strength = weightedStrength / totalWeight;

  return {
    height: easeOutCubic(strength),
    strength,
  };
}

/** Draws a live magnitude-driven radar using blended front, left, and right sources. */
export function RadarCanvas({
  magnitudes,
  totalIntensity,
  highContrast,
  reduceAnimations,
}: RadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<RadarCanvasProps>({
    highContrast,
    magnitudes,
    reduceAnimations,
    totalIntensity,
  });
  const phaseOffsetRef = useRef(0);

  useEffect(() => {
    propsRef.current = {
      highContrast,
      magnitudes,
      reduceAnimations,
      totalIntensity,
    };
  }, [highContrast, magnitudes, reduceAnimations, totalIntensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let animationFrameId = 0;

    const resizeCanvas = () => {
      const size = Math.floor(Math.min(container.clientWidth, container.clientHeight));
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = size * pixelRatio;
      canvas.height = size * pixelRatio;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    resizeCanvas();

    const drawFrame = () => {
      const {
        highContrast: currentHighContrast,
        magnitudes: currentMagnitudes,
        reduceAnimations: currentReduceAnimations,
        totalIntensity: currentTotalIntensity,
      } = propsRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const radius = Math.min(width, height) / 2 - 16;

      if (!Number.isFinite(radius) || radius <= 0) {
        context.clearRect(0, 0, width, height);
        animationFrameId = window.requestAnimationFrame(drawFrame);
        return;
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const ambientPresence = Math.max(0.28, 1 - currentTotalIntensity * 1.1);
      const ambientPhase = currentReduceAnimations ? 1.2 : phaseOffsetRef.current;
      const ambientBreath = currentReduceAnimations
        ? 0.55
        : (Math.sin(ambientPhase * 0.9) + 1) / 2;

      if (!currentReduceAnimations) {
        phaseOffsetRef.current += 0.008;
      }

      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(centerX, centerY);
      context.lineCap = "round";
      context.lineJoin = "round";

      const radarGradient = context.createLinearGradient(
        -radius,
        -radius,
        radius,
        radius,
      );
      radarGradient.addColorStop(0, designTokens.radar.waveStart);
      radarGradient.addColorStop(0.42, designTokens.radar.waveMid);
      radarGradient.addColorStop(0.76, designTokens.radar.waveEnd);
      radarGradient.addColorStop(1, designTokens.radar.waveAccent);

      const centerGlow = context.createRadialGradient(0, 0, 0, 0, 0, radius * 0.42);
      centerGlow.addColorStop(
        0,
        `rgba(${designTokens.radar.centerGlow}, ${
          currentTotalIntensity * 0.22 +
          ambientPresence * 0.05 * (0.72 + ambientBreath * 0.58)
        })`,
      );
      centerGlow.addColorStop(1, `rgba(${designTokens.radar.centerGlow}, 0)`);
      context.fillStyle = centerGlow;
      context.beginPath();
      context.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = designTokens.radar.ringStroke;
      context.lineWidth = currentHighContrast ? 1.8 : 1.5;
      context.globalAlpha =
        (currentHighContrast ? 0.76 : 0.46) + ambientPresence * 0.05 * ambientBreath;
      [0.33, 0.66, 1].forEach((multiplier) => {
        context.beginPath();
        context.arc(0, 0, radius * multiplier, 0, Math.PI * 2);
        context.stroke();
      });
      context.globalAlpha = 1;

      const ambientLayerCount = 6;
      const ambientSteps = 220;
      const baseRadius =
        radius *
        (0.218 +
          currentTotalIntensity * 0.03 +
          ambientPresence * 0.012 +
          ambientPresence * ambientBreath * 0.015);

      for (let layer = 0; layer < ambientLayerCount; layer += 1) {
        const layerOffset = (layer - (ambientLayerCount - 1) / 2) * 2.4;

        for (let step = 0; step < ambientSteps; step += 1) {
          const angleDegrees = (step / ambientSteps) * 360;
          const nextAngleDegrees = ((step + 1) / ambientSteps) * 360;
          const theta = directionDegreesToCanvasRadians(angleDegrees);
          const nextTheta = directionDegreesToCanvasRadians(nextAngleDegrees);
          const ripple =
            currentReduceAnimations
              ? 0
              : Math.sin(theta * 4 + ambientPhase + layer * 0.24) *
                    radius *
                    (0.008 + currentTotalIntensity * 0.012) +
                Math.sin(theta * 7 - ambientPhase * 0.6 + layer * 0.18) *
                    radius *
                    0.0035;
          const nextRipple =
            currentReduceAnimations
              ? 0
              : Math.sin(nextTheta * 4 + ambientPhase + layer * 0.24) *
                    radius *
                    (0.008 + currentTotalIntensity * 0.012) +
                Math.sin(nextTheta * 7 - ambientPhase * 0.6 + layer * 0.18) *
                    radius *
                    0.0035;
          const radialDistance = Math.min(
            radius - 10,
            baseRadius + layerOffset + ripple,
          );
          const nextRadialDistance = Math.min(
            radius - 10,
            baseRadius + layerOffset + nextRipple,
          );
          const x = Math.cos(theta) * radialDistance;
          const y = Math.sin(theta) * radialDistance;
          const nextX = Math.cos(nextTheta) * nextRadialDistance;
          const nextY = Math.sin(nextTheta) * nextRadialDistance;

          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(nextX, nextY);
          context.strokeStyle = radarGradient;
          context.globalAlpha =
            0.12 +
            layer * 0.03 +
            currentTotalIntensity * 0.16 +
            ambientPresence * 0.03 * (0.45 + ambientBreath);
          context.lineWidth = currentHighContrast ? 2.1 : 1.6;
          context.stroke();
        }
      }
      context.globalAlpha = 1;

      const slotCount = 120;
      const maxSpokeSegments = 10;
      const spokeInnerRadius = radius * (0.248 + currentTotalIntensity * 0.014);
      const segmentLength = radius * 0.0135;
      const segmentGap = radius * 0.0052;
      const spokeThickness = currentHighContrast
        ? Math.max(3.2, radius * 0.0105)
        : Math.max(2.4, radius * 0.0088);

      context.lineCap = "butt";

      for (let slot = 0; slot < slotCount; slot += 1) {
        const angleDegrees = (slot / slotCount) * 360;
        const theta = directionDegreesToCanvasRadians(angleDegrees);
        const slotState = getFieldState(currentMagnitudes, angleDegrees);
        const slotHeight = slotState.height * maxSpokeSegments;

        if (slotHeight <= 0.04) {
          continue;
        }

        for (let segmentIndex = 0; segmentIndex < maxSpokeSegments; segmentIndex += 1) {
          const segmentFill = clamp(slotHeight - segmentIndex);

          if (segmentFill <= 0.01) {
            continue;
          }

          const segmentStart =
            spokeInnerRadius + segmentIndex * (segmentLength + segmentGap);
          const segmentEnd = segmentStart + segmentLength;
          const x = Math.cos(theta) * segmentStart;
          const y = Math.sin(theta) * segmentStart;
          const nextX = Math.cos(theta) * segmentEnd;
          const nextY = Math.sin(theta) * segmentEnd;

          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(nextX, nextY);
          context.strokeStyle = radarGradient;
          context.globalAlpha =
            (0.14 +
              slotState.strength * 0.28 +
              (segmentIndex / maxSpokeSegments) * 0.07) *
            segmentFill *
            (0.52 + slotState.strength * 0.48);
          context.lineWidth = spokeThickness;
          context.stroke();
        }
      }

      context.lineCap = "round";

      const waveSteps = 220;
      const waveLayerCount = 2;
      const minimumWaveGap = radius * 0.05;
      const waveOuterOffset = radius * 0.088;
      const waveLayerGap = 6;

      for (let layer = 0; layer < waveLayerCount; layer += 1) {
        for (let step = 0; step < waveSteps; step += 1) {
          const angleDegrees = (step / waveSteps) * 360;
          const nextAngleDegrees = ((step + 1) / waveSteps) * 360;
          const theta = directionDegreesToCanvasRadians(angleDegrees);
          const nextTheta = directionDegreesToCanvasRadians(nextAngleDegrees);
          const slotState = getFieldState(currentMagnitudes, angleDegrees);
          const nextSlotState = getFieldState(currentMagnitudes, nextAngleDegrees);
          const slotHeight = slotState.height * maxSpokeSegments;
          const nextSlotHeight = nextSlotState.height * maxSpokeSegments;
          const wavePresence = 0.14 + slotState.strength * 0.82;
          const nextWavePresence = 0.14 + nextSlotState.strength * 0.82;
          const spokeOuterEdge =
            spokeInnerRadius +
            slotHeight * (segmentLength + segmentGap) +
            segmentLength;
          const nextSpokeOuterEdge =
            spokeInnerRadius +
            nextSlotHeight * (segmentLength + segmentGap) +
            segmentLength;
          const contourLift =
            radius * (0.008 + slotState.height * 0.014 + slotState.strength * 0.03);
          const nextContourLift =
            radius *
            (0.008 +
              nextSlotState.height * 0.014 +
              nextSlotState.strength * 0.03);
          const waveRipple =
            currentReduceAnimations
              ? 0
              : Math.sin(theta * 3 + ambientPhase * 1.08 + layer * 0.74) *
                    radius *
                    (0.004 + slotState.strength * 0.015) +
                Math.sin(theta * 6 - ambientPhase * 0.68 + layer * 0.34) *
                    radius *
                    0.0032;
          const nextWaveRipple =
            currentReduceAnimations
              ? 0
              : Math.sin(nextTheta * 3 + ambientPhase * 1.08 + layer * 0.74) *
                    radius *
                    (0.004 + nextSlotState.strength * 0.015) +
                Math.sin(nextTheta * 6 - ambientPhase * 0.68 + layer * 0.34) *
                    radius *
                    0.0032;
          const minimumWaveRadius =
            spokeOuterEdge + minimumWaveGap + layer * waveLayerGap;
          const nextMinimumWaveRadius =
            nextSpokeOuterEdge + minimumWaveGap + layer * waveLayerGap;
          const waveRadius = Math.max(
            minimumWaveRadius,
            spokeOuterEdge +
              waveOuterOffset +
              contourLift +
              layer * waveLayerGap +
              waveRipple,
          );
          const nextWaveRadius = Math.max(
            nextMinimumWaveRadius,
            nextSpokeOuterEdge +
              waveOuterOffset +
              nextContourLift +
              layer * waveLayerGap +
              nextWaveRipple,
          );
          const baselineRadius =
            spokeInnerRadius + minimumWaveGap + waveOuterOffset + layer * waveLayerGap;
          const blendedWaveRadius =
            waveRadius * wavePresence + baselineRadius * (1 - wavePresence);
          const nextBlendedWaveRadius =
            nextWaveRadius * nextWavePresence +
            baselineRadius * (1 - nextWavePresence);
          const x = Math.cos(theta) * blendedWaveRadius;
          const y = Math.sin(theta) * blendedWaveRadius;
          const nextX = Math.cos(nextTheta) * nextBlendedWaveRadius;
          const nextY = Math.sin(nextTheta) * nextBlendedWaveRadius;

          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(nextX, nextY);
          context.strokeStyle = radarGradient;
          context.globalAlpha =
            0.13 +
            slotState.strength * 0.18 -
            layer * 0.025;
          context.lineWidth = currentHighContrast ? 2.05 - layer * 0.16 : 1.5 - layer * 0.1;
          context.stroke();
        }
      }

      context.globalAlpha = 1;
      context.fillStyle = designTokens.radar.centerDot;
      context.beginPath();
      context.arc(0, 0, 5, 0, Math.PI * 2);
      context.fill();

      context.restore();
      animationFrameId = window.requestAnimationFrame(drawFrame);
    };

    animationFrameId = window.requestAnimationFrame(drawFrame);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex w-full items-center justify-center"
      style={{
        height: "min(calc(100vw - 32px), calc(100dvh - 64px - 24px))",
        width: "min(calc(100vw - 32px), calc(100dvh - 64px - 24px))",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Spatial magnitude radar"
        className="h-full w-full rounded-[32px]"
      />
    </div>
  );
}
