// Who's who, and everything the squad says to each other.
//
// The Plano house:      Anaya Apa (13), Yusuf (10), Faris (5), Zainab (2)
// The Greensboro house: Musa (10), Ayra (5), Harun (5) and Ruman (13, not playable: he talks on the walkie-talkie)
// Also flying: Baby Musa (1)
//
// A script is a list of conversations; one is picked at random (without repeating recent ones).
// A conversation is a list of lines: [speakers, text]
//   speakers: 'anaya|yusuf' means the first one of them who isn't the pilot (and didn't just talk) says it.
//             Groups: little, five, big, plano, gso, any. 'ruman' is the walkie-talkie.
//   text:     may contain {pilot}; or an object keyed by speaker id, with a `default`.

export const NAMES = {
  yusuf: 'Yusuf', musa: 'Musa', anaya: 'Anaya Apa', ayra: 'Ayra', harun: 'Harun', faris: 'Faris', zainab: 'Zainab', babymusa: 'Baby Musa', ruman: 'Ruman',
};
export const AGES = { yusuf: 10, musa: 10, anaya: 13, ayra: 5, harun: 5, faris: 5, zainab: 2, babymusa: 1, ruman: 13 };
export const HOUSE = { anaya: 'plano', yusuf: 'plano', faris: 'plano', zainab: 'plano', musa: 'gso', ayra: 'gso', harun: 'gso', ruman: 'gso' };
const GROUPS = {
  little: ['zainab', 'babymusa'], five: ['ayra', 'harun', 'faris'], big: ['yusuf', 'musa', 'anaya'],
  plano: ['anaya', 'yusuf', 'faris', 'zainab'], gso: ['musa', 'ayra', 'harun'],
  any: ['yusuf', 'musa', 'anaya', 'ayra', 'harun', 'faris', 'zainab', 'babymusa'],
};

const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);

export function resolveSpeaker(spec, pilot, recent = []) {
  let fallback = null;
  for (const part of spec.split('|')) {
    const pool = GROUPS[part] ? shuffle(GROUPS[part]) : [part];
    for (const id of pool) {
      if (id === pilot || !NAMES[id]) continue;
      if (!recent.includes(id)) return id;
      fallback = fallback || id;
    }
  }
  if (fallback && spec.includes('|')) {
    const other = shuffle(GROUPS.big.concat(GROUPS.any)).find(id => id !== pilot && !recent.includes(id) && !GROUPS.little.includes(id));
    if (other) return other;
  }
  return fallback;
}
export function fillText(text, speaker, pilot) {
  const t = typeof text === 'object' ? (text[speaker] ?? text.default) : text;
  return t.replaceAll('{pilot}', NAMES[pilot]);
}
export const isLittle = (id) => id === 'zainab' || id === 'babymusa';

// little helpers for the toddlers' words
const Z = (zainab, babymusa) => ({ zainab, babymusa, default: zainab });

export const SCRIPTS = {
  // ======================================================== Test Flight (Plano)
  'intro.intro': [
    [["anaya|yusuf", "Okay, everybody listen! Seatbelts on. Nobody touches ANYTHING."], ["five", "Can I touch the window?"], ["anaya|musa", "There IS no window. It's a box."],
      ["yusuf|musa", "Captain {pilot}, steer with the stick and fly through the glowing rings!"], ["little", Z("Wheee!", "Ba!")]],
    [["yusuf|musa", "Squad, welcome aboard! Captain {pilot} is flying today!"], ["anaya", "I'm the oldest, so I'm in charge back here."], ["faris|harun", "Nuh-uh!"],
      ["anaya|yusuf", "Uh-huh. Rings first, {pilot}. Fly through all of them."], ["little", Z("Go! Go!", "Ba!")]],
    [["ruman", "Ruman here, at the Greensboro house. Squadron, do you copy?"], ["musa|ayra|harun", "We copy, Ruman! We're doing a test flight in Plano first!"],
      ["ruman", "Copy that. Don't crash before you get here."], ["anaya|yusuf", "Nobody is crashing. I'm supervising."]],
    [["faris|ayra|harun", "Is this a real airplane?"], ["yusuf|musa", "It's a REAL cardboard airplane."], ["anaya|musa", "Which is not the same thing. Seatbelts."], ["little", Z("Seat-belt!", "Ba-ba!")]],
  ],
  'intro.introBaby': [
    [["anaya|yusuf", "Wait. {pilot} is flying?! {pilot} is a BABY!"], ["yusuf|musa", "Easy Flying is on. The plane basically flies itself."],
      ["zainab|babymusa", { babymusa: "Ba-ba-ba!", zainab: "Me fly! Me!" }], ["anaya|musa", "Okay... everyone hold on to something."], ["five", "This is the BEST day!"]],
    [["ruman", "Ruman here. Who's the pilot today?"], ["anaya|yusuf", "{pilot}."], ["ruman", "...I'm going to go sit down."]],
  ],
  'intro.at2': [
    [["yusuf|musa|anaya", "Hold BOOST for juice-box power!"], ["faris|harun", "Faster! FASTER!"], ["anaya|yusuf", "Not TOO fast."]],
    [["musa|yusuf", "Boost uses juice boxes. Grab more in the air!"], ["five", "Can I drink one?"], ["anaya|musa", "They're for the PLANE."]],
  ],
  'intro.at4': [
    [["faris|harun|ayra", "Do a flip! Press TRICK! DO A FLIP!"], ["anaya|musa", "Do NOT do a flip."], ["little", Z("Flip! Flip!", "Fwip!")]],
    [["yusuf|musa", "Halfway done! You're a natural, {pilot}!"], ["anaya|yusuf", "Don't tell them that. They'll get a big head."]],
  ],
  'intro.at6': [
    [["yusuf|musa", "Last ring! Then we land on Sunny Lane."], ["ayra|harun", "Are we there yet?"], ["anaya|yusuf", "We're literally over our house."]],
    [["faris|zainab", { faris: "There's our house! Hi, house!", zainab: "House! Hi!", default: "There's the house!" }], ["anaya|yusuf", "Wave at the house later. Fly now."]],
  ],
  'intro.land': [
    [["anaya|yusuf|musa", "Land on Sunny Lane. Let go of the stick and it lands itself."], ["little", Z("Bye-bye sky!", "Bye-bye!")]],
    [["yusuf|anaya", "Our street! Bring it down nice and slow, {pilot}."], ["ruman", "Ruman here. Did you land yet? I'm bored."]],
  ],

  // ======================================================== The Big Flight
  'trip.intro': [
    [["musa|ayra|harun", "Next stop: OUR house in Greensboro! Everybody ready?"], ["five", "Did anybody pack snacks?"], ["anaya|yusuf", "I packed snacks. Obviously. I pack everything."],
      ["little", Z("Snack!", "Nom nom!")], ["yusuf|musa", "Captain {pilot}, follow the rings and snap a photo at every landmark!"]],
    [["ruman", "Ruman to Squadron. The Greensboro house is ready for you. Over."], ["anaya|yusuf", "Copy, Ruman. We're leaving Plano now."],
      ["ruman", "Did Anaya pack too many snacks again?"], ["anaya", "There's no such thing as too many snacks."], ["little", Z("Snack!", "Ba!")]],
    [["faris|zainab", { faris: "Bye, Plano! Bye, our house!", zainab: "Bye-bye house!", default: "Bye, Plano!" }], ["ayra|harun", "Hi, Greensboro! We're coming home!"],
      ["anaya|yusuf", "Everybody, it's a long flight. Use your inside voices."], ["five", "OKAY!!!"]],
  ],
  'trip.introBaby': [
    [["anaya|musa", "Captain {pilot} is flying us all the way to Greensboro. With Easy Flying. Please."], ["little", Z("Me captain!", "Ya!")], ["five", "This is gonna be AWESOME!"]],
  ],
  'trip.dallas': [
    [["yusuf|anaya", "There's Dallas! Fly around the big glowing ball on Reunion Tower!"], ["little", Z("Big ball!", "Ba!")], ["anaya|musa", "Don't you DARE bump that ball, {pilot}."]],
    [["faris|ayra", "It looks like a giant lollipop!"], ["harun|faris", "I want to lick it."], ["anaya|yusuf", "Nobody is licking Dallas."]],
    [["ayra|harun", "Is Dallas bigger than Greensboro?"], ["musa|harun", "Greensboro has better trees."], ["yusuf|anaya|faris", "Dallas has a giant glowing ball. Just saying."]],
  ],
  'trip.state:Arkansas': [
    [["ayra|harun|faris", "Are we there yet?"], ["anaya|yusuf", "We just left Texas."]],
    [["yusuf|musa", "Welcome to Arkansas!"], ["faris|zainab", Z("Ar-kan-sas! Ar-kan-SAW!", "Saw!")], ["anaya|musa", "It's spelled weird but you say it 'Arkan-saw.'"]],
  ],
  'trip.littlerock': [
    [["yusuf|musa", "Little Rock and the Arkansas River! See the long bridge?"], ["harun|faris", "Is that a dinosaur bridge?"], ["anaya|musa", "No. It's just a bridge."]],
    [["ayra|faris", "Where's the little rock?"], ["musa|yusuf", "It's the name of the city!"], ["ayra|harun", "I'm still looking for the rock."]],
  ],
  'trip.mississippi': [
    [["musa|yusuf", "The Mississippi River! It's SO wide!"], ["zainab|faris", Z("Water! Big water!", "Wawa!")], ["anaya|yusuf", "Nobody lean over the side."]],
    [["anaya|musa", "Fun fact: Mississippi has four S's. M-I-double-S-I-double-S-I-double-P-I."], ["five", "Do it again!"], ["anaya|yusuf", "No. Once is enough."]],
    [["ruman", "Ruman here. Did you cross the Mississippi yet?"], ["any", "We're right over it!"], ["ruman", "Halfway! Nice. I'm eating your snacks."], ["anaya|yusuf", "RUMAN!"]],
  ],
  'trip.memphis': [
    [["five", "A GIANT SHINY PYRAMID!"], ["yusuf|musa", "That's the Memphis Pyramid. Fly past the top!"], ["babymusa|zainab", { babymusa: "Oooh!", zainab: "Shiny!" }]],
    [["harun|faris", "Is there a mummy inside?"], ["anaya|musa", "No. There's a store inside."], ["harun|ayra", "A MUMMY store?"]],
  ],
  'trip.state:Tennessee': [
    [["anaya|musa", "Tennessee! Halfway there. Everybody's still alive. Good job, team."]],
    [["ruman", "Ruman here. You're in Tennessee? Look for the mountains soon."], ["musa|ayra|harun", "Okay, Ruman!"]],
  ],
  'trip.fall': [
    [["ayra|harun", "The trees turned orange and red and yellow!"], ["musa|yusuf", "It's fall! The leaves change color here."], ["zainab|babymusa", { zainab: "Leafs! Pretty!", babymusa: "Ooooh!" }]],
    [["faris|harun", "Leaves are flying INTO the plane!"], ["anaya|yusuf", "Nobody eat the leaves."], ["zainab|babymusa", { zainab: "Leaf! Mine!", babymusa: "Nom!" }], ["anaya|musa", "I SAID nobody eat the leaves."]],
    [["ayra", "It's like flying over a bowl of cereal!"], ["harun|faris", "Fruity cereal!"], ["little", Z("Cereal!", "Nom!")]],
  ],
  'trip.nashville': [
    [["faris|harun", "That building has BATMAN EARS!"], ["yusuf|musa", "People call it the Batman Building!"], ["little", Z("Bat-man!", "Ba!")]],
    [["ayra|harun", "Is Batman home?"], ["yusuf|anaya", "He's probably at work."], ["faris|harun", "Batman has a JOB?"]],
    [["anaya|musa", "Look, the Parthenon! It's a copy of a really old building in Greece."], ["five", "Can we go to Greece next?"], ["anaya|yusuf", "In THIS box? No."]],
  ],
  'trip.smokies': [
    [["musa|yusuf", "The Smoky Mountains! See the mist? That's why they're called smoky."], ["ayra|faris", "Is it a fire?!"], ["anaya|yusuf", "It's CLOUDS. Calm down."], ["zainab|babymusa", { zainab: "Fluffy!", babymusa: "Oooh!" }]],
    [["harun|ayra", "Are there bears in the mountains?"], ["musa|yusuf", "Black bears live here!"], ["faris|harun", "I'm not scared of bears."], ["little", Z("Bear! Rawr!", "Rawr!")], ["faris|ayra", "...Okay, a LITTLE scared."]],
    [["anaya", "Everyone, look out the side. This is the prettiest part of the whole trip."], ["yusuf|musa", "Anaya Apa is being nice? Somebody write this down!"], ["anaya|musa", "Don't push it."]],
  ],
  'trip.clingmans': [
    [["yusuf|musa", "Clingmans Dome! The tower with the swirly ramp!"], ["faris|harun", "It looks like a slide! Can we slide down it?"], ["anaya|musa", "Absolutely not."]],
    [["ayra|harun", "It looks like a giant snail shell!"], ["little", Z("Snail!", "Ba!")]],
  ],
  'trip.state:North Carolina': [
    [["musa|ayra|harun", "NORTH CAROLINA! We're almost home!"], ["little", Z("Yay!", "Yaaa!")]],
    [["ruman", "Ruman here. Welcome to North Carolina, Squadron!"], ["ayra|harun", "RUMAN! We're in our STATE!"], ["ruman", "I know. I can practically hear you from here."]],
  ],
  'trip.viaduct': [
    [["yusuf|musa", "The Blue Ridge Parkway! The road floats around the mountain!"], ["harun|ayra", "How do the cars not fall off?"], ["anaya|yusuf", "Engineering. Look it up."]],
    [["faris", "If I lived on that road I'd ride my bike on it every day."], ["anaya|yusuf", "You can't even ride your bike down our driveway, Faris."], ["faris", "...I'm working on it."]],
  ],
  'trip.pilot': [
    [["musa|ayra", "Pilot Mountain! You can see it from Greensboro on clear days."], ["faris|harun", "Hey, WE'RE pilots!"], ["anaya|musa", "Only {pilot} is the pilot. You're a passenger."]],
    [["harun|ayra", "It looks like a giant cupcake!"], ["faris|harun", "With broccoli sprinkles!"], ["little", Z("Cupcake!", "Nom!")]],
  ],
  'trip.greensboro': [
    [["musa|ayra|harun", "GREENSBORO! Welcome to our town, everybody!"], ["anaya|yusuf", "Look at that sunset. Okay, I'll admit it. This is pretty cool."], ["babymusa|zainab", { babymusa: "Ba?", zainab: "Home?" }]],
    [["ruman", "Ruman here. I can SEE you! You're tiny!"], ["ayra|harun", "RUMAN! We see the town!"], ["ruman", "Get ready, I'm going outside to wave."]],
    [["yusuf|faris", "So THIS is Greensboro!"], ["musa|ayra", "Wait till you see our street. It's the best one."], ["anaya|yusuf", "We'll be the judge of that."]],
  ],
  'trip.guilford': [
    [["musa|ayra", "That's the Guilford Courthouse battlefield. It's really old!"], ["harun|ayra", "Older than Anaya Apa?"], ["anaya", "HEY."]],
    [["musa|harun", "We go there on field trips. There are statues and cannons!"], ["faris|yusuf", "CANNONS?!"], ["anaya|musa", "Old ones. For looking. Not for using."]],
  ],
  'trip.science': [
    [["musa|ayra", "The Science Center! It has an aquarium AND a zoo!"], ["ayra|faris", "Can we see the penguins? Pleeeease?"], ["little", Z("Fishies!", "Fiss!")]],
    [["harun|ayra", "Ruman took us there and a sea turtle looked right at me!"], ["faris|yusuf", "No way!"], ["harun|ayra", "Way!"]],
  ],
  'trip.coliseum': [
    [["yusuf|musa", "The Coliseum is HUGE!"], ["faris|harun", "I bet I could throw a ball over it."], ["anaya|yusuf", "You can't throw a ball over the couch."]],
    [["musa|harun", "I saw a basketball game there!"], ["yusuf|faris", "Who won?"], ["musa|ayra", "I don't remember. I just remember the nachos."]],
  ],
  'trip.downtown': [
    [["musa|yusuf", "Downtown! That's Elm Street and the Carolina Theatre sign!"], ["ayra|harun", "Can we go to the movies?"], ["anaya|musa", "In our PAJAMAS? ...Actually, yes. Later."]],
    [["faris|harun", "So many buildings!"], ["zainab|babymusa", { zainab: "Big! Big!", babymusa: "Ba!" }], ["anaya|yusuf", "Fly carefully, {pilot}. Buildings don't move out of the way."]],
  ],
  'trip.lebauer': [
    [["yusuf|musa", "Fly UNDER the floating net at LeBauer Park!"], ["five", "Under it! Under it!"], ["zainab|babymusa", { zainab: "Again!", babymusa: "Hehe!" }]],
    [["ayra|harun", "We play in that park! There's a splash pad!"], ["faris|zainab", Z("Splash!", "Splash!")]],
  ],
  'trip.depot': [
    [["five", "A TRAIN! Wave at the train!"], ["zainab|babymusa", { zainab: "Choo-choo!", babymusa: "Choo!" }]],
    [["harun|faris", "Can our plane race the train?"], ["anaya|yusuf", "We are not racing a train."], ["harun|ayra", "We'd win though."]],
  ],
  'trip.aandt': [
    [["musa|yusuf", "N.C. A&T! Go Aggies!"], ["anaya|yusuf", "I'm going to go to college one day. And I'll still be in charge."]],
    [["ruman", "Ruman here. You're passing A&T? You're almost here!"], ["ayra|harun", "Ruman, get outside and wave!"], ["ruman", "Already outside. Look for the guy waving."]],
  ],
  'trip.home': [
    [["musa|ayra|harun", "There's OUR street! The blue house!"], ["ruman", "I see you! I'm in the front yard!"], ["anaya|yusuf", "Gentle landing, {pilot}. GENTLE."]],
    [["ayra|harun", "I can see Ruman waving!"], ["yusuf|faris", "Hi, Ruman!"], ["little", Z("Hi! Hi!", "Hi!")], ["anaya|musa", "Wave AFTER we land."]],
  ],
  'trip.land': [
    [["anaya|musa", "Land on the street by the blue house. Let go of the stick if you want it to land itself."], ["little", Z("Bye-bye sky!", "Bye-bye!")]],
    [["ruman", "Ruman here. Landing zone is clear. Bring it in, Captain {pilot}!"], ["anaya|yusuf", "Easy does it..."]],
  ],

  // ======================================================== things that can happen any time
  ring: [
    [["any", "Nice!"]], [["five", "Woo-hoo!"]], [["little", Z("Yay!", "Ya!")]], [["anaya|yusuf", "Okay, that was actually good."]],
    [["faris|harun", "Bullseye!"]], [["yusuf|musa", "Smooth flying, Captain!"]], [["ayra|harun", "Right through the middle!"]],
    [["anaya|musa", "Acceptable."], ["yusuf|faris", "From Anaya Apa, that's a huge compliment."]],
    [["zainab|babymusa", Z("Circle!", "Ooh!")]], [["musa|yusuf", "Photo! Click!"]], [["faris|ayra", "Ten points! No, a MILLION points!"]],
  ],
  bump: [
    [["anaya|musa", "{pilot}! Watch where you're going!"], ["little", Z("Uh-oh!", "Uh-oh!")]],
    [["five", "Bonk! Do it again!"], ["anaya|yusuf", "Do NOT do it again."]],
    [["yusuf|musa", "Ow! My duct tape!"]],
    [["babymusa|zainab", { babymusa: "Uh-oh!", zainab: "Owie!" }]],
    [["faris|harun", "I bumped my head! ...Just kidding."], ["anaya|yusuf", "Not funny."]],
    [["anaya|musa", "If we crash, I'm telling Mom."]],
    [["harun|ayra", "Was that a tree? I think that was a tree."]],
  ],
  tapeLow: [
    [["anaya|yusuf", "One roll of tape left! Everybody hold still and nobody breathe."]],
    [["yusuf|musa", "We're almost out of duct tape!"], ["faris|harun", "I have a sticker! Will that help?"]],
  ],
  trick: [
    [["faris|harun", "WHOA! A barrel roll!"], ["zainab|babymusa", { zainab: "Again! Again!", babymusa: "Hehehe!" }]],
    [["anaya|musa", "{pilot}! I said NO flips!"], ["five", "That was the BEST!"]],
    [["ayra|harun", "My tummy did a flip too!"]],
    [["babymusa|zainab", { babymusa: "Wheee!", zainab: "Wheee!" }]],
    [["yusuf|musa", "Upside down! Everybody hold your slippers!"]],
    [["faris|ayra", "My snack fell out! ...No wait, it's in my pocket."]],
    [["anaya|yusuf", "Okay. That one was cool. ONE more."]],
  ],
  combo: [
    [["five", "Combo! You're on FIRE!"], ["anaya|yusuf", "Not literally. Please don't be literally on fire."]],
    [["yusuf|musa", "Unstoppable!"]], [["little", Z("More! More!", "Moh!")]],
  ],
  candyStar: [
    [["five", "Candy star! Can I have one?"], ["anaya|musa", "One. ONE candy."], ["little", Z("Mine!", "Nom!")]],
    [["harun|faris", "We have SO much candy!"], ["anaya|yusuf", "And none of it is for eating before dinner."]],
  ],
  sock: [
    [["ayra|faris", "A lost sock! Gross!"], ["anaya|yusuf", "Is that... MY sock?"], ["babymusa|zainab", { babymusa: "Sock!", zainab: "Socky!" }]],
    [["yusuf|musa", "The lost sock! We found it!"], ["faris|harun", "Where's the other one?"], ["anaya|musa", "That's the eternal question."]],
  ],
  crash: [
    [["anaya|musa", "The plane FELL APART! I'm telling Mom!"], ["yusuf|musa", "Don't worry, duct tape fixes everything!"], ["little", Z("Uh-oh!", "Uh-oh!")]],
    [["faris|harun", "That was AWESOME!"], ["anaya|yusuf", "That was NOT awesome."], ["yusuf|musa", "Okay, it was a little awesome."]],
  ],
  autoland: [
    [["anaya|yusuf", "Let go of the stick and the plane will land itself. Hands off, {pilot}!"]],
    [["musa|yusuf", "Landing time! Let go of the stick and the plane lands by itself."]],
  ],
  lawndart: [[["anaya|musa", "Too steep! Come in nice and slow!"]], [["yusuf|musa", "Whoa! Pull up and try again, gently!"]]],
  landedButter: [
    [["anaya|yusuf", "BUTTER landing! Okay, {pilot}, I'm impressed."], ["five", "Yaaaay!"], ["little", Z("Again!", "Ya!")]],
    [["ruman", "Ruman here. That was the smoothest landing I've ever seen."], ["anaya|musa", "Don't tell them that. They'll get a big head."]],
    [["any", "We did it!"], ["little", Z("Yay! Again!", "Ba! Ba!")]],
  ],
  landedOk: [
    [["yusuf|musa", "We landed! Everybody still has all their slippers?"], ["harun|faris", "I lost one. Just kidding!"]],
    [["anaya|musa", "Bumpy, but we're alive. Good job, {pilot}."]],
  ],
  juice: [
    [["five", "Juice box! Can I have it?"], ["anaya|yusuf", "It's for the PLANE."]],
    [["little", Z("Juice!", "Ju!")]], [["yusuf|musa", "Boost refill!"]],
  ],
  juiceLow: [
    [["yusuf|musa", "We're almost out of boost juice! Grab more juice boxes!"]],
    [["harun|ayra", "Uh oh, the juice is low. Did somebody drink it?"], ["anaya|yusuf", "Faris."], ["faris", "...Maybe."]],
  ],
  boost: [
    [["five", "BOOOOST!"]], [["little", Z("Fast! Fast!", "Wheee!")]], [["anaya|musa", "Hold on to your slippers!"]],
    [["faris|harun", "My cheeks are flapping!"]], [["yusuf|musa", "Juice-box POWER!"]],
  ],

  // random chatter while flying
  banter: [
    [["ayra|harun|faris", "Are we there yet?"], ["anaya|musa", "No."], ["ayra|harun|faris", "Are we there yet NOW?"], ["anaya|yusuf", "NO."]],
    [["harun|faris|ayra", "I need to go potty."], ["anaya|musa", "You JUST went! Hold it."], ["zainab|babymusa", { zainab: "Potty!", babymusa: "Ba!" }]],
    [["faris|harun", { faris: "Harun is touching me!", harun: "Faris is touching me!", default: "Somebody is touching me!" }], ["harun|faris|ayra", "I'm not touching you. I'm touching the AIR next to you."], ["anaya|yusuf", "Both of you, hands in your laps."]],
    [["ayra|faris", "That cloud looks like a unicorn!"], ["harun|faris", "No, it looks like a pizza."], ["little", Z("Pizza!", "Pa!")]],
    [["zainab|babymusa", Z("Juice?", "Ba? Ba?")], ["anaya|musa", "Here you go. Little sips."], ["zainab|babymusa", Z("Fank you!", "Ta!")]],
    [["babymusa|zainab", { babymusa: "Dada!", zainab: "Fan!" }], ["yusuf|musa", "The propeller looks like a big fan!"], ["babymusa|zainab", { babymusa: "Fan! Hehe!", zainab: "Fan! Hehe!" }]],
    [["faris|harun", "When I grow up I'm gonna fly a REAL plane."], ["anaya|yusuf", "When you grow up you're gonna clean your room."]],
    [["anaya|yusuf", "Everybody, inside voices! We're in a cardboard box, not a stadium."], ["five", "OKAY!!"], ["anaya|musa", "That was not an inside voice."]],
    [["ayra|harun", "I can see a cow! Moo!"], ["zainab|babymusa", { zainab: "Moo! Moo!", babymusa: "Mmmm!" }]],
    [["musa|yusuf", "This is the best summer ever."], ["anaya|musa", "Yeah. It kind of is."], ["little", Z("Best!", "Ba!")]],
    [["faris|harun|ayra", "Can I fly next?"], ["anaya|yusuf", "When you can reach the stick."], ["faris|harun", "I can reach it! ...Almost."]],
    [["ayra|harun", { ayra: "Anaya Apa, can you braid my hair?", default: "Anaya Apa, my slipper fell off!" }], ["anaya|musa", "Not while we're flying!"]],
    // Plano siblings
    [["anaya", "Yusuf, did you remember to bring Zainab's blanket?"], ["yusuf|faris", "...Define 'remember.'"], ["anaya|musa", "YUSUF."], ["zainab", "Blankie?"]],
    [["faris", "Anaya Apa, Yusuf is making faces at me!"], ["yusuf", "I'm not! This is just my face!"], ["anaya", "Both of you, eyes forward."]],
    [["zainab", "Apa! Apa!"], ["anaya|yusuf", "What is it, Zainab?"], ["zainab", "...Hi!"], ["anaya|yusuf", "Hi, Zainab."]],
    [["yusuf|faris", "Anaya Apa, are you EVER not in charge?"], ["anaya", "No. I was born in charge."]],
    [["faris|zainab", { faris: "Our house is the best house.", zainab: "Our house!", default: "Plano is the best!" }], ["musa|ayra|harun", "Our house has a basketball hoop!"], ["yusuf|faris", "...Okay, that IS pretty good."]],
    // Greensboro siblings
    [["ayra", "Musa, are you going to show them our room?"], ["musa|harun", "Yeah! And the backyard! And the tree!"], ["harun|ayra", "And my rock collection!"], ["anaya|yusuf", "Can't wait. Truly."]],
    [["harun", "I miss Ruman."], ["ayra|musa", "We'll see him soon!"], ["harun|ayra", "I want to tell him we flew in a BOX."]],
    [["musa|ayra", "Harun, stop kicking my seat."], ["harun", "I'm not kicking. I'm doing airplane legs."]],
    [["ayra|harun", "When we get home I want pancakes."], ["musa|harun", "It's going to be dinnertime."], ["ayra|faris", "Dinner pancakes!"]],
    // the walkie-talkie
    [["ruman", "Ruman here. How's the flight?"], ["anaya|yusuf", "Loud."], ["five", "AWESOME!"], ["ruman", "Sounds about right."]],
    [["ruman", "Ruman here. Anaya, are you bossing everyone again?"], ["anaya", "Somebody has to, Ruman."], ["ruman", "Fair enough."]],
    [["ruman", "Ruman here. Just checking: is everybody still wearing the pajamas?"], ["any", "OBVIOUSLY!"], ["little", Z("Jammies!", "Ba!")]],
    [["ruman", "Ruman here. I made the beds for everyone. You owe me."], ["musa|ayra|harun", "Thanks, Ruman!"], ["anaya|yusuf", "We'll see if they're made correctly."]],
    [["ayra|harun", "Ruman, are you there?"], ["ruman", "I'm here. I'm always here. It's a walkie-talkie."]],
    // the little ones
    [["zainab", "Birdie!"], ["babymusa|zainab", Z("Birdie!", "Bir!")], ["anaya|musa", "Yes, birds. We're flying with the birds."]],
    [["babymusa", "Ba!"], ["zainab|ayra", Z("Ba!", "Ba!")], ["babymusa", "Ba-ba!"], ["yusuf|musa", "I think they're having a conversation."]],
    [["zainab", "Sleepy..."], ["anaya|yusuf", "You can nap, Zainab. I'll wake you up in Greensboro."], ["zainab", "No nap!"]],
    [["babymusa", "Uh-oh!"], ["anaya|musa", "What happened?"], ["babymusa", "Hehe!"], ["anaya|yusuf", "Nothing happened. He just likes saying uh-oh."]],
    [["zainab", "Mine plane!"], ["faris|yusuf", "It's everybody's plane, Zainab."], ["zainab", "MINE."]],
    [["babymusa", "Mama?"], ["anaya|musa", "We'll see everybody soon, Baby Musa."], ["babymusa", "Ba!"]],
    // the five-year-olds
    [["faris", "I have a joke. Why did the airplane go to school?"], ["harun|ayra", "Why?"], ["faris|harun", "To get HIGHER grades!"], ["five", "HAHAHAHA!"], ["anaya|yusuf", "...That was actually funny."]],
    [["harun", "What's the biggest number?"], ["ayra|faris", "A hundred million!"], ["harun|faris", "A hundred million plus ONE!"], ["anaya|musa", "Infinity. Now be quiet."]],
    [["ayra", "I'm going to count the clouds. One... two... a lot."]],
    [["faris|harun", "If we see a dragon, I'm going to be its friend."], ["ayra|harun", "Dragons aren't real."], ["faris|harun", "That's what a dragon WANTS you to think."]],
    [["harun|ayra", "Can airplanes get tired?"], ["musa|yusuf", "This one runs on juice boxes, so... maybe."]],
    [["ayra|faris", "I'm a pilot too. I'm the back-seat pilot."], ["anaya", "That's called a passenger."]],
    [["five", "Let's sing a song!"], ["anaya|yusuf", "No singing."], ["five", "La la la la la!"], ["anaya|musa", "I said—oh, forget it."], ["little", Z("La la!", "Ya ya!")]],
    [["harun|faris", "I spy with my little eye... something BLUE."], ["ayra|faris", "The sky?"], ["harun|faris", "...Yes. How did you know?"]],
    [["faris|ayra", "I spy something RED."], ["any", "Our pajamas."], ["faris|ayra", "Everybody always gets that one."]],
    // the big kids
    [["yusuf", "Musa, remember when this was just a box in the garage?"], ["musa", "And now it's the best plane in the world."], ["anaya|yusuf", "It's still a box."]],
    [["musa", "Yusuf, you're staying all summer, right?"], ["yusuf", "All summer!"], ["five", "ALL SUMMER!"]],
    [["anaya|yusuf", "Okay, quick headcount. Everyone say here."], ["any", "Here!"], ["any", "Here!"], ["little", Z("Here!", "Ba!")], ["anaya|yusuf", "Good. Nobody fell out."]],
    [["yusuf|musa", "Captain {pilot}, you're doing great!"], ["anaya|musa", "Don't distract the pilot."]],
    [["musa|yusuf", "What should we name the plane?"], ["faris|harun", "Boxy McBoxface!"], ["ayra|harun", "Sparkle Cloud!"], ["zainab|babymusa", Z("Ba!", "Ba!")], ["anaya|yusuf", "We are not naming it Ba."]],
    [["anaya", "Faris, sit down."], ["faris|harun", "I AM sitting."], ["anaya|musa", "Sit down MORE."]],
    [["anaya|yusuf", "When we land, everyone washes their hands. Juice-box hands are sticky hands."], ["five", "Awww."]],
  ],
};
