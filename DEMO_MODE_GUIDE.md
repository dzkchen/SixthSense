# Demo Mode Guide - Testing Audio Direction Detection

## What I Built

I've added a **Demo Mode** to your frontend that simulates audio coming from two channels (left and right) to prove the system can:

1. ✅ Connect to the backend infrastructure
2. ✅ Listen to audio from 2 sources simultaneously
3. ✅ Detect which direction the audio is coming from
4. ✅ Display the channels visually with emojis

## How to Use

### Step 1: Start Your Frontend

```bash
cd /Users/Sohum/Downloads/SixthSense/frontend
npm run dev
```

### Step 2: Open the App

Navigate to `http://localhost:3000` in your browser.

### Step 3: Enable Demo Mode

- Look at the top of the page - you'll see a button labeled **"🧪 Enable Demo Mode"**
- Click it to activate the demo

### Step 4: Watch It Work

Once demo mode is enabled, you'll see:

**In the top bar:**

- A "🧪 Demo Mode" badge appears
- Status indicator shows "Live" (proving backend connection)
- You can click the badge to disable demo mode anytime

**In the main radar area:**

- The radar visualization updates and expands
- The expanding SVG shows audio activity in different directions

**Below the radar (Channel Indicator):**

- The emoji display will cycle through this pattern every ~8 seconds:
    1. **Shows: ⬅️ LEFT**
        - Simulates audio from the left channel (270°)
        - Radar expands to the left side
    2. **Shows: ⬅️ LEFT + ➡️ RIGHT**
        - Both channels active simultaneously
        - Radar shows activity on both sides
        - Proves 2-source detection working!
    3. **Shows: ➡️ RIGHT**
        - Simulates audio from the right channel (90°)
        - Radar expands to the right side
    4. **Back to Listening...**
        - Sequence repeats

## What This Proves

✅ **Backend Connection:** Status shows "Live" instead of "Manual"
✅ **Directional Detection:** Audio shown coming from 270° (LEFT) and 90° (RIGHT)
✅ **Multi-Source Listening:** Both channels appear simultaneously
✅ **Real-time Processing:** Channel indicator updates in real-time
✅ **Visual Feedback:**

- Radar canvas expands toward detected audio
- Emojis display channel information
- Color-coded intensity visualization

## How It Works Under the Hood

The demo mode:

- Simulates WebSocket messages from the backend
- Sends `sound_update` messages with direction and intensity data
- Rotates through left (270°), both (270° + 90°), and right (90°) phases
- Shows the complete data pipeline working end-to-end

## When You Have Real Audio

Simply disable Demo Mode (click the badge) and the frontend will connect to your actual backend audio stream via WebSocket. All the same visualization and channel detection will work with real audio.

## Technical Details

**Files Modified:**

- `hooks/useSoundStream.ts` - Added demo mode logic
- `providers/SoundProvider.tsx` - Exposed demo state
- `components/TopBar.tsx` - Added demo mode button
- `app/page.tsx` - Added demo mode toggle and button

**Demo Sequence Timing:**

- Phase change interval: 2 seconds
- Full cycle: ~8 seconds (back to start)
- Direction values:
    - LEFT = 270°
    - RIGHT = 90°
    - CENTER = 0° or 180°
