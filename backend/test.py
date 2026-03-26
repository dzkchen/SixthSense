import sounddevice as sd

devices = sd.query_devices()
for i, dev in enumerate(devices):
    print(i, dev['name'], dev['max_input_channels'])