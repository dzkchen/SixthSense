@AGENTS.md
PROJECT: SixthSense — Spatial Audio Visualizer for Deaf Users
You are building the complete Next.js front-end for a mobile web app called SixthSense. The app helps deaf users perceive and understand the sounds around them using a real-time radial audio visualizer. AirPods detect spatial audio and a Python backend processes direction data, streaming it to the front-end via WebSocket. Your responsibility is the entire front-end: UI shell, canvas visualizer, data context, data hook, mock data layer, history page, and all interactive states.
This is a daily-use assistive tool for deaf people, not a one-time demo. Every design decision should prioritize clarity, speed of comprehension, and real-world outdoor usability. A user may glance at this app for half a second while crossing a street — the interface must communicate danger instantly.

TECH STACK
Use Next.js 14 with the App Router, TypeScript (strict mode, no any anywhere), and Tailwind CSS for layout and spacing. Use Framer Motion for all transitions and UI animations. Use the HTML5 Canvas API via useRef for the radar — do not use any charting or visualization library. Use Google Fonts (Inter) loaded via next/font/google.

DESIGN SYSTEM
The aesthetic is high-contrast, accessibility-first, and clean minimal. Think of a precision instrument designed for bright outdoor sunlight — the canvas is white and uncluttered, but the visualizer elements are bold, purposeful, and immediately readable.
The colour palette is as follows. Background: #F8F9FA. Surface (cards, drawers): #FFFFFF. Primary text: #0D0D0D. Secondary text / muted labels: #6B7280. Radar ring strokes: #E2E8F0. User centre dot: #0D0D0D. Sound type colours — Voice: #2563EB (Electric Blue), Vehicle: #F43F5E (Rose), Alarm/Siren: #EF4444 (Red), Unknown: #94A3B8 (Slate). Alarm border flash: #EF4444. Ambient glow (centre pulse): #2563EB at very low opacity, scaling with sound level.
Typography uses only three sizes: text-sm (12px) for radar dot labels and secondary metadata, text-base (16px) for body and list items, text-2xl (24px) for the app name. Headings are weight 700, body is weight 400, labels are weight 500.
All interactive elements must meet WCAG AA contrast ratios minimum. All animations must check prefers-reduced-motion and instantly resolve when it is enabled. The High Contrast mode toggle (in settings) increases ring stroke opacity from 20% to 60%, increases dot radius from 10px to 14px, and adds a 2px white outline to every sound dot so it reads clearly on any background.
Export all colour and style tokens from lib/designTokens.ts so they are referenced consistently everywhere rather than hardcoded.

DATA MODEL & TYPES
Define all types in types/sound.ts. The core type is:
typescript
type SoundEvent = {
  id: string;                // crypto.randomUUID()
  direction: number;         // 0–360 degrees, where 0 = forward (top of screen), clockwise
  intensity: number;         // 0.0–1.0, where 1.0 = loudest / furthest from centre
  label: 'voice' | 'vehicle' | 'alarm' | 'unknown';
  startedAt: number;         // Date.now() when first detected
  lastSeenAt: number;        // Date.now() of most recent update — refreshed on each new event for same source
  isActive: boolean;         // true while sound is ongoing, false when backend signals it has ended
}
The key design decision here is that sounds are not ephemeral 3-second events — their lifespan is tied to whether the sound is still occurring. A siren stays on the radar as long as it is active. The backend will either send a { type: 'sound_end', id: string } message to mark a sound as ended, or — if no end signal arrives — the front-end should treat a sound as expired if lastSeenAt is more than 4000ms ago (a graceful timeout for missed end signals).

SOUND CONTEXT PROVIDER (new — required for history persistence across pages)
Create providers/SoundProvider.tsx. This is a React Context provider that wraps the entire app layout in app/layout.tsx. It is the single source of truth for all sound data and history, ensuring that when the user navigates from the radar page (/) to the history page (/history) and back, no data is lost.
The provider holds the following state internally: the active sounds array, connectionStatus, totalIntensity, the cumulative history array (all sound events ever received since the app opened, never pruned), and the triggerDemoScenario function. All of this is managed inside useSoundStream (see below), which is called once inside the provider and never anywhere else.
Export a useSoundContext() custom hook that calls useContext(SoundContext) and throws a descriptive error if used outside the provider. Every component and page that needs sound data should import useSoundContext() rather than calling useSoundStream directly.

useSoundStream HOOK
Create hooks/useSoundStream.ts. This hook is called exclusively by SoundProvider — it should not be called directly anywhere else. It accepts a single parameter object { isPaused: boolean } (note: hooks accept parameters, not props — this is intentional) and returns the following fully typed object:
typescript
{
  sounds: SoundEvent[],
  connectionStatus: 'live' | 'demo',
  totalIntensity: number,
  history: SoundEvent[],
  triggerDemoScenario: () => void
}
totalIntensity is the sum of all currently active sounds' intensity values. To keep the value on a 0.0–1.0 scale, divide the raw sum by 3 (treating 3 simultaneous sounds at full intensity as the maximum). Note that a single quiet sound at intensity 0.3 will therefore produce a totalIntensity of 0.1 — the wave ring will be subtle in calm conditions and only become dramatic when multiple loud sounds are present simultaneously. This is intentional: the visualizer should feel calm when the environment is calm.
On mount, attempt to connect to ws://localhost:8000/ws/audio-stream. If the connection succeeds within 2 seconds, set connectionStatus to "live" and process real events. The WebSocket will emit JSON messages of two shapes: { type: 'sound_update', sound: SoundEvent } for new or refreshed sounds, and { type: 'sound_end', id: string } for sounds that have ended. On sound_update, either add the sound if its id is new, or update lastSeenAt and isActive if it already exists. On sound_end, set isActive: false on the matching sound, which triggers its fade-out animation. Every incoming sound event (on sound_update) should also be appended to the cumulative history array regardless of whether it is new or a refresh.
If connection fails or is unavailable, fall back automatically to mock mode and set connectionStatus to "demo".
In mock mode, run a simulation loop using setInterval at a 1500ms interval. Maintain a small pool of 2–3 "active" mock sounds with persistent IDs. On each tick, randomly decide whether to refresh an existing sound (updating its lastSeenAt), add a new one, or end one (setting isActive: false). This simulates the natural rhythm of a real street environment — sounds linger, overlap, and disappear — rather than isolated random blips. When isPaused is true, do not process new events or advance the mock simulation — buffer incoming WebSocket messages in a local array and flush them all at once when isPaused returns to false, but discard all buffered events except the most recent state of each unique sound ID. This ensures that on resume, the user sees the current snapshot of what is happening now rather than a jarring replay of everything that happened while paused.
Expose a triggerDemoScenario() function. When called, it fires a scripted 15-second sequence: a vehicle approaching from behind (180°, intensity 0.4 growing to 0.9), then a voice from the right (90°, intensity 0.6), then an alarm from the front-left (330°, intensity 1.0 triggering the alarm flash), then everything gradually fading. This is used by the settings drawer's demo button.
Run a cleanup useEffect every 200ms that removes any sound where isActive is false AND lastSeenAt was more than 1500ms ago (allowing time for the fade-out animation to complete before the dot is removed from state). Do not remove entries from history — that array is append-only and cumulative.

THE RADAR CANVAS COMPONENT
Create components/RadarCanvas.tsx. This takes sounds: SoundEvent[], totalIntensity: number, and isPaused: boolean as props.
The canvas should be pixel-perfect on retina (multiply all dimensions by window.devicePixelRatio). Drive the animation with requestAnimationFrame inside a useEffect. The canvas size should be min(100vw - 32px, 100dvh - 56px - 80px) — perfectly square, with 16px padding on each side.
Drawing order (back to front): The layers should be drawn in exactly this sequence on every frame so that more informative elements always appear on top of more decorative ones: (1) ambient centre glow, (2) faint concentric reference rings, (3) ambient wave ring, (4) cardinal direction labels, (5) sound dots and ping rings, (6) alarm border flash, (7) PAUSED label if applicable.
Faint concentric reference rings: Draw three concentric rings at 33%, 66%, and 100% of the radar radius. These are purely structural guides to help the user judge the distance/intensity of sound dots. Stroke them with #E2E8F0 at 1.5px width and 30% opacity. They should be visually subordinate — present but not competing with the wave ring above them. Also draw four cardinal direction labels ("↑ Forward", "→ Right", "↓ Behind", "← Left") just inside the outermost ring in text-sm, #6B7280. Draw a small filled circle at the exact centre (radius 5px, colour #0D0D0D) representing the user.
Ambient centre glow: Behind all other elements, draw a radial gradient centred at the canvas origin. The gradient goes from rgba(37, 99, 235, X) at the centre to fully transparent at 40% of the radar radius, where X is totalIntensity * 0.15.
Ambient wave ring: Define a base radius equal to 55% of the canvas radius. For every angle θ from 0 to 2π (sampled at 400 steps for smoothness), compute the radial position as r(θ) = baseRadius + amplitude * sin(frequency * θ + phaseOffset) where frequency is 6, amplitude is baseRadius * 0.12 * totalIntensity, and phaseOffset advances by 0.008 radians per animation frame. Convert each (r, θ) to Cartesian (x, y) centred on the canvas origin. To create the ribbon/layered braid effect, draw 8 offset copies of the path. For each copy i from 0 to 7, add a small radial offset of (i - 3.5) * 2.5 pixels to r(θ). Draw each copy as a continuous lineTo path with lineWidth of 1px and opacity of 0.18 + (i * 0.04). Apply a createLinearGradient across the canvas from top-left to bottom-right transitioning through Voice Blue (#2563EB) → Indigo (#6366F1) → Vehicle Rose (#F43F5E). Set the globalAlpha of the entire wave ring to 0.3 + (totalIntensity * 0.5). When totalIntensity is near zero, the wave ring should settle toward a nearly-perfect smooth circle with very low opacity. If prefers-reduced-motion is enabled, freeze phaseOffset and draw the ring as a fixed smooth circle at the base radius.
Per-sound rendering: For each sound in sounds, calculate (x, y) from direction (degrees clockwise from top) and intensity (maps linearly to 0% → 100% of radar radius). The dot radius is 8 + (intensity * 6) pixels. The dot colour comes from the design token for that sound's label. Active sounds (isActive: true) render at full opacity. Inactive sounds (isActive: false) render at an opacity that linearly decreases from 1.0 to 0.0 over 1500ms from their lastSeenAt time.
For each active sound, draw two expanding ping rings. Track a per-sound pingAge in a Map<string, number> ref. On each frame, increment pingAge by the frame delta. Draw ring 1 at pingAge % 1200ms progress and ring 2 at (pingAge + 600) % 1200ms progress. Each ring's radius goes from the dot radius to dot radius * 2.5, and opacity goes from 0.5 to 0. When isActive becomes false, stop drawing ping rings immediately.
Draw the sound's label string in text-sm, #0D0D0D, weight 500, centered 18px below the dot.
Alarm flash effect: Manage a flashOpacity value in a useRef<number>. To detect when a new alarm sound first appears, maintain a separate useRef<Set<string>> called prevAlarmIds that tracks the IDs of all alarm sounds seen in the previous frame. On each frame, compare the current set of alarm sound IDs against prevAlarmIds — if any alarm ID is present now that was not present in the previous frame, that is a new arrival: set flashOpacity.current to 1.0. After the comparison, update prevAlarmIds to reflect the current frame. On each frame, decay flashOpacity.current by 0.05 (reaching zero after roughly 20 frames). If flashOpacity.current is greater than 0, draw a rectangle over the entire canvas border (8px stroke, inset) in #EF4444 at flashOpacity.current alpha.
If isPaused is true, render a "PAUSED" label in text-sm weight 700, colour #6B7280, centered at the top of the canvas (y = 24px from top).

TOP BAR COMPONENT
Create components/TopBar.tsx. It is 56px tall with a white background, a subtle 1px bottom border in #E2E8F0, and horizontal padding of 16px. It contains the app name "SixthSense" on the left in text-2xl bold, and on the right: a status pill showing "● Live" with a green dot (#10B981) or "○ Demo" with a grey dot (#94A3B8), followed by a gear icon button that opens the settings drawer, and a clock/history icon button that navigates to the history page (/history route). It accepts an optional showBackButton: boolean prop — when true, replace the history icon with a left-arrow back button that calls router.back().

LEGEND BAR COMPONENT
Create components/LegendBar.tsx. It is 80px tall, white background, subtle top border. It contains a horizontally scrollable row (no scrollbar visible: overflow-x: auto, -ms-overflow-style: none, scrollbar-width: none) of sound type chips. Each chip shows a filled circle in the type colour followed by the label name in text-sm weight 500. Chips are spaced 12px apart with 16px left padding. Below the chips, show a single line of text-sm secondary text: "Tap the radar to freeze · Tap again to resume".

FREEZE INTERACTION
The radar canvas should respond to tap/click. Manage isPaused as a useState<boolean> in app/page.tsx and pass it as a prop to <RadarCanvas> and as a parameter to the context (which threads it into useSoundStream). On first tap, set isPaused to true. On second tap, set it back to false. The hook handles buffering and flushing internally as described above.

SETTINGS DRAWER
Create components/SettingsDrawer.tsx. It slides up from the bottom of the screen using a Framer Motion y transition (from 100% to 0%). It has a white background, 24px border radius on the top corners, a drag handle indicator at the top centre, and a backdrop blur overlay behind it. It reads triggerDemoScenario from useSoundContext().
Settings sections: a "Display" section with two toggles — "Reduce animations" (suppresses all Framer Motion variants and disables ping rings on the canvas, stored in localStorage as sixsenth_reduce_motion) and "High contrast mode" (increases ring and dot visibility as specified in the design system, stored as sixthsense_high_contrast). A "Demo" section with a single button labelled "Run street scenario" — pressing it calls triggerDemoScenario() and closes the drawer. A "Connection" section showing the WebSocket URL as monospace read-only text and the current connection status.

HISTORY PAGE
Create app/history/page.tsx. This page reads history: SoundEvent[] from useSoundContext() — because the context provider wraps the entire layout, the history array is preserved across navigation and will contain all events since the app was opened. The page has the same <TopBar> at the top with showBackButton={true}.
Each list item shows: a coloured dot in the sound's type colour, the label in text-base bold, the direction expressed as a clock-face string from directionToClockFace(direction), a mini intensity bar (a small horizontal bar, 48px wide, filled proportionally in the sound's type colour), and a relative timestamp ("just now", "5 seconds ago", "2 minutes ago") that re-renders every 10 seconds to stay current. Items are separated by a 1px #E2E8F0 divider. The most recent event is at the top. If history is empty, show a centred empty state with an inline SVG of a simple ear with a line through it and the text "No sounds detected yet" in text-base #6B7280.

directionToClockFace UTILITY
Create lib/directionToClockFace.ts. This function takes a number from 0–360 and returns the nearest clock position as a human-readable string. The mapping divides the circle into 12 segments of 30° each, offset so that each hour is centred on its angle: 0° (± 15°) = "12 o'clock", 30° = "1 o'clock", 60° = "2 o'clock", 90° = "3 o'clock", and so on through 330° = "11 o'clock". Export it as a named export. This utility is used by the history page and can be used anywhere else that needs to express a direction in natural language.

ONBOARDING MODAL
Create components/OnboardingModal.tsx. It appears on first visit — check localStorage for sixsenth_onboarded. It is a centred card (max-width 320px) on a blurred, darkened backdrop (backdrop-blur-sm, bg-black/40). It has 24px padding, 16px border radius, white background.
The modal has three short, plain-language sections, each with a bold heading and one sentence of body text. Section 1 — "What is SixSenth": "We turn the sounds around you into a visual map, updated in real time." Section 2 — "How to read the radar": "You are at the centre. A dot's position shows where a sound is coming from, and its distance from you shows how loud it is." Section 3 — "Colour guide": Show four coloured dot + label pairs inline (Voice, Vehicle, Alarm, Unknown) in a 2×2 grid using the design token colours. At the bottom, a full-width button labelled "Start listening" that sets sixthsense_onboarded in localStorage and dismisses the modal with a Framer Motion fade-out.

FILE STRUCTURE
The complete file structure is: app/layout.tsx (wraps the app in <SoundProvider>), app/page.tsx (main radar screen, owns isPaused state), app/history/page.tsx (history feed, reads from context), providers/SoundProvider.tsx (context provider, calls useSoundStream once), components/RadarCanvas.tsx, components/TopBar.tsx, components/LegendBar.tsx, components/OnboardingModal.tsx, components/SettingsDrawer.tsx, hooks/useSoundStream.ts, lib/designTokens.ts, lib/directionToClockFace.ts, lib/soundColors.ts, types/sound.ts.

FINAL CONSTRAINTS
No external images. All SVGs inline. The layout must never scroll or overflow on a standard mobile viewport (100dvh). All localStorage keys must be prefixed sixthsense_ to avoid collisions. TypeScript strict mode, zero any types. Every component must have a JSDoc comment at the top describing its purpose in one sentence. Mobile first design principles.


