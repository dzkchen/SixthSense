"use client";

import { useEffect, useRef } from "react";

import { designTokens } from "@/lib/designTokens";
import { soundColors } from "@/lib/soundColors";
import type { SoundEvent } from "@/types/sound";

type RadarCanvasProps = {
  sounds: SoundEvent[];
  totalIntensity: number;
  highContrast: boolean;
  reduceAnimations: boolean;
};

const ACTIVE_PEAK_INTRO_MS = 260;

function directionDegreesToCanvasRadians(directionDegrees: number) {
  return ((directionDegrees - 90) * Math.PI) / 180;
}

function angleDeltaDegrees(angleA: number, angleB: number) {
  return Math.abs((((angleA - angleB) % 360) + 540) % 360 - 180);
}

function getFadeProgress(sound: SoundEvent, now: number) {
  return sound.isActive ? 1 : Math.max(0, 1 - (now - sound.lastSeenAt) / 1500);
}

function getSoundVisualWeight(sound: SoundEvent, now: number) {
  return sound.intensity * getFadeProgress(sound, now);
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutBack(value: number) {
  const c1 = 1.15;
  const c3 = c1 + 1;
  const shiftedValue = value - 1;

  return 1 + c3 * shiftedValue ** 3 + c1 * shiftedValue ** 2;
}

function getElasticIntroProgress(startedAt: number, now: number, reduceAnimations: boolean) {
  if (reduceAnimations) {
    return 1;
  }

  return easeOutBack(clamp((now - startedAt) / ACTIVE_PEAK_INTRO_MS));
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

function mixWaveColor(sounds: SoundEvent[], angleDegrees: number, now: number) {
  let totalWeight = 0;
  let mixedR = 0;
  let mixedG = 0;
  let mixedB = 0;

  sounds.forEach((sound) => {
    const fadeProgress = getFadeProgress(sound, now);
    const delta = angleDeltaDegrees(angleDegrees, sound.direction);
    const directionWeight = Math.max(0, 1 - delta / 90);
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

function getDominantSound(sounds: SoundEvent[], now: number) {
  return sounds.reduce<SoundEvent | null>((strongest, sound) => {
    const weightedIntensity = getSoundVisualWeight(sound, now);

    if (!strongest) {
      return weightedIntensity > 0 ? sound : null;
    }

    return weightedIntensity > getSoundVisualWeight(strongest, now) ? sound : strongest;
  }, null);
}

function dominantSoundColor(sounds: SoundEvent[], now: number) {
  const dominantSound = getDominantSound(sounds, now);
  return dominantSound ? soundColors[dominantSound.label] : soundColors.voice;
}

/** Draws the realtime radial sound visualizer on a retina-safe canvas surface. */
export function RadarCanvas({
  sounds,
  totalIntensity,
  highContrast,
  reduceAnimations,
}: RadarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<RadarCanvasProps>({
    highContrast,
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
      reduceAnimations,
      sounds,
      totalIntensity,
    };
  }, [highContrast, reduceAnimations, sounds, totalIntensity]);

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
      const now = Date.now();
      const dominantSound = getDominantSound(currentSounds, now);
      const dominantColor = dominantSoundColor(currentSounds, now);
      const dominantGlow = hexToRgb(dominantColor);
      const ringRgb = hexToRgb(designTokens.radar.ringStroke);
      const ambientPresence = Math.max(0.28, 1 - currentTotalIntensity * 1.15);
      const ambientPhase = currentReduceAnimations ? 1.2 : phaseOffsetRef.current;
      const ambientBreath = currentReduceAnimations
        ? 0.55
        : (Math.sin(ambientPhase * 0.9) + 1) / 2;
      const activeVisualWeight = dominantSound
        ? Math.max(0, Math.min(1, getSoundVisualWeight(dominantSound, now)))
        : 0;
      const renderableSounds = currentSounds
        .map((sound) => {
          const visualWeight = getSoundVisualWeight(sound, now);

          if (visualWeight <= 0.02) {
            return null;
          }

          return {
            color: hexToRgb(soundColors[sound.label]),
            introProgress: getElasticIntroProgress(
              sound.startedAt,
              now,
              currentReduceAnimations,
            ),
            sound,
            visualWeight: clamp(visualWeight),
          };
        })
        .filter((sound) => sound !== null);
      const newestStartedAt = renderableSounds.reduce(
        (latestStartedAt, sound) =>
          Math.max(latestStartedAt, sound.sound.startedAt),
        0,
      );
      const peakSounds = renderableSounds.map((sound) => {
        const isNewest = sound.sound.startedAt === newestStartedAt;
        const newestBoost =
          isNewest && !currentReduceAnimations
            ? Math.max(0, sound.introProgress - 1)
            : 0;
        const widthBias = sound.visualWeight * 8 + newestBoost * 28;

        return {
          ...sound,
          coreWidth: Math.max(18, 34 - widthBias),
          crestSharpness: 2.6 + sound.visualWeight * 1.8 + newestBoost * 9,
          isNewest,
          newestBoost,
          peakReach:
            radius *
            (0.022 + sound.visualWeight * 0.072) *
            Math.max(0, sound.introProgress) *
            (1 + newestBoost * 1.05),
          shoulderWidth: Math.max(36, 64 - widthBias * 0.55),
          wakeWidth: Math.max(58, 92 - widthBias * 0.3),
        };
      });
      const newestPeakSound =
        peakSounds.find((sound) => sound.isNewest) ?? null;
      const hasActiveSignal = peakSounds.length > 0;

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
          currentTotalIntensity * 0.028 +
          ambientPresence * 0.014 +
          ambientPresence * ambientBreath * 0.015);
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
      const shouldRenderStaticCircle = currentReduceAnimations;

      for (let layer = 0; layer < layerCount; layer += 1) {
        const layerOffset = (layer - (layerCount - 1) / 2) * 2.2;

        for (let step = 0; step < steps; step += 1) {
          const angleDegrees = (step / steps) * 360;
          const nextAngleDegrees = ((step + 1) / steps) * 360;
          const theta = directionDegreesToCanvasRadians(angleDegrees);
          const nextTheta = directionDegreesToCanvasRadians(nextAngleDegrees);

          const waveMotion = currentReduceAnimations
            ? 0
            : Math.sin(theta * 4 + phaseOffsetRef.current + layer * 0.22) *
              radius *
              0.015 *
              (0.4 + ambientPresence * 0.35);
          const nextWaveMotion = currentReduceAnimations
            ? 0
            : Math.sin(nextTheta * 4 + phaseOffsetRef.current + layer * 0.22) *
              radius *
              0.015 *
              (0.4 + ambientPresence * 0.35);
          const ambientShapeMotion = shouldRenderStaticCircle
            ? 0
            : getAmbientShapeMotion(theta, layer);
          const nextAmbientShapeMotion = shouldRenderStaticCircle
            ? 0
            : getAmbientShapeMotion(nextTheta, layer);

          const radialDistance = Math.min(
            radius - 8,
            baseRadius +
              layerOffset +
              ambientShapeMotion +
              waveMotion,
          );
          const nextRadialDistance = Math.min(
            radius - 8,
            baseRadius +
              layerOffset +
              nextAmbientShapeMotion +
              nextWaveMotion,
          );

          const x = Math.cos(theta) * radialDistance;
          const y = Math.sin(theta) * radialDistance;
          const nextX = Math.cos(nextTheta) * nextRadialDistance;
          const nextY = Math.sin(nextTheta) * nextRadialDistance;

          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(nextX, nextY);
          context.strokeStyle = `rgba(${ringRgb.r}, ${ringRgb.g}, ${ringRgb.b}, 1)`;
          context.globalAlpha =
            0.18 +
            layer * 0.055 +
            ambientPresence * 0.03 * (0.45 + ambientBreath) -
            activeVisualWeight * 0.06;
          context.lineWidth = currentHighContrast ? 2 : 1.35;
          context.stroke();
        }
      }
      context.globalAlpha = 1;

      if (hasActiveSignal) {
        const peakBaseRadius = radius * (0.222 + currentTotalIntensity * 0.014);
        const peakLayerCount = 4;
        const peakSteps = 260;
        const getPeakState = (angleDegrees: number, layer: number) => {
          let totalContribution = 0;

          peakSounds.forEach((sound) => {
            const angleDelta = angleDeltaDegrees(angleDegrees, sound.sound.direction);
            const layerSoftening = 1 - layer * 0.08;
            const core =
              angleDelta <= sound.coreWidth
                ? Math.pow(
                    Math.max(
                      0,
                      Math.cos((angleDelta / sound.coreWidth) * (Math.PI / 2)),
                    ),
                    sound.crestSharpness,
                  )
                : 0;
            const shoulder =
              angleDelta <= sound.shoulderWidth
                ? Math.pow(
                    Math.max(
                      0,
                      Math.cos(
                        (angleDelta / sound.shoulderWidth) * (Math.PI / 2),
                      ),
                    ),
                    2.1,
                  )
                : 0;
            const cometWake =
              angleDelta <= sound.wakeWidth
                ? Math.pow(
                    Math.max(
                      0,
                      Math.cos((angleDelta / sound.wakeWidth) * (Math.PI / 2)),
                    ),
                    1.2,
                  ) * 0.18
                : 0;

            totalContribution +=
              sound.peakReach *
              layerSoftening *
              (core + shoulder * 0.32 + cometWake);
          });

          const clampedContribution = Math.min(radius * 0.17, totalContribution);

          return {
            displacement: clampedContribution,
            strength: clamp(clampedContribution / (radius * 0.14)),
          };
        };

        for (let layer = 0; layer < peakLayerCount; layer += 1) {
          const layerOffset = (layer - (peakLayerCount - 1) / 2) * 2.2;

          for (let step = 0; step < peakSteps; step += 1) {
            const angleDegrees = (step / peakSteps) * 360;
            const nextAngleDegrees = ((step + 1) / peakSteps) * 360;
            const theta = directionDegreesToCanvasRadians(angleDegrees);
            const nextTheta = directionDegreesToCanvasRadians(nextAngleDegrees);
            const peakState = getPeakState(angleDegrees, layer);
            const nextPeakState = getPeakState(nextAngleDegrees, layer);
            const radialDistance =
              peakBaseRadius + layerOffset + peakState.displacement;
            const nextRadialDistance =
              peakBaseRadius + layerOffset + nextPeakState.displacement;
            const x = Math.cos(theta) * radialDistance;
            const y = Math.sin(theta) * radialDistance;
            const nextX = Math.cos(nextTheta) * nextRadialDistance;
            const nextY = Math.sin(nextTheta) * nextRadialDistance;

            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(nextX, nextY);
            context.strokeStyle = mixWaveColor(currentSounds, angleDegrees, now);
            context.globalAlpha =
              0.09 +
              layer * 0.045 +
              peakState.strength * (0.2 + layer * 0.015);
            context.lineWidth = currentHighContrast ? 2.2 - layer * 0.18 : 1.7 - layer * 0.12;
            context.stroke();
          }
        }

        if (newestPeakSound) {
          const newestTheta = directionDegreesToCanvasRadians(
            newestPeakSound.sound.direction,
          );
          const newestTipDistance =
            peakBaseRadius + newestPeakSound.peakReach * 0.98;
          const tipX = Math.cos(newestTheta) * newestTipDistance;
          const tipY = Math.sin(newestTheta) * newestTipDistance;
          const tipGlowRadius =
            radius *
            (0.06 +
              newestPeakSound.visualWeight * 0.05 +
              newestPeakSound.newestBoost * 0.18);
          const tipGlow = context.createRadialGradient(
            tipX,
            tipY,
            radius * 0.01,
            tipX,
            tipY,
            tipGlowRadius,
          );
          tipGlow.addColorStop(
            0,
            `rgba(${newestPeakSound.color.r}, ${newestPeakSound.color.g}, ${
              newestPeakSound.color.b
            }, ${0.08 + newestPeakSound.visualWeight * 0.08 + newestPeakSound.newestBoost * 0.2})`,
          );
          tipGlow.addColorStop(
            1,
            `rgba(${newestPeakSound.color.r}, ${newestPeakSound.color.g}, ${newestPeakSound.color.b}, 0)`,
          );
          context.fillStyle = tipGlow;
          context.beginPath();
          context.arc(tipX, tipY, tipGlowRadius, 0, Math.PI * 2);
          context.fill();
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
