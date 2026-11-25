// Who's who, and everything the squad says to each other in the plane.
//
// A script is a list of conversations; one is picked at random. A conversation is a list of lines:
//   [speakers, text]
// `speakers` is a preference list like 'anaya|yusuf|musa' (the first kid who isn't the pilot says it),
// or a group: 'little' (Zainab or Baby Musa), 'five' (Ayra, Harun or Faris), 'big' (Yusuf, Musa, Anaya), 'any'.
// `text` may contain {pilot}, or be an object keyed by speaker id with a `default`.

export const NAMES = {
  yusuf: 'Yusuf', musa: 'Musa', anaya: 'Anaya Apa', ayra: 'Ayra', harun: 'Harun', faris: 'Faris', zainab: 'Zainab', babymusa: 'Baby Musa',
};
export const AGES = { yusuf: 10, musa: 10, anaya: 13, ayra: 5, harun: 5, faris: 5, zainab: 2, babymusa: 1 };
const GROUPS = {
  little: ['zainab', 'babymusa'], five: ['ayra', 'harun', 'faris'], big: ['yusuf', 'musa', 'anaya'],
  any: ['yusuf', 'musa', 'anaya', 'ayra', 'harun', 'faris', 'zainab', 'babymusa'],
};

const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);

export function resolveSpeaker(spec, pilot, recent = []) {
  let fallback = null;
  for (const part of spec.split('|')) {
    const pool = GROUPS[part] ? shuffle(GROUPS[part]) : [part];
    for (const id of pool) {
      if (id === pilot || !NAMES[id]) continue;
      if (!recent.includes(id)) return id; // prefer someone who didn't just speak
      fallback = fallback || id;
    }
  }
  return fallback;
}
export function fillText(text, speaker, pilot) {
  const t = typeof text === 'object' ? (text[speaker] ?? text.default) : text;
  return t.replaceAll('{pilot}', NAMES[pilot]);
}
export const isLittle = (id) => id === 'zainab' || id === 'babymusa';

export const SCRIPTS = {
  // ======================================================== Test Flight (Plano)
  'intro.intro': [
    [['anaya|yusuf', 'Okay, everybody listen! Seatbelts on. Nobody touches ANYTHING.'], ['five', 'Can I touch the window?'], ['anaya|musa', 'There IS no window. It\'s a box.'],
      ['yusuf|musa', 'Captain {pilot}, steer with the stick and fly through the glowing rings!'], ['little', 'Wheee!']],
    [['yusuf|musa', 'Squad, welcome aboard! Captain {pilot} is flying today!'], ['anaya|musa', 'I\'m the oldest, so I\'m in charge back here.'], ['faris|harun', 'Nuh-uh!'],
      ['anaya|yusuf', 'Uh-huh. Rings first, {pilot}. Fly through all of them.'], ['babymusa|zainab', { babymusa: 'Ba!', zainab: 'Go! Go!' }]],
  ],
  'intro.introBaby': [
    [['anaya|yusuf', 'Wait. {pilot} is flying?! {pilot} is a BABY!'], ['yusuf|musa', 'Easy Flying is on. The plane basically flies itself.'],
      ['zainab|babymusa', { babymusa: 'Ba-ba-ba!', zainab: 'Me fly! Me!' }], ['anaya|musa', 'Okay... everyone hold on to something.'], ['five', 'This is the BEST day!']],
  ],
  'intro.at2': [
    [['yusuf|musa|anaya', 'Hold BOOST for juice-box power!'], ['faris|harun', 'Faster! FASTER!'], ['anaya|yusuf', 'Not TOO fast.']],
  ],
  'intro.at4': [
    [['faris|harun|ayra', 'Do a flip! Press TRICK! DO A FLIP!'], ['anaya|musa', 'Do NOT do a flip.'], ['little', 'Flip! Flip!']],
  ],
  'intro.at6': [[['yusuf|musa', 'Last ring! Then we land on Sunny Lane.'], ['ayra|harun', 'Are we there yet?'], ['anaya|yusuf', 'We\'re literally in front of the house.']]],
  'intro.land': [
    [['anaya|yusuf|musa', 'Land on Sunny Lane. Let go of the stick and it lands itself.'], ['little', 'Bye-bye sky!']],
  ],

  // ======================================================== The Big Flight
  'trip.intro': [
    [['musa|yusuf', 'Next stop: Greensboro! Everybody ready?'], ['five', 'Did anybody pack snacks?'], ['anaya|yusuf', 'I packed snacks. Obviously. I pack everything.'],
      ['little', { zainab: 'Snack!', babymusa: 'Nom nom!', default: 'Snack!' }], ['yusuf|musa', 'Captain {pilot}, follow the rings and snap a photo at every landmark!']],
  ],
  'trip.introBaby': [
    [['anaya|musa', 'Captain {pilot} is flying us all the way to Greensboro. With Easy Flying. Please.'], ['little', { zainab: 'Me captain!', babymusa: 'Ya!', default: 'Ya!' }],
      ['five', 'This is gonna be AWESOME!']],
  ],
  'trip.dallas': [
    [['yusuf|musa', 'There\'s Dallas! Fly around the big glowing ball on Reunion Tower!'], ['little', { zainab: 'Big ball!', babymusa: 'Ba!', default: 'Ball!' }], ['anaya|musa', 'Don\'t you DARE bump that ball, {pilot}.']],
  ],
  'trip.state:Arkansas': [[['ayra|harun|faris', 'Are we there yet?'], ['anaya|yusuf', 'We just left Texas.']]],
  'trip.littlerock': [[['yusuf|musa', 'Little Rock and the Arkansas River! See the long bridge?'], ['harun|faris', 'Is that a dinosaur bridge?'], ['anaya|musa', 'No. It\'s just a bridge.']]],
  'trip.mississippi': [
    [['musa|yusuf', 'The Mississippi River! It\'s SO wide!'], ['zainab|faris', { zainab: 'Water! Big water!', default: 'It\'s like an ocean!' }], ['anaya|yusuf', 'Nobody lean over the side.']],
  ],
  'trip.memphis': [[['five', 'A GIANT SHINY PYRAMID!'], ['yusuf|musa', 'That\'s the Memphis Pyramid. Fly past the top!'], ['babymusa|zainab', { babymusa: 'Oooh!', zainab: 'Shiny!' }]]],
  'trip.state:Tennessee': [[['anaya|musa', 'Tennessee! Halfway there. Everybody\'s still alive. Good job, team.']]],
  'trip.fall': [
    [['ayra|harun', 'The trees turned orange and red and yellow!'], ['musa|yusuf', 'It\'s fall! The leaves change color here.'], ['zainab|babymusa', { zainab: 'Leafs! Pretty!', babymusa: 'Ooooh!' }]],
  ],
  'trip.nashville': [[['faris|harun', 'That building has BATMAN EARS!'], ['yusuf|musa', 'People call it the Batman Building!'], ['little', { zainab: 'Bat-man!', babymusa: 'Ba!' }]]],
  'trip.smokies': [
    [['musa|yusuf', 'The Smoky Mountains! See the mist? That\'s why they\'re called smoky.'], ['ayra|faris', 'Is it a fire?!'], ['anaya|yusuf', 'It\'s CLOUDS. Calm down.'], ['zainab|babymusa', { zainab: 'Fluffy!', babymusa: 'Oooh!' }]],
  ],
  'trip.clingmans': [[['yusuf|musa', 'Clingmans Dome! The tower with the swirly ramp!'], ['faris|harun', 'It looks like a slide! Can we slide down it?'], ['anaya|musa', 'Absolutely not.']]],
  'trip.state:North Carolina': [[['musa|yusuf', 'NORTH CAROLINA! We\'re almost home!'], ['little', { zainab: 'Yay!', babymusa: 'Yaaa!' }]]],
  'trip.viaduct': [[['yusuf|musa', 'The Blue Ridge Parkway! The road floats around the mountain!'], ['harun|ayra', 'How do the cars not fall off?'], ['anaya|yusuf', 'Engineering. Look it up.']]],
  'trip.pilot': [[['musa|yusuf', 'Pilot Mountain! You can see it from Greensboro on clear days.'], ['faris|harun', 'Hey, WE\'RE pilots!'], ['anaya|musa', 'Only {pilot} is the pilot. You\'re a passenger.']]],
  'trip.greensboro': [
    [['musa|yusuf', { musa: 'GREENSBORO! Welcome to my town, everybody!', default: 'GREENSBORO! We made it to Musa\'s town!' }], ['anaya|yusuf', 'Look at that sunset. Okay, I\'ll admit it. This is pretty cool.'],
      ['babymusa|zainab', { babymusa: 'Mama?', zainab: 'Home?' }]],
  ],
  'trip.guilford': [[['musa|yusuf', 'That\'s the Guilford Courthouse battlefield. It\'s really old!'], ['harun|ayra', 'Older than Anaya Apa?'], ['anaya|musa', 'HEY.']]],
  'trip.science': [[['musa|yusuf', 'The Science Center! It has an aquarium AND a zoo!'], ['ayra|faris', 'Can we see the penguins? Pleeeease?'], ['little', { zainab: 'Fishies!', babymusa: 'Fiss!' }]]],
  'trip.coliseum': [[['yusuf|musa', 'The Coliseum is HUGE!'], ['faris|harun', 'I bet I could throw a ball over it.'], ['anaya|yusuf', 'You can\'t throw a ball over the couch.']]],
  'trip.downtown': [[['musa|yusuf', 'Downtown! That\'s Elm Street and the Carolina Theatre sign!'], ['ayra|harun', 'Can we go to the movies?'], ['anaya|musa', 'In our PAJAMAS? ...Actually, yes. Later.']]],
  'trip.lebauer': [[['yusuf|musa', 'Fly UNDER the floating net at LeBauer Park!'], ['five', 'Under it! Under it!'], ['zainab|babymusa', { zainab: 'Again!', babymusa: 'Hehe!' }]]],
  'trip.depot': [[['five', 'A TRAIN! Wave at the train!'], ['zainab|babymusa', { zainab: 'Choo-choo!', babymusa: 'Choo!' }]]],
  'trip.aandt': [[['musa|yusuf', 'N.C. A&T! Go Aggies!'], ['anaya|yusuf', 'I\'m going to go to college one day. And I\'ll still be in charge.']]],
  'trip.home': [[['musa|yusuf', { musa: 'There\'s my street! The blue house is mine!', default: 'There\'s Musa\'s street! The blue house!' }], ['anaya|yusuf', 'Gentle landing, {pilot}. GENTLE.']]],
  'trip.land': [[['anaya|musa', 'Land on Musa\'s street. Let go of the stick if you want it to land itself.'], ['little', 'Bye-bye sky!']]],

  // ======================================================== things that happen any time
  ring: [
    [['any', 'Nice!']], [['five', 'Woo-hoo!']], [['little', { zainab: 'Yay!', babymusa: 'Ya!' }]], [['anaya|yusuf', 'Okay, that was actually good.']],
    [['faris|harun', 'Bullseye!']], [['yusuf|musa', 'Smooth flying, Captain!']],
  ],
  bump: [
    [['anaya|musa', '{pilot}! Watch where you\'re going!'], ['little', { zainab: 'Uh-oh!', babymusa: 'Uh-oh!' }]],
    [['five', 'Bonk! Do it again!'], ['anaya|yusuf', 'Do NOT do it again.']],
    [['yusuf|musa', 'Ow! My duct tape!']],
    [['babymusa|zainab', { babymusa: 'Uh-oh!', zainab: 'Owie!' }]],
  ],
  tapeLow: [[['anaya|yusuf', 'One roll of tape left! Everybody hold still and nobody breathe.']]],
  trick: [
    [['faris|harun', 'WHOA! A barrel roll!'], ['zainab|babymusa', { zainab: 'Again! Again!', babymusa: 'Hehehe!' }]],
    [['anaya|musa', '{pilot}! I said NO flips!'], ['five', 'That was the BEST!']],
    [['ayra|harun', 'My tummy did a flip too!']],
    [['babymusa|zainab', { babymusa: 'Wheee!', zainab: 'Wheee!' }]],
  ],
  combo: [[['five', 'Combo! You\'re on FIRE!'], ['anaya|yusuf', 'Not literally. Please don\'t be literally on fire.']], [['yusuf|musa', 'Unstoppable!']]],
  candyStar: [[['five', 'Candy star! Can I have one?'], ['anaya|musa', 'One. ONE candy.'], ['little', { zainab: 'Mine!', babymusa: 'Nom!' }]]],
  sock: [[['ayra|faris', 'A lost sock! Gross!'], ['anaya|yusuf', 'Is that... MY sock?'], ['babymusa|zainab', { babymusa: 'Sock!', zainab: 'Socky!' }]]],
  crash: [[['anaya|musa', 'The plane FELL APART! I\'m telling Mom!'], ['yusuf|musa', 'Don\'t worry, duct tape fixes everything!'], ['little', { zainab: 'Uh-oh!', babymusa: 'Uh-oh!' }]]],
  autoland: [[['anaya|yusuf', 'Let go of the stick and the plane will land itself. Hands off, {pilot}!']]],
  lawndart: [[['anaya|musa', 'Too steep! Come in nice and slow!']]],
  landedButter: [[['anaya|yusuf', 'BUTTER landing! Okay, {pilot}, I\'m impressed.'], ['five', 'Yaaaay!'], ['little', { zainab: 'Again!', babymusa: 'Ya!' }]]],
  landedOk: [[['yusuf|musa', 'We landed! Everybody still has all their slippers?'], ['harun|faris', 'I lost one. Just kidding!']]],
  // random chatter while flying
  banter: [
    [['ayra|harun|faris', 'Are we there yet?'], ['anaya|musa', 'No.'], ['ayra|harun|faris', 'Are we there yet NOW?'], ['anaya|yusuf', 'NO.']],
    [['harun|faris|ayra', 'I need to go potty.'], ['anaya|musa', 'You JUST went! Hold it.'], ['zainab|babymusa', { zainab: 'Potty!', babymusa: 'Ba!' }]],
    [['faris|harun', { faris: 'Harun is touching me!', harun: 'Faris is touching me!', default: 'Somebody is touching me!' }], ['harun|faris|ayra', 'I\'m not touching you. I\'m touching the AIR next to you.'], ['anaya|yusuf', 'Both of you, hands in your laps.']],
    [['ayra|faris', 'That cloud looks like a unicorn!'], ['harun|faris', 'No, it looks like a pizza.'], ['little', { zainab: 'Pizza!', babymusa: 'Pa!' }]],
    [['zainab|babymusa', { zainab: 'Juice?', babymusa: 'Ba? Ba?' }], ['anaya|musa', 'Here you go. Little sips.'], ['zainab|babymusa', { zainab: 'Fank you!', babymusa: 'Ta!' }]],
    [['babymusa|zainab', { babymusa: 'Dada!', zainab: 'Fan!' }], ['yusuf|musa', 'He thinks the propeller is a fan!'], ['babymusa|zainab', { babymusa: 'Fan! Hehe!', zainab: 'Fan!' }]],
    [['faris|harun', 'When I grow up I\'m gonna fly a REAL plane.'], ['anaya|yusuf', 'When you grow up you\'re gonna clean your room.']],
    [['anaya|yusuf', 'Everybody, inside voices! We\'re in a cardboard box, not a stadium.'], ['five', 'OKAY!!'], ['anaya|musa', 'That was not an inside voice.']],
    [['ayra|harun', 'I can see a cow! Moo!'], ['zainab|babymusa', { zainab: 'Moo! Moo!', babymusa: 'Mmmm!' }]],
    [['musa|yusuf', 'This is the best summer ever.'], ['anaya|musa', 'Yeah. It kind of is.'], ['little', { zainab: 'Best!', babymusa: 'Ba!' }]],
    [['faris|harun|ayra', 'Can I fly next?'], ['anaya|yusuf', 'When you can reach the stick.'], ['faris|harun', 'I can reach it! ...Almost.']],
    [['ayra|five', { default: 'Anaya Apa, can you braid my hair?', harun: 'Anaya Apa, my slipper fell off!', faris: 'Anaya Apa, my slipper fell off!' }], ['anaya|musa', 'Not while we\'re flying!']],
  ],
};
