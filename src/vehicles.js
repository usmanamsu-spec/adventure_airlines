// Which vehicle each pilot flies: Faris has his truck, Anaya Apa her giant chicken tender, everyone else the cardboard plane.
import { buildPlane } from './plane.js';
import { buildTruck } from './truck.js';
import { buildTender } from './tender.js';

export const SPECIAL = { faris: 'truck', anaya: 'tender' };
export function buildVehicle(player, profile) {
  if (SPECIAL[player] === 'truck') return buildTruck();
  if (SPECIAL[player] === 'tender') return buildTender();
  return buildPlane({ upgrades: profile.upgrades, paint: profile.paint });
}
