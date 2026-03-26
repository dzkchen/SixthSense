import sounddevice as sd
import numpy as np

# ===== CONFIG =====
DEVICE_INDEX = 5        # Your "3 Mics" aggregate device
SAMPLE_RATE = 44100     # Standard sample rate
DURATION = 0.5          # Seconds per recording
THRESHOLD = 0.001        # Minimum volume to consider a sound

# ==================

# ===== SETUP =====
device_info = sd.query_devices(DEVICE_INDEX)
channels = device_info['max_input_channels']

print("🎤 Device:", device_info['name'])
print(f"Using {channels} input channels")
print(f"Sample Rate: {SAMPLE_RATE} Hz")
print("\nClap or tap near a mic to test direction...\n")

# ===== HELPER FUNCTION =====
def detect_direction_intensity(audio):
    # Compute max absolute amplitude per channel
    channel_levels = np.max(np.abs(audio), axis=0)
    print("Channel levels:", channel_levels)

    # Determine which channel is loudest
    max_index = np.argmax(channel_levels)

    if max_index == 0:
        direction = "← LEFT"
    elif max_index == 1:
        direction = "RIGHT →"
    elif max_index == 2:
        direction = "CENTER ↑"
    else:
        direction = f"Channel {max_index} (unknown)"

    return direction

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

    # Check overall volume
    volume = np.max(np.abs(audio))

    if volume > THRESHOLD:
        print("🔊 Sound detected!")

        # Detect direction based on intensity
        if channels >= 2:
            direction = detect_direction_intensity(audio)
            print(f"Direction: {direction}")
        else:
            print("Not enough channels for direction detection")

        print("-" * 50)