# Backyard Squadron — Game Design (v1)

A short, simple 3D flying game for 10-year-olds that runs in a phone or tablet
browser. Two best friends in red plaid pajamas fly a homemade cardboard plane
over Plano, TX and Greensboro, NC.

**Target length:** about 45–60 minutes for a first playthrough, with replay
value from 3-star ratings.
**Platform:** Browser 3D (Three.js), hosted on Vercel. Gyro + touch first,
with keyboard and gamepad as extras.

---

## 1. Story

**Yusuf** and **Musa** are best friends from Plano, Texas. Last spring Musa's
family moved to Greensboro, North Carolina. At their last sleepover they bought
matching **red plaid pajamas** and named themselves the **Backyard Squadron**.
The pajamas are the official uniform, and they never fly without them.

This summer Musa visits Plano, and the two build a plane out of a refrigerator
box in Yusuf's garage. After a few test flights around Plano and one big flight
over Dallas, they do the unthinkable: they fly it all the way to Greensboro so
Yusuf can see Musa's new town. The game ends with a big flight over Raleigh and
a promise of more adventures next summer.

Tone: funny, warm, a little daring. No villains and no scary moments.

## 2. Characters

| | Yusuf | Musa |
|---|---|---|
| Home | Plano, TX | Greensboro, NC (moved from Plano) |
| Personality | Bold, loud, "full throttle!" | Clever, careful, "technically that's a stall" |
| Job | Pilot in Chapter 1 (his town) | Pilot in Chapter 2 (his town) |

The boys swap seats between chapters. Whoever isn't flying rides in the back
and gives hints and jokes through short voice or text lines.

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

### Chapter 1 — Plano, TX (Yusuf pilots)

| # | Mission | Where | Goal |
|---|---|---|---|
| 1 | **First Flight** | Yusuf's cul-de-sac | Tutorial: take off from the driveway, fly rings over the fences, land in the street |
| 2 | **Downtown Dash** | Historic Downtown Plano, the old Interurban rail line | Follow the rail line through downtown and drop off ice-cream orders |
| 3 | **Balloon Festival** | Oak Point Park | Ring race weaving between dozens of hot-air balloons |
| 4 | **Big City: Dallas** | Dallas skyline | Circle the Reunion Tower ball at sunset and fly under the white arch of the Margaret Hunt Hill Bridge |

Plano background details: Arbor Hills trails and creek, Legacy West towers on
the horizon, Heritage Farmstead barn, neighborhood pools and parks.

### Travel Flight — Texas to North Carolina
A relaxed, scenic flight with no fail state: collect juice boxes, wave at
trains, and fly over rivers and the Smoky Mountains. It ends at Musa's house.

### Chapter 2 — Greensboro, NC (Musa pilots)

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

## 6. Controls

**Gyro (default):** hold the phone sideways like a steering wheel.
- Tilt left or right to turn
- Tilt toward or away to move the nose down or up
- Right thumb: hold **Boost**
- **Recenter** button to reset "level" at any time

**Touch (fallback):** virtual joystick on the left, Boost on the right.

**Keyboard and gamepad:** WASD/arrows plus Space, or the left stick plus a trigger.

**Settings:** steering sensitivity, invert pitch, Landing Assist, sound and
music volume.

Platform notes:
- iOS needs a tap before motion sensors work, so the **"Start Engines!"**
  button requests permission.
- iPhone Safari has no true fullscreen, so ship as a PWA ("Add to Home
  Screen") to get a fullscreen, app-like experience.

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

1. **Flight feel prototype**: cardboard plane, gyro + touch controls, one open
   cul-de-sac. Make sure flying is fun on a phone.
2. **Mission 1 complete**: rings, landing grade, stars, Lost Sock.
3. **Chapter 1** (missions 2–4) plus the garage with the 3 upgrades.
4. **Travel flight + Chapter 2** (missions 5–8).
5. Polish: menus, ending, sounds, PWA, Vercel deploy.
