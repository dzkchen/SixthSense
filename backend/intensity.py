import sounddevice as sd
import numpy as np

# ===== CONFIG =====
DEVICE_INDEX = 5        # Your "3 Mics" aggregate device
SAMPLE_RATE = 44100     # Standard sample rate
DURATION = 0.5          # Seconds per recording
THRESHOLD = 0.001        # Minimum volume to consider a sound

# ==================

# ===== HELPER FUNCTION =====
def detect_direction_intensity(audio):
    """Detect direction from audio based on channel intensity.
    
    Args:
        audio: numpy array of audio samples with shape (samples, channels)
        
    Returns:
        Direction indicator: "left", "right", or "center"
    """
    # Compute max absolute amplitude per channel
    channel_levels = np.max(np.abs(audio), axis=0)

    # Determine which channel is loudest
    max_index = np.argmax(channel_levels)

    if max_index == 0:
        return "left"
    elif max_index == 1:
        return "right"
    elif max_index == 2:
        return "center"
    else:
        return "unknown"

def get_audio_direction(device_index=DEVICE_INDEX, sample_rate=SAMPLE_RATE, 
                       duration=DURATION, threshold=THRESHOLD):
    """Capture audio and detect direction.
    
    Returns:
        Direction string or None if no sound detected
    """
    try:
        # Get device info to determine number of channels
        device_info = sd.query_devices(device_index)
        channels = device_info['max_input_channels']
        
        if channels < 2:
            print(f"Warning: Device has only {channels} channel(s), direction detection requires 2+")
            return None
        
        audio = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=channels,
            device=device_index,
            dtype='float32'
        )
        sd.wait()
        
        # Check overall volume
        volume = np.max(np.abs(audio))
        
        if volume > threshold:
            return detect_direction_intensity(audio)
        return None
    except Exception as e:
        print(f"Audio capture error: {e}")
        return None

# ===== MAIN LOOP (for standalone execution) =====
if __name__ == "__main__":
    # ===== SETUP =====
    try:
        device_info = sd.query_devices(DEVICE_INDEX)
        channels = device_info['max_input_channels']
        
        print("🎤 Device:", device_info['name'])
        print(f"Using {channels} input channels")
        print(f"Sample Rate: {SAMPLE_RATE} Hz")
        print("\nClap or tap near a mic to test direction...\n")
    except Exception as e:
        print(f"Device error: {e}")
        exit(1)
    
    while True:
        direction = get_audio_direction()
        
        if direction:
            print("🔊 Sound detected!")
            print(f"Direction: {direction}")
            print("-" * 50)