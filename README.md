# SixthSense

![Fraser Hacks](https://img.shields.io/badge/Event-Fraser%20Hacks-C84A31?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-1F180F?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Python](https://img.shields.io/badge/Backend-Python-4A5B99?style=for-the-badge&logo=python&logoColor=white)
![WebSocket](https://img.shields.io/badge/Transport-WebSocket-10B981?style=for-the-badge)
![Status](https://img.shields.io/badge/Prototype-Hackathon%20Build-8E806A?style=for-the-badge)

SixthSense is a Fraser Hacks project that turns surrounding sound into a simple visual awareness layer. The goal is to help people notice where sound is coming from without needing to rely only on hearing, making everyday movement and reaction easier in noisy, distracting, or inaccessible environments.

## What Problem Does It Solve?

A lot of important information in the world is directional:

- a bike approaching from behind
- someone calling your name from the left
- traffic, alarms, or sudden noise from in front of you

For people who are deaf or hard of hearing, or for anyone in a loud environment, that directional context can be easy to miss. SixthSense tries to convert that invisible audio information into something glanceable: a live visual field that shows which side is currently strongest.

## How It Works

At a high level, SixthSense listens for audio, estimates directional sound intensity, and renders the result as a radar-like visualization.

The current frontend expects a backend stream over:

`ws://localhost:8000/ws/audio-stream`

The UI listens for WebSocket messages shaped like:

```json
{
  "type": "magnitude_update",
  "magnitudes": {
    "front": 0.72,
    "left": 0.18,
    "right": 0.41
  }
}
```

Those `front`, `left`, and `right` values are normalized magnitudes. The frontend smooths the incoming values and blends them into one continuous field instead of snapping between fixed lanes, so the radar surface swells toward the direction with the strongest microphone pickup.

In practical terms:

- louder pickup on the left makes the left side rise
- stronger sound in front expands the front field
- mixed signals blend between directions
- low or stale input fades back down

## Current Prototype

This hackathon version is a band-aid solution built around whatever microphones we could realistically use during the event:

- phone microphone
- clip-on microphone
- AirPods microphone

That setup let us test the core idea quickly: use microphone pickup magnitude as a directional signal and convert it into an accessible visual response.

It is not the final form of the product. The current prototype proves the interaction loop, not perfect spatial audio hardware.

## Ideal Future Direction

In an ideal world, SixthSense would be paired with something like Meta glasses or another AR glasses platform. Instead of checking a phone screen, the user could get lightweight real-time directional awareness directly in their field of view.

That would make the experience:

- more hands-free
- more wearable in daily life
- faster to react to in motion
- more natural as an accessibility tool

## Usage

This repository currently contains the frontend experience in [`frontenddavid/`](/Users/dzkchen/SixthSense/frontenddavid).

### Run the frontend

```bash
cd frontenddavid
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Backend contract

The visualizer expects a WebSocket server running locally on port `8000` at `/ws/audio-stream` that sends `magnitude_update` events with normalized `front`, `left`, and `right` values between `0` and `1`.

If the stream is unavailable, the UI falls back to an offline state.

### Backend dependencies

The backend is built in Python and uses the following packages:

- `scipy`
- `numpy`
- `sounddevice`
- `flask`
- `opencv-python`
- `watchdog`
- `pyopenssl`
- `fastapi`
- `uvicorn[standard]`

Example install:

```bash
pip install scipy numpy sounddevice flask opencv-python watchdog pyopenssl fastapi "uvicorn[standard]"
```

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Framer Motion
- Tailwind CSS 4
- Python
- SciPy
- NumPy
- sounddevice
- FastAPI
- Uvicorn
- Flask
- OpenCV
- WebSockets for live sound magnitude streaming

## Project Notes

The current app is focused on fast readability:

- a radar-style directional surface
- live/offline connection state
- smoothed magnitude transitions
- onboarding for first-time use
- accessibility options like reduced motion and high contrast

## Contributors

Based on the git history in this checkout:

- David Chen
- dzkchen

## Fraser Hacks

SixthSense was built as a Fraser Hacks project around a simple idea: if sound carries spatial information, we should be able to surface that information visually in a way that feels immediate, helpful, and accessible.
