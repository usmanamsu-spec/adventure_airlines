# Backyard Squadron — Game Design (v1)

A short, simple 3D flying game for 10-year-olds, played on **iPads in
landscape** in the browser. Two best friends in red plaid pajamas fly a
homemade cardboard plane over Plano, TX and Greensboro, NC.

**Target length:** about 45–60 minutes for a first playthrough, with replay
value from 3-star ratings.
**Platform:** Browser 3D (Three.js), hosted on Vercel. Built for iPad and
**landscape only**. Gyro + touch controls, with keyboard and gamepad as extras.

---

## 1. Story

**Yusuf** lives in Plano, Texas. His best friend **Musa** lives in Greensboro,
North Carolina, about 1,000 miles away. The last time they were together they
got matching **red plaid pajamas** and named themselves the **Backyard
Squadron**. The pajamas are the official uniform, and they never fly without
them.

This summer Yusuf is going to visit Musa. Instead of taking the car, he builds
a plane out of a refrigerator box in his garage. Musa helps as **Mission
Control** over video call. After a few test flights around Plano and one big
flight over Dallas, Yusuf flies the plane all the way to Greensboro. Musa shows
him around his town from the air, and the visit ends with a big flight over
Raleigh and a promise to do it again next summer.

Tone: funny, warm, a little daring. No villains and no scary moments.

## 2. Characters

| | Yusuf | Musa |
|---|---|---|
| Home | Plano, TX (the visitor) | Greensboro, NC (the host) |
| Personality | Bold, loud, "full throttle!" | Clever, careful, "technically that's a stall" |
| Chapter 1 (Plano) | Pilot, flying solo | Mission Control: a video-call bubble in the corner giving tips and jokes |
| Chapter 2 (Greensboro) | Passenger and sightseer, then co-pilot | Pilot, showing off his town |

In Chapter 1 the boys talk over video call. Once Yusuf lands in Greensboro they
fly together in the same plane, and the friend who isn't flying gives hints and
jokes through short text bubbles (voice optional later).

Look: matching red plaid pajamas, aviator goggles, mismatched slippers.

## 3. The Plane

A cardboard box with pool-noodle wings and a box-fan propeller.

**Three upgrades**, bought with stars in the garage between missions:

1. **Patio-umbrella wings**: tighter turns
2. **Leaf-blower engine**: bigger boost tank
3. **Flamingo pool floats**: allows water landings (needed for one mission)

Cosmetic extras: paint colors and stickers, unlocked with stars.

## 4. Core Gameplay

### Loop
Pick a mission on the map → fly it (3–5 min) → land → earn 1–3 stars →
spend stars in the garage → next mission.

### Mechanics (kept to five)
1. **Steering**: tilt to bank and pitch. The plane flies forward on its own.
2. **Boost**: hold to go faster. It burns **juice boxes**, which you collect
   in the air.
3. **Duct tape (health)**: bumping things costs tape. At zero the plane falls
   apart in a funny cartoon heap and restarts at the last checkpoint after about
   2 seconds.
4. **Rings and pickups**: fly through rings and collect things. Each mission
   has one goal.
5. **Landing**: every mission ends with a landing grade:
   - Butter ⭐⭐⭐, Bumpy ⭐⭐, Pancake ⭐, Lawn Dart 😵 (retry)
   - Optional **Landing Assist** for players who need help

### Stars per mission
- ⭐ Finish the mission
- ⭐ Finish under the target time
- ⭐ Butter landing

### Hidden collectible
One **Lost Sock** is hidden in each mission. Finding all of them unlocks the
golden slippers.

## 5. Missions (8 + 1 travel flight)

Landmarks are **stylized, miniature versions**, packed close together like a
toy diorama. Plano and Greensboro are the focus. Dallas and Raleigh each get
one big "city day" flight built around their most famous landmarks.

### Chapter 1 — Plano, TX (Yusuf pilots, Musa is Mission Control)

| # | Mission | Where | Goal |
|---|---|---|---|
| 1 | **First Flight** | Yusuf's cul-de-sac | Tutorial: take off from the driveway, fly rings over the fences, land in the street |
| 2 | **Downtown Dash** | Historic Downtown Plano, the old Interurban rail line | Follow the rail line through downtown and drop off ice-cream orders |
| 3 | **Balloon Festival** | Oak Point Park | Ring race weaving between dozens of hot-air balloons |
| 4 | **Big City: Dallas** | Dallas skyline | Circle the Reunion Tower ball at sunset and fly under the white arch of the Margaret Hunt Hill Bridge |

Plano background details: Arbor Hills trails and creek, Legacy West towers on
the horizon, Heritage Farmstead barn, neighborhood pools and parks.

### Travel Flight — Texas to North Carolina
Yusuf's big trip. A relaxed, scenic flight with no fail state: collect juice
boxes, wave at trains, and fly over rivers and the Smoky Mountains while Musa
counts down the miles on the video call. It ends with Yusuf landing in Musa's
backyard, and the two finally meet up in person.

### Chapter 2 — Greensboro, NC (Musa pilots, Yusuf rides along)

| # | Mission | Where | Goal |
|---|---|---|---|
| 5 | **Firefly Night** | Musa's backyard | First night flight with the Christmas lights on. Catch 30 fireflies. |
| 6 | **Lake Brandt Splashdown** | Lake Brandt and the greenway | Use the flamingo floats to land on the lake and pick up a lost fishing hat |
| 7 | **Gate City Tour** | Downtown Greensboro, Science Center | Fly under the giant floating net sculpture at LeBauer Park, past the ballpark, then spot animals at the Science Center |
| 8 | **Big City: Raleigh** (finale) | Downtown Raleigh, Dix Park | Chase Raleigh's giant runaway acorn past the State Capitol, then land in the Dix Park sunflower field |

Greensboro background details: train depot ("Gate City"), Bog Garden
boardwalk, Country Park ponds, Guilford Courthouse battlefield green, tall
pines.

### Ending
A sunset scene on Musa's roof. The friends compare stars and plan next summer.
The credits roll over a photo album of every mission.

## 6. Device, Orientation & Controls

### iPad, landscape only
- The game is designed for iPad in **landscape**, at a 4:3-ish layout (about
  1.33–1.43 aspect ratio). The HUD sits in the corners and respects safe areas.
- **Portrait is blocked.** Safari on iPad can't lock orientation for a web
  page, so in portrait the game pauses behind a full-screen "Turn your iPad
  sideways ✈️" card with an animated rotating-iPad icon.
- If the iPad's **rotation lock** is on in portrait, the card also says to
  turn rotation lock off in Control Center.
- Both landscape directions (home button or camera on either side) work. Gyro
  axes are remapped from the current screen orientation angle, so steering
  never feels reversed.
- Ship as a PWA ("Add to Home Screen") with `"orientation": "landscape"` in the
  manifest, so it opens fullscreen like an app.
- iPads are fast enough for higher draw distance and soft shadows than phones,
  but keep the 60 fps target.

### Controls
**Gyro (default):** hold the iPad like a steering wheel.
- Tilt left or right to turn
- Tilt toward or away to move the nose down or up
- Right thumb: hold **Boost**
- **Recenter** button to reset "level" at any time
- Small tilt range: about 20° gives a full turn, because an iPad is heavy to
  swing around

**Touch (alternative):** virtual joystick under the left thumb, Boost under the
right thumb. Good for playing with the iPad flat on a table or in a case stand.

**Keyboard and gamepad:** a Bluetooth controller paired with the iPad (left
stick plus trigger), or WASD/arrows plus Space on a computer for testing.

**Settings:** steering sensitivity, invert pitch, Landing Assist, sound and
music volume.

Platform note: iPadOS needs a tap before motion sensors work, so the **"Start
Engines!"** button requests that permission.

## 7. Art & Audio

- Chunky low-poly toy style, bright colors and soft shadows
- Times of day for variety: morning (1, 2), afternoon (3, 6, 7),
  sunset (4, 8), night (5)
- Upbeat acoustic and chiptune-style music, cardboard rattle and box-fan
  hum sounds
- Short character lines (text bubbles first, voice later if wanted)

## 8. Tech

- **Three.js + Vite + TypeScript**, deployed as a static site on Vercel
- Custom arcade flight model, no physics engine
- One small scene per mission, low-poly with instanced trees and houses to
  keep phones at 60 fps
- Progress saved in `localStorage`. No accounts and no data collection.

## 9. Privacy

The game is public and stars real kids, so:
- Homes are **fictional** (made-up street names, no real addresses)
- No real school names and no photos of the kids, only cartoon likenesses

## 10. Out of Scope (keep it simple)

No multiplayer, rival character, online leaderboards, accounts or in-app
purchases. These can be revisited after v1 if the kids want more.

## 11. Build Order

1. **Flight feel prototype**: cardboard plane, gyro + touch controls,
   landscape-only handling, one open cul-de-sac. Make sure flying is fun on an
   iPad.
2. **Mission 1 complete**: rings, landing grade, stars, Lost Sock.
3. **Chapter 1** (missions 2–4) plus the garage with the 3 upgrades.
4. **Travel flight + Chapter 2** (missions 5–8).
5. Polish: menus, ending, sounds, PWA, Vercel deploy.
