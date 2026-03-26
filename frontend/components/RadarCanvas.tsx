"use client";

import { useEffect, useRef } from "react";

import { designTokens } from "@/lib/designTokens";
import { soundColors } from "@/lib/soundColors";
import type { SoundEvent } from "@/types/sound";

type RadarCanvasProps = {
  sounds: SoundEvent[];
  totalIntensity: number;
  isPaused: boolean;
  highContrast: boolean;
  reduceAnimations: boolean;
};

function directionDegreesToCanvasRadians(directionDegrees: number) {
  return ((directionDegrees - 90) * Math.PI) / 180;
}

function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "");
  const value = Number.parseInt(sanitized, 16);

  return {
    b: value & 255,
    g: (value >> 8) & 255,
    r: (value >> 16) & 255,
  };
}

function mixWaveColor(sounds: SoundEvent[], angleDegrees: number) {
  const now = Date.now();
  let totalWeight = 0;
  let mixedR = 0;
  let mixedG = 0;
  let mixedB = 0;

  sounds.forEach((sound) => {
    const fadeProgress = sound.isActive
      ? 1
      : Math.max(0, 1 - (now - sound.lastSeenAt) / 1500);
    const delta = Math.abs((((angleDegrees - sound.direction) % 360) + 540) % 360 - 180);
    const directionWeight = Math.max(0, 1 - delta / 65);
    const weight = directionWeight * sound.intensity * fadeProgress;

    if (weight <= 0) {
      return;
    }

    const rgb = hexToRgb(soundColors[sound.label]);
    totalWeight += weight;
    mixedR += rgb.r * weight;
    mixedG += rgb.g * weight;
    mixedB += rgb.b * weight;
  });

  if (totalWeight === 0) {
    return `rgba(${hexToRgb(soundColors.unknown).r}, ${hexToRgb(soundColors.unknown).g}, ${hexToRgb(soundColors.unknown).b}, 0.16)`;
  }

  return `rgba(${Math.round(mixedR / totalWeight)}, ${Math.round(
    mixedG / totalWeight,
  )}, ${Math.round(mixedB / totalWeight)}, 0.9)`;
}

function dominantSoundColor(sounds: SoundEvent[]) {
  const now = Date.now();
  const dominantSound = sounds.reduce<SoundEvent | null>((strongest, sound) => {
    const fadeProgress = sound.isActive
      ? 1
      : Math.max(0, 1 - (now - sound.lastSeenAt) / 1500);
    const weightedIntensity = sound.intensity * fadeProgress;

    if (!strongest) {
      return weightedIntensity > 0 ? sound : null;
    }

    const strongestWeight =
      strongest.intensity *
      (strongest.isActive
        ? 1
        : Math.max(0, 1 - (now - strongest.lastSeenAt) / 1500));

    return weightedIntensity > strongestWeight ? sound : strongest;
  }, null);

  return dominantSound ? soundColors[dominantSound.label] : soundColors.voice;
}

/** Draws the realtime radial sound visualizer on a retina-safe canvas surface. */
export function RadarCanvas({
  sounds,
  totalIntensity,
  isPaused,
  highContrast,
  reduceAnimations,
}: RadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<RadarCanvasProps>({
    highContrast,
    isPaused,
    reduceAnimations,
    sounds,
    totalIntensity,
  });
  const phaseOffsetRef = useRef(0);
  const flashOpacityRef = useRef(0);
  const prevAlarmIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    propsRef.current = {
      highContrast,
      isPaused,
      reduceAnimations,
      sounds,
      totalIntensity,
    };
  }, [highContrast, isPaused, reduceAnimations, sounds, totalIntensity]);

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
        isPaused: currentIsPaused,
        reduceAnimations: currentReduceAnimations,
        sounds: currentSounds,
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
      const dominantColor = dominantSoundColor(currentSounds);
      const dominantGlow = hexToRgb(dominantColor);
      const ambientPresence = Math.max(0.28, 1 - currentTotalIntensity * 1.15);
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

      const centerGlow = context.createRadialGradient(0, 0, 0, 0, 0, radius * 0.4);
      centerGlow.addColorStop(
        0,
        `rgba(${dominantGlow.r}, ${dominantGlow.g}, ${dominantGlow.b}, ${
          currentTotalIntensity * 0.18 +
          ambientPresence * 0.05 * (0.7 + ambientBreath * 0.6)
        })`,
      );
      centerGlow.addColorStop(1, `rgba(${dominantGlow.r}, ${dominantGlow.g}, ${dominantGlow.b}, 0)`);
      context.fillStyle = centerGlow;
      context.beginPath();
      context.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = designTokens.radar.ringStroke;
      context.lineWidth = 1.5;
      context.globalAlpha =
        (currentHighContrast ? 0.6 : 0.3) + ambientPresence * 0.04 * ambientBreath;
      [0.33, 0.66, 1].forEach((multiplier) => {
        context.beginPath();
        context.arc(0, 0, radius * multiplier, 0, Math.PI * 2);
        context.stroke();
      });
      context.globalAlpha = 1;

      const baseRadius =
        radius *
        (0.218 +
          currentTotalIntensity * 0.06 +
          ambientPresence * 0.014 +
          ambientPresence * ambientBreath * 0.015);
      const edgeReach = radius * (0.18 + currentTotalIntensity * 0.38);
      const layerCount = 7;
      const steps = 220;
      const getAmbientShapeMotion = (theta: number, layer: number) => {
        const ambientRibbon =
          radius *
          (0.01 + layer * 0.0007) *
          ambientPresence *
          Math.sin(theta * 3 + ambientPhase * 0.82 + layer * 0.45);
        const ambientCrossRibbon =
          radius *
          (0.008 + (layerCount - layer) * 0.0006) *
          ambientPresence *
          Math.sin(theta * 5 - ambientPhase * 0.58 - layer * 0.32);
        const ambientUndertow =
          radius *
          0.0045 *
          ambientPresence *
          Math.cos(theta * 7 - ambientPhase * 0.3 + layer * 0.18);

        return ambientRibbon + ambientCrossRibbon + ambientUndertow;
      };

      for (let layer = 0; layer < layerCount; layer += 1) {
        const layerOffset = (layer - (layerCount - 1) / 2) * 2.2;

        for (let step = 0; step < steps; step += 1) {
          const angleDegrees = (step / steps) * 360;
          const nextAngleDegrees = ((step + 1) / steps) * 360;
          const theta = directionDegreesToCanvasRadians(angleDegrees);
          const nextTheta = directionDegreesToCanvasRadians(nextAngleDegrees);

          const waveContribution = currentSounds.reduce((sum, sound) => {
            const fadeProgress = sound.isActive
              ? 1
              : Math.max(0, 1 - (Date.now() - sound.lastSeenAt) / 1500);
            const deltaFromSound = Math.abs(
              (((angleDegrees - sound.direction) % 360) + 540) % 360 - 180,
            );
            const directionalWeight = Math.max(0, 1 - deltaFromSound / 65);

            return sum + directionalWeight * sound.intensity * fadeProgress;
          }, 0);

          const nextWaveContribution = currentSounds.reduce((sum, sound) => {
            const fadeProgress = sound.isActive
              ? 1
              : Math.max(0, 1 - (Date.now() - sound.lastSeenAt) / 1500);
            const deltaFromSound = Math.abs(
              (((nextAngleDegrees - sound.direction) % 360) + 540) % 360 - 180,
            );
            const directionalWeight = Math.max(0, 1 - deltaFromSound / 65);

            return sum + directionalWeight * sound.intensity * fadeProgress;
          }, 0);

          const waveMotion = currentReduceAnimations
            ? 0
            : Math.sin(theta * 4 + phaseOffsetRef.current + layer * 0.22) *
              radius *
              0.015 *
              (0.4 + waveContribution);
          const nextWaveMotion = currentReduceAnimations
            ? 0
            : Math.sin(nextTheta * 4 + phaseOffsetRef.current + layer * 0.22) *
              radius *
              0.015 *
              (0.4 + nextWaveContribution);
          const ambientShapeMotion = getAmbientShapeMotion(theta, layer);
          const nextAmbientShapeMotion = getAmbientShapeMotion(nextTheta, layer);

          const radialDistance = Math.min(
            radius - 8,
            baseRadius +
              layerOffset +
              ambientShapeMotion +
              waveContribution * edgeReach +
              waveMotion,
          );
          const nextRadialDistance = Math.min(
            radius - 8,
            baseRadius +
              layerOffset +
              nextAmbientShapeMotion +
              nextWaveContribution * edgeReach +
              nextWaveMotion,
          );

          const x = Math.cos(theta) * radialDistance;
          const y = Math.sin(theta) * radialDistance;
          const nextX = Math.cos(nextTheta) * nextRadialDistance;
          const nextY = Math.sin(nextTheta) * nextRadialDistance;

          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(nextX, nextY);
          context.strokeStyle = mixWaveColor(currentSounds, angleDegrees);
          context.globalAlpha =
            0.22 + layer * 0.065 + ambientPresence * 0.04 * (0.45 + ambientBreath);
          context.lineWidth = currentHighContrast ? 2 : 1.35;
          context.stroke();
        }
      }
      context.globalAlpha = 1;

      context.fillStyle = designTokens.radar.centerDot;
      context.beginPath();
      context.arc(0, 0, 5, 0, Math.PI * 2);
      context.fill();

      const currentAlarmIds = new Set(
        currentSounds
          .filter((sound) => sound.isActive && sound.label === "alarm")
          .map((sound) => sound.id),
      );
      currentAlarmIds.forEach((alarmId) => {
        if (!prevAlarmIdsRef.current.has(alarmId)) {
          flashOpacityRef.current = 1;
        }
      });
      prevAlarmIdsRef.current = currentAlarmIds;

      flashOpacityRef.current = Math.max(0, flashOpacityRef.current - 0.05);
      if (flashOpacityRef.current > 0) {
        context.strokeStyle = `rgba(239, 68, 68, ${flashOpacityRef.current})`;
        context.lineWidth = 8;
        context.strokeRect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 16);
      }

      if (currentIsPaused) {
        context.fillStyle = designTokens.colors.muted;
        context.font = "700 12px var(--font-inter)";
        context.textAlign = "center";
        context.fillText("PAUSED", 0, -height / 2 + 24);
      }

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
        height: "min(calc(100vw - 32px), calc(100dvh - 56px - 80px))",
        width: "min(calc(100vw - 32px), calc(100dvh - 56px - 80px))",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Spatial sound radar"
        className="h-full w-full rounded-[32px]"
      />
    </div>
  );
}
