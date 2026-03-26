from flask import Flask, render_template, request, jsonify
import cv2
import numpy as np
from io import BytesIO
import base64
import threading
from intensity import get_audio_direction

app = Flask(__name__)

# Store latest processed frame and direction
latest_frame = None
latest_frame_lock = threading.Lock()
latest_direction = "center"
latest_direction_lock = threading.Lock()

# Background thread for audio detection
def audio_detection_thread():
    """Continuously detect audio direction in background"""
    global latest_direction
    while True:
        try:
            direction = get_audio_direction()
            if direction:
                with latest_direction_lock:
                    latest_direction = direction
        except Exception as e:
            print(f"Audio detection error: {e}")

# Start audio detection thread
import threading
audio_thread = threading.Thread(target=audio_detection_thread, daemon=True)
audio_thread.start()

@app.route('/')
def index():
    """Serve the main camera webpage"""
    return render_template('camera.html')

@app.route('/upload-frame', methods=['POST'])
def upload_frame():
    """Receive base64 encoded frame from browser"""
    global latest_frame
    
    try:
        data = request.json
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'status': 'error'}), 400
        
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'status': 'error'}), 400
        
        # Process with OpenCV (edge detection)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        
        with latest_frame_lock:
            latest_frame = edges.copy()
        
        return jsonify({'status': 'success'}), 200
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get-direction', methods=['GET'])
def get_direction():
    """Get the current detected audio direction"""
    with latest_direction_lock:
        return jsonify({'direction': latest_direction}), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    import os
    print("\n" + "="*60)
    print("🎥 SixthSense Camera Web Server")
    print("="*60)
    print("\n1. Find your laptop's IP:")
    print("   ifconfig | grep 'inet '")
    print("\n2. On your iPhone, open Safari and go to:")
    print("   http://YOUR_IP:5000")
    print("\n3. Allow camera access when prompted")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True, ssl_context=('cert.pem', 'key.pem'))