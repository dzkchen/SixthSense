from __future__ import annotations

import asyncio
import os
import threading
import time
from contextlib import asynccontextmanager
from typing import Any

import numpy as np
import sounddevice as sd
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from scipy.signal import correlate

HOST = os.getenv("SIXTHSENSE_HOST", "0.0.0.0")
PORT = int(os.getenv("SIXTHSENSE_PORT", "8000"))
WS_PATH = "/ws/audio-stream"

DEVICE_INDEX = int(os.getenv("SIXTHSENSE_DEVICE_INDEX", "7"))
SAMPLE_RATE = int(os.getenv("SIXTHSENSE_SAMPLE_RATE", "44100"))
DURATION = float(os.getenv("SIXTHSENSE_CHUNK_DURATION", "0.5"))
THRESHOLD = float(os.getenv("SIXTHSENSE_SOUND_THRESHOLD", "0.80"))
MIN_DELAY_SAMPLES = int(os.getenv("SIXTHSENSE_MIN_DELAY_SAMPLES", "5"))
SILENCE_TIMEOUT_MS = int(os.getenv("SIXTHSENSE_SILENCE_TIMEOUT_MS", "1200"))
LEFT_CHANNEL_GAIN = float(os.getenv("SIXTHSENSE_LEFT_CHANNEL_GAIN", "3"))
SOUND_ID = "microphone-primary"
SOUND_LABEL = "unknown"


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def get_delay(left_channel: np.ndarray, right_channel: np.ndarray) -> int:
    correlation = correlate(left_channel, right_channel, mode="full")
    return int(np.argmax(correlation) - (len(left_channel) - 1))


def normalize_channel(channel: np.ndarray) -> np.ndarray:
    peak = np.max(np.abs(channel)) + 1e-6
    return channel / peak


def get_channel_peaks(audio: np.ndarray) -> tuple[float, float, float] | tuple[float, float]:
    """Get peak amplitude for each channel separately with normalization multipliers.
    
    Channel order: left (0), right (1), center (2)
    Applies normalization: left * 2.367 * LEFT_CHANNEL_GAIN, right * 6.055
    Returns (left, right, center) for 3 channels or (left, right) for 2 channels.
    """
    # Normalization multipliers
    LEFT_MULTIPLIER = 2.367 * LEFT_CHANNEL_GAIN
    RIGHT_MULTIPLIER = 6.055
    
    left_peak = float(np.max(np.abs(audio[:, 0]))) * LEFT_MULTIPLIER
    
    # Handle both stereo (2 channels) and tri-channel audio
    if audio.shape[1] >= 3:
        right_peak = float(np.max(np.abs(audio[:, 1]))) * RIGHT_MULTIPLIER
        center_peak = float(np.max(np.abs(audio[:, 2])))
        return left_peak, right_peak, center_peak
    else:
        right_peak = float(np.max(np.abs(audio[:, 1]))) * RIGHT_MULTIPLIER
        return left_peak, right_peak


def get_channel_peak_map(audio: np.ndarray) -> dict[str, float]:
    peaks = get_channel_peaks(audio)

    if len(peaks) == 3:
        left_peak, right_peak, center_peak = peaks
        return {
            "left": left_peak,
            "right": right_peak,
            "center": center_peak,
        }

    left_peak, right_peak = peaks
    return {
        "left": left_peak,
        "right": right_peak,
    }


def balance_channels(channels: tuple[float, ...]) -> float:
    """Balance channel sensitivities and return composite volume.
    
    Accepts 2 or 3 channels and returns the maximum across all.
    """
    return max(channels)


def get_channel_intensities(audio: np.ndarray) -> dict[str, float]:
    """Get intensity for each channel separately.
    
    Returns dict with 'left', 'center' (if 3-channel), and 'right' keys.
    """
    peaks = get_channel_peaks(audio)
    intensities: dict[str, float] = {}
    
    if len(peaks) == 3:
        left_peak, right_peak, center_peak = peaks
        intensities["left"] = volume_to_intensity(left_peak)
        intensities["right"] = volume_to_intensity(right_peak)
        intensities["center"] = volume_to_intensity(center_peak)
    else:
        left_peak, right_peak = peaks
        intensities["left"] = volume_to_intensity(left_peak)
        intensities["right"] = volume_to_intensity(right_peak)
    
    return intensities


def detect_direction(audio: np.ndarray, sample_rate: int) -> tuple[int, float]:
    if audio.ndim != 2 or audio.shape[1] < 2:
        return 0, 0.0

    # Get channel peaks to determine direction
    peaks = get_channel_peaks(audio)
    
    if len(peaks) == 3:
        # 3-channel audio: left, right, center
        left_peak, right_peak, center_peak = peaks
        
        # Find which channel is loudest
        max_peak = max(left_peak, right_peak, center_peak)
        
        if max_peak == center_peak:
            return 0, 0.0  # Center
        elif max_peak == right_peak:
            return 90, 0.0  # Right
        else:
            return 270, 0.0  # Left
    else:
        # 2-channel stereo audio: use delay correlation
        left_peak, right_peak = peaks
        
        left_channel = normalize_channel(audio[:, 0])
        right_channel = normalize_channel(audio[:, 1])

        delay_samples = get_delay(left_channel, right_channel)
        delay_time = delay_samples / sample_rate

        if delay_samples > MIN_DELAY_SAMPLES:
            return 90, delay_time

        if delay_samples < -MIN_DELAY_SAMPLES:
            return 270, delay_time

        return 0, delay_time


def volume_to_intensity(volume: float) -> float:
    normalized = (volume - THRESHOLD) / max(THRESHOLD * 6, 1e-6)
    return clamp(normalized, 0.0, 1.0)


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        stale_connections: list[WebSocket] = []
        for websocket in list(self.connections):
            try:
                await websocket.send_json(message)
            except Exception:
                stale_connections.append(websocket)

        for websocket in stale_connections:
            await self.disconnect(websocket)

    async def count(self) -> int:
        return len(self.connections)


class AudioStreamWorker:
    def __init__(self, manager: ConnectionManager, loop: asyncio.AbstractEventLoop) -> None:
        self.manager = manager
        self.loop = loop
        self.stop_event = threading.Event()
        self.thread: threading.Thread | None = None

    def start(self) -> None:
        if self.thread is not None:
            return

        self.thread = threading.Thread(target=self.run, name="audio-stream-worker", daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.stop_event.set()
        try:
            sd.stop()
        except Exception:
            pass

        if self.thread is not None:
            self.thread.join(timeout=DURATION + 1)
            self.thread = None

    def publish(self, message: dict[str, Any]) -> None:
        if self.loop.is_closed():
            return

        future = asyncio.run_coroutine_threadsafe(
            self.manager.broadcast(message),
            self.loop,
        )

        try:
            future.result(timeout=1)
        except Exception:
            pass

    def run(self) -> None:
        try:
            device_info = sd.query_devices(DEVICE_INDEX)
            channel_count = int(device_info["max_input_channels"])
        except Exception as error:
            print(f"Failed to initialize audio device {DEVICE_INDEX}: {error}")
            return

        if channel_count <= 0:
            print(f"Audio device {DEVICE_INDEX} has no input channels.")
            return

        print("SixthSense audio stream server")
        print(f"Device: {device_info['name']}")
        print(f"Input channels: {channel_count}")
        print(f"Sample rate: {SAMPLE_RATE} Hz")
        print(f"WebSocket path: {WS_PATH}")

        is_sound_active = False
        sound_started_at: int | None = None
        last_detected_at: int | None = None

        while not self.stop_event.is_set():
            try:
                audio = sd.rec(
                    int(DURATION * SAMPLE_RATE),
                    samplerate=SAMPLE_RATE,
                    channels=channel_count,
                    device=DEVICE_INDEX,
                    dtype="float32",
                )
                sd.wait()
            except Exception as error:
                print(f"Audio capture error: {error}")
                time.sleep(0.5)
                continue

            if self.stop_event.is_set():
                break

            # Balance channel sensitivities
            channel_peaks = get_channel_peaks(audio)
            channel_peak_map = get_channel_peak_map(audio)
            volume = balance_channels(channel_peaks)
            channel_intensities = get_channel_intensities(audio)
            direction, delay_time = detect_direction(audio, SAMPLE_RATE)
            now = int(time.time() * 1000)

            # Print channel volumes and peaks
            if len(channel_peaks) == 3:
                print(f"Left: {channel_peaks[0]:.4f} ({channel_intensities.get('left', 0):.2f}) | Right: {channel_peaks[1]:.4f} ({channel_intensities.get('right', 0):.2f}) | Center: {channel_peaks[2]:.4f} ({channel_intensities.get('center', 0):.2f})")
            else:
                print(f"Left: {channel_peaks[0]:.4f} ({channel_intensities.get('left', 0):.2f}) | Right: {channel_peaks[1]:.4f} ({channel_intensities.get('right', 0):.2f})")

            self.publish(
                {
                    "type": "channel_snapshot",
                    "snapshot": {
                        "direction": direction,
                        "channelPeaks": channel_peak_map,
                        "channelIntensities": channel_intensities,
                        "detectedAt": now,
                    },
                },
            )

            if volume > THRESHOLD:
                if not is_sound_active or sound_started_at is None:
                    sound_started_at = now

                intensity = volume_to_intensity(volume)
                
                # Only process sound if intensity is above 0.8
                if intensity < 0.8:
                    continue
                
                last_detected_at = now
                is_sound_active = True

                self.publish(
                    {
                        "type": "sound_update",
                        "sound": {
                            "id": SOUND_ID,
                            "direction": direction,
                            "intensity": intensity,
                            "label": SOUND_LABEL,
                            "startedAt": sound_started_at,
                            "lastSeenAt": now,
                            "isActive": True,
                            "channelPeaks": channel_peak_map,
                            "channelIntensities": channel_intensities,
                        },
                    },
                )
                continue

            if (
                is_sound_active
                and last_detected_at is not None
                and now - last_detected_at >= SILENCE_TIMEOUT_MS
            ):
                print("sound_end")
                self.publish({"type": "sound_end", "id": SOUND_ID})
                is_sound_active = False
                sound_started_at = None
                last_detected_at = None


manager = ConnectionManager()
worker: AudioStreamWorker | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global worker

    loop = asyncio.get_running_loop()
    worker = AudioStreamWorker(manager, loop)
    worker.start()

    try:
        yield
    finally:
        if worker is not None:
            worker.stop()
            worker = None


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "websocketPath": WS_PATH,
        "connections": await manager.count(),
    }


@app.websocket(WS_PATH)
async def audio_stream(websocket: WebSocket) -> None:
    await manager.connect(websocket)

    try:
        while True:
            await websocket.receive()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
