// The missions: a quick intro over Plano, then the big cross-country flight to Greensboro.
import { tripPath, tripHeight, buildTrip } from './world/trip.js';
import { streetHouses, scatterTrees, yusufHouse, label3d, juiceAlong } from './world/helpers.js';

const PI = Math.PI;

export const MISSIONS = [
  // ============================================================ 1. Test Flight over Plano
  {
    id: 'intro', title: 'Test Flight', place: 'Plano, TX', time: 'morning', icon: '🛫',
    blurb: 'Musa is visiting Yusuf in Plano. Take the cardboard plane for a quick spin around the neighborhood!',
    world: { ground: 0x74b04e, size: 1400 },
    build(w) {
      w.circle(0, -40, 17);
      w.road(0, -24, 0, 230, 10);
      yusufHouse(w, 0, -72, 0);
      for (const a of [-1.1, -0.45, 0.45, 1.1]) w.house(Math.sin(a) * 44, -40 - Math.cos(a) * 44, a, { garage: true });
      const zoneSkip = (x, z) => Math.abs(x) < 16 && z > 20 && z < 160;
      streetHouses(w, 0, -10, 0, 220, { road: false, skip: zoneSkip, spacing: 30 });
      streetHouses(w, -300, 230, 300, 230, {});
      streetHouses(w, -130, -160, -130, 220, {});
      streetHouses(w, 130, -160, 130, 220, {});
      streetHouses(w, -300, -170, 300, -170, { sides: [-1] });
      w.lawn(-220, 40, 120, 140, 0x8ccc62);
      w.waterEllipse(-225, 40, 30, 45);
      scatterTrees(w, -220, 40, 60, 70, 30, {}, (x, z) => ((x + 225) / 34) ** 2 + ((z - 40) / 50) ** 2 < 1);
      scatterTrees(w, 0, 0, 380, 380, 70, {}, (x, z) => Math.abs(x) < 30 || Math.hypot(x + 225, z - 40) < 60 || Math.abs(z - 230) < 25 || Math.abs(z + 170) < 25 || Math.abs(Math.abs(x) - 130) < 25);
      for (let i = 0; i < 8; i++) w.cloud(-400 + i * 110, 110 + (i % 3) * 15, -300 + (i * 97) % 600, 1);
      label3d(w, 'Yusuf\'s House', 0, 32, -72, 4);
      const rings = [[0, 20, -10], [-40, 24, 70], [-110, 26, 110], [-200, 22, 40], [-150, 20, -60], [-70, 18, -110]];
      return {
        spawn: { p: [0, 18, -140], h: 0 },
        objectives: [{ type: 'rings', label: 'Rings', rings, r: 8 }],
        landing: { p: [0, 95], h: 0, len: 90, wid: 14, text: 'Land on Sunny Lane!' },
        juice: juiceAlong(rings, 2),
        sock: [-225, 6, 40],
        bounds: { cx: 0, cz: 20, r: 520 },
      };
    },
  },

  // ============================================================ 2. Coast to Coast(ish): Plano → Greensboro
  {
    id: 'trip', title: 'The Big Flight', place: 'Plano, TX → Greensboro, NC', time: 'afternoon', icon: '🗺️',
    blurb: 'Fly together all the way to Musa\'s house in Greensboro! Dallas, the Mississippi, Nashville, the Smoky Mountains in fall colors, and a sunset over Greensboro.',
    world: {
      ground: 0x8fb35a, size: 900, length: 5500, center: [0, 2450], fog: [240, 1150], chunk: 320, fallFrom: 1430,
      height: tripHeight,
      timeBlend: { from: 'afternoon', to: 'sunset', z0: 2300, z1: 4650 },
    },
    build: (w) => buildTrip(w),
  },
];

export { tripPath };
export const MISSION_INDEX = Object.fromEntries(MISSIONS.map((m, i) => [m.id, i]));
