# SixthSense
Fraser Hacks

## Frontend + Backend

The frontend expects a WebSocket stream of sound events at `/ws/audio-stream`.

### Backend

Install Python dependencies and run the audio stream server:

```bash
pip install -r backend/requirements.txt
python backend/main.py
```

The backend listens on `0.0.0.0:8000` by default and emits:

- `sound_update`
- `sound_end`

### Frontend

Install dependencies, then start Next.js:

```bash
cd frontend
npm install
npm run dev:lan
```

If you need to override the backend URL, copy `frontend/.env.example` to `frontend/.env.local` and update `NEXT_PUBLIC_AUDIO_WS_URL`.

### Phone Testing

Open the frontend from your phone using your laptop's LAN IP, for example:

```text
http://192.168.1.20:3000
```

Because the frontend now derives the WebSocket host from the current page URL, it will connect to:

```text
ws://192.168.1.20:8000/ws/audio-stream
```
