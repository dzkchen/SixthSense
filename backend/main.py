import sounddevice as sd
import numpy as np
from scipy.signal import correlate

# ===== CONFIG =====
DEVICE_INDEX = 5        # Your "3 Mics" aggregate device
SAMPLE_RATE = 44100     # More stable than 16kHz for AirPods
DURATION = 0.5          # seconds per recording
THRESHOLD = 0.02        # volume threshold for detecting sound
MIN_DELAY_SAMPLES = 3   # ignore tiny noise delays

# ==================

def get_delay(sig1, sig2):
    corr = correlate(sig1, sig2, mode='full')
    delay = np.argmax(corr) - (len(sig1) - 1)
    return delay

def detect_direction(audio, sample_rate):
    # Use first two channels for now
    left = audio[:, 0]
    right = audio[:, 1]

    # Normalize (avoid division by zero)
    left = left / (np.max(np.abs(left)) + 1e-6)
    right = right / (np.max(np.abs(right)) + 1e-6)

    delay_samples = get_delay(left, right)
    delay_time = delay_samples / sample_rate

    # Direction logic with noise tolerance
    if delay_samples > MIN_DELAY_SAMPLES:
        direction = "RIGHT →"
    elif delay_samples < -MIN_DELAY_SAMPLES:
        direction = "← LEFT"
    else:
        direction = "CENTER ↑"

    return delay_samples, delay_time, direction


# ===== SETUP =====
device_info = sd.query_devices(DEVICE_INDEX)
channels = device_info['max_input_channels']

print("🎤 Device:", device_info['name'])
print(f"Using {channels} input channels")
print(f"Sample Rate: {SAMPLE_RATE} Hz")
print("\nClap or tap near a mic to test direction...\n")


# ===== MAIN LOOP =====
while True:
    audio = sd.rec(
        int(DURATION * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=channels,
        device=DEVICE_INDEX,
        dtype='float32'
    )
    sd.wait()

    # Debug: confirm shape
    print("Shape:", audio.shape)

    # Check overall volume
    volume = np.max(np.abs(audio))

    if volume > THRESHOLD:
        print("🔊 Sound detected!")

        # Debug: show per-channel loudness
        channel_levels = np.max(np.abs(audio), axis=0)
        channel_levels[1] = channel_levels[1] * 10
        print("Channel levels:", channel_levels)

        # Only run direction if we have at least 2 channels
        if channels >= 2:
            delay_samples, delay_time, direction = detect_direction(audio, SAMPLE_RATE)

            print(f"Delay: {delay_samples} samples ({delay_time*1000:.3f} ms)")
            print(f"Direction: {direction}")
        else:
            print("Not enough channels for direction detection")

        print("-" * 50)