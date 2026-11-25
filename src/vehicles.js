// Which vehicle each pilot flies, and everything special about it (horn, trail, garage card, chatter).
// Everyone else flies the cardboard plane.
import { buildPlane } from './plane.js';
import { buildTruck } from './truck.js';
import { buildTender } from './tender.js';
import { buildLego } from './lego.js';
import { buildDragon } from './dragon.js';

export const SPECIAL = { faris: 'truck', anaya: 'tender', yusuf: 'lego', ayra: 'dragon' };

export const VEHICLES = {
  plane: { honk: 'honkPlane', comic: 'HONK HONK!', cool: 0.45, chat: 'honk', icon: '📯', puff: 0.13, noseZ: 3.2 },
  truck: {
    build: buildTruck, honk: 'honkTruck', comic: 'HOOONK!', cool: 0.6, chat: 'honkTruck', icon: '🛻', puff: 0.55, noseZ: 3.6,
    intro: 'introTruck', banter: 'truckBanter', backdrop: 0.62, trail: { color: 0.52, size: 0.7, life: 0.5, grow: 1, light: 0.75, fade: 0.6 },
    garage: { title: "Faris's Garage", name: 'The Flying Truck 🛻⚡', desc: 'When Faris drives, the cardboard plane turns into his shiny, pointy, stainless-steel flying truck! Faris sits up front, and everybody else rides in the back.',
      items: [['Rocket thrusters', 'Already installed'], ['Super-shiny steel', 'No paint needed, says Faris']] },
  },
  tender: {
    build: buildTender, honk: 'honkChicken', comic: 'BAWK BAWK!', cool: 0.95, chat: 'honkTender', icon: '🐔', puff: 0.09, noseZ: 4.1,
    intro: 'introTender', banter: 'tenderBanter', backdrop: 0.58,
    garage: { title: "Anaya Apa's Garage", name: 'The Giant Chicken Tender 🍗✈️', desc: 'Anaya Apa LOVES chicken tenders. When she flies, the cardboard plane turns into a giant, golden, extra-crispy flying chicken tender! French-fry wings, a fry propeller, and dipping-sauce rockets. Everybody else rides on top. Nobody is allowed to take a bite.',
      items: [['Extra-crispy breading', 'Already perfect, says Anaya Apa'], ['Sauce-cup rockets', 'Ketchup, honey mustard, BBQ and ranch'], ['Chicken horn', 'BAWK BAWK!']] },
  },
  lego: {
    build: buildLego, honk: 'honkLego', comic: 'BEEP BEEP!', cool: 0.5, chat: 'honkLego', icon: '🧱', puff: 0.0, noseZ: 4.8,
    intro: 'introLego', banter: 'legoBanter', backdrop: 0.7,
    garage: { title: "Yusuf's Garage", name: 'The Brick Plane 🧱✈️', desc: 'Yusuf built his plane out of toy building bricks: red, blue, yellow and white, with studs on top. Every seat is a brick, the steering wheel is a brick, even the propeller clicks on! Everybody rides inside.',
      items: [['Snap-together wings', 'Already clicked on'], ['Brick seats for everyone', 'Nine of them!'], ['Toy horn', 'BEEP BEEP!']] },
  },
  dragon: {
    build: buildDragon, honk: 'honkDragon', comic: 'RAWR! ✨', cool: 1.0, chat: 'honkDragon', icon: '🐉', puff: 0.88, noseZ: 5.2,
    intro: 'introDragon', banter: 'dragonBanter', backdrop: 0.6, trail: { color: null, size: 1.0, life: 0.8, grow: 0.6, light: 0.7, fade: 0.8 },
    garage: { title: "Ayra's Garage", name: 'The Golden Dragon 🐉✨', desc: "Ayra's ride is a sparkly golden K-pop concert dragon! Shiny gold scales, glowing pink and blue stage lights, a pink and purple mane, and a trail of sparkles. Everybody rides on its back.",
      items: [['Golden scales', 'Extra sparkly'], ['Stage-light glow', 'Pink, purple and blue'], ['Dragon roar', 'RAWR! ✨']] },
  },
};

export function vehicleKind(player) { return SPECIAL[player] || 'plane'; }
export function buildVehicle(player, profile) {
  const v = VEHICLES[vehicleKind(player)];
  return v.build ? v.build() : buildPlane({ upgrades: profile.upgrades, paint: profile.paint });
}
