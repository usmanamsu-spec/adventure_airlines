# ✈️ Backyard Squadron

A short 3D flying game for iPad starring **Yusuf** (Plano, TX) and **Musa** (Greensboro, NC), two best friends in matching red plaid pajamas who fly a cardboard-box plane. It runs in the browser, in **portrait (upright)**, and is built with [Three.js](https://threejs.org) and [Vite](https://vitejs.dev).

![Title screen](docs/screenshots/title.png)

**Play time:** about 5 minutes: a quick test flight, then one big cross-country flight. Every mission has 3 stars to earn and a hidden lost sock 🧦.

## How to play

1. Open the game on the iPad and hold it **upright**. It only plays in portrait.
2. Tap **Share → Add to Home Screen**. It then opens full-screen like a real app.
3. Pick who's flying today: **Yusuf** or **Musa**. Each boy has his own save, stars and plane.
4. Tap **Start Engines!** Drag the stick on the left to steer and hold **BOOST** on the right.
5. Want to steer by tilting? Go to ⚙️ Settings → **Tilt (gyro)**. First lock the screen rotation (hold the iPad upright, swipe down from the top-right corner, tap 🔒), or the screen will flip when you tilt.

No sound? Turn the volume up. The game unlocks sound on the first tap and also plays when an iPhone's silent switch is on (iOS 17+).

| Control | Touch stick (default) | Tilt (optional) | Keyboard / game controller |
|---|---|---|---|
| Turn | Left stick | Tilt like a steering wheel | ← → / A D / left stick |
| Climb / dive | Stick up / down | Tip the iPad toward / away from you | ↑ ↓ / W S |
| Boost | **BOOST** button | **BOOST** button | Space / A button |
| Barrel roll | **🌀 TRICK** button | **🌀 TRICK** button | E / B button |
| Recenter tilt | | 🎯 button | |

Every mission has 3 stars: **finish it**, **collect enough candy 🍬**, and make a **Butter landing 🧈** in the green strip. Grab things quickly for **combos 🔥** and tap **🌀 TRICK** (E key / B button) for barrel rolls and bonus points.

The game helps kids out: big rainbow rings, gentle aim-assist toward the next target, a candy magnet, a ground cushion, 6 rolls of duct tape, and a **Landing helper** that's on by default.

**Easy flying** (on by default, in ⚙️ Settings) makes it even simpler: the plane keeps its own height, so you only steer left and right. It hops over buildings and trees, drifts toward the next goal when you stop steering, and **lands itself if you let go of the stick**. Turn it off for more of a challenge.

 Stars buy plane upgrades in the **Garage**: umbrella wings for tighter turns, a leaf-blower engine for a bigger boost tank, and flamingo floats for landing on water. The **Landing helper** setting makes landings easier.

### Missions
Both boys fly in every mission: whoever is playing pilots up front, and the other rides in the back seat.

| # | Mission | What happens |
|---|---|---|
| 1 | **Test Flight** (about 1 minute) | A quick spin around Yusuf's cul-de-sac in Plano, then land on Sunny Lane |
| 2 | **The Big Flight** (about 4 minutes) | Plano → Dallas (Reunion Tower) → Little Rock (Arkansas River) → the Mississippi at Memphis (M-bridge, Pyramid) → Nashville (the "Batman Building", the Parthenon) → the **Smoky Mountains in fall colors** (Clingmans Dome) → Blue Ridge Parkway → Pilot Mountain → **Greensboro at sunset**: Guilford Courthouse battlefield, Lake Brandt, the Science Center, the Coliseum, Elm Street, the Carolina Theatre, LeBauer Park's floating net, the ballpark, the depot, N.C. A&T, and a landing at Musa's house |

The leaves turn red, orange and gold from Tennessee onward, with falling leaves around the plane and mist in the mountains. The afternoon slowly turns into a golden sunset as you fly east.

### Graphics
**Fancy** graphics (default; ⚙️ Settings → Graphics) add a glow on bright light (the sun, rings, city lights, fireworks), mirror-like water that reflects the sky and landmarks, and lighting that takes its colors from the sky. Real ray tracing isn't available in iPad browsers, so these effects approximate that look. If an older iPad stutters, switch to **Fast**.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173 (on your Wi-Fi too, for testing on the iPad)
npm run build      # production build in dist/
```

## Put it on Vercel

1. Push this repository to GitHub (already done).
2. At [vercel.com](https://vercel.com) choose **Add New → Project**, import this repository, and pick the branch to deploy.
3. Vercel detects **Vite** automatically: build command `npm run build`, output folder `dist`. Click **Deploy**.
4. Open the URL on the iPads and **Add to Home Screen**.

Tilt steering needs HTTPS, which Vercel provides automatically.

**Privacy:** the game is meant to be shared only by link. It tells search engines not to index it (`robots.txt`, `noindex`, and an `X-Robots-Tag` header in `vercel.json`). Homes and streets in the game are made up. Progress is saved only on each iPad, with no accounts and no data collection.

## Project layout

```
src/
  main.js         app, title screen, game loop
  characters.js   Yusuf & Musa 3D models (procedural)
  plane.js        the cardboard plane + upgrades
  flight.js       flight model + tilt / touch / keyboard input
  mission.js      objectives, collisions, landings, scoring, autopilot
  levels.js       all missions, landmarks and dialogue
  world/kit.js    scenery kit (houses, buildings, trees, sky, lighting)
  world/props.js  balloons, trains, acorn, fireflies, net sculpture, pickups
  hud.js, ui.js   in-flight HUD and menus
docs/GAME_DESIGN.md   the design doc
tests/                headless checks (Playwright)
```

## Tests

The tests use Playwright with Chromium: the autopilot flies every mission to check it can be completed.

```bash
npm run build && npm run preview &
node tests/smoke.mjs http://localhost:4173     # flies all 9 missions on autopilot
node tests/flow.mjs  http://localhost:4173     # menus → mission → results → next mission
node tests/screens.mjs http://localhost:4173   # screenshots into tests/out/
node tests/easy.mjs http://localhost:4173      # Easy flying with nobody touching the controls
node tests/zoom.mjs http://localhost:4173      # pinch / double-tap zoom is blocked, two-thumb controls still work
```
