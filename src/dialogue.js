// Who's who, and everything the squad says to each other.
//
// The Plano house:      Anaya Apa (13), Yusuf (10), Faris (5), Zainab (2)
// The Greensboro house: Musa (10), Hassan (10), Ayra (5), Harun (5) and Ruman (13, not playable: he talks on the walkie-talkie)
// Also flying: Baby Musa (1)
//
// A script is a list of conversations; one is picked at random (without repeating recent ones).
// A conversation is a list of lines: [speakers, text]
//   speakers: 'anaya|yusuf' means the first one of them who isn't the pilot (and didn't just talk) says it.
//             Groups: little, five, big, plano, gso, any. 'ruman' is the walkie-talkie.
//   text:     may contain {pilot}; or an object keyed by speaker id, with a `default`.

export const NAMES = {
  yusuf: 'Yusuf', musa: 'Musa', anaya: 'Anaya Apa', ayra: 'Ayra', harun: 'Harun', faris: 'Faris', zainab: 'Zainab', babymusa: 'Baby Musa', hassan: 'Hassan', ruman: 'Ruman',
};
export const AGES = { yusuf: 10, musa: 10, anaya: 13, ayra: 5, harun: 5, faris: 5, zainab: 2, babymusa: 1, hassan: 10, ruman: 13 };
export const HOUSE = { anaya: 'plano', yusuf: 'plano', faris: 'plano', zainab: 'plano', musa: 'gso', hassan: 'gso', ayra: 'gso', harun: 'gso', ruman: 'gso' };
const GROUPS = {
  little: ['zainab', 'babymusa'], five: ['ayra', 'harun', 'faris'], big: ['yusuf', 'musa', 'hassan', 'anaya'],
  plano: ['anaya', 'yusuf', 'faris', 'zainab'], gso: ['musa', 'hassan', 'ayra', 'harun'],
  any: ['yusuf', 'musa', 'hassan', 'anaya', 'ayra', 'harun', 'faris', 'zainab', 'babymusa'],
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
      ["yusuf|musa|hassan", "Captain {pilot}, steer with the stick and fly through the glowing rings!"], ["little", Z("Wheee!", "Ba!")]],
    [["yusuf|musa", "Squad, welcome aboard! Captain {pilot} is flying today!"], ["anaya", "I'm the oldest, so I'm in charge back here."], ["faris|harun", "Nuh-uh!"],
      ["anaya|yusuf", "Uh-huh. Rings first, {pilot}. Fly through all of them."], ["little", Z("Go! Go!", "Ba!")]],
    [["ruman", "Ruman here, at the Greensboro house. Squadron, do you copy?"], ["musa|hassan|ayra|harun", "We copy, Ruman! We're doing a test flight in Plano first!"],
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
    [["anaya|yusuf|musa", "Landing time! The plane lands itself on Sunny Lane."], ["little", Z("Bye-bye sky!", "Bye-bye!")]],
    [["yusuf|anaya", "Our street! Bring it down nice and slow, {pilot}."], ["ruman", "Ruman here. Did you land yet? I'm bored."]],
  ],

  'intro.introTruck': [
    [["anaya|yusuf", "FARIS. Where did the PLANE go?!"], ["yusuf|musa", "He turned it into a TRUCK! A flying truck!"], ["five", "It's SO SHINY!"],
      ["little", Z("Twuck! Twuck!", "Vroom!")], ["anaya|yusuf", "Fine. Everybody in the back. Hold on to the sides."]],
    [["ruman", "Ruman here. Uh... is that a flying TRUCK?"], ["musa|hassan|ayra|harun", "Faris is driving!"], ["ruman", "Of course he is."], ["anaya|yusuf", "Everybody stay sitting down in the truck bed!"]],
    [["yusuf|musa", "Captain Faris, your truck is ready! Fly through the rings!"], ["ayra|harun", "Why is it all pointy?"], ["anaya|yusuf", "Because Faris drew it. With a ruler."], ["zainab|babymusa", Z("Pointy!", "Ba!")]],
  ],
  'intro.introTender': [
    [["yusuf|faris", "ANAYA APA. Did you turn the plane into a CHICKEN TENDER?!"], ["five", "It smells SO GOOD!"], ["little", { zainab: "Chicken! Chicken!", babymusa: "Nom nom!", default: "Chicken!" }],
      ["musa|hassan", "Of course she did. She ALWAYS orders chicken tenders."], ["yusuf|faris", "Rule number one: nobody bites the plane."]],
    [["ruman", "Ruman here. Uh... why is there a giant chicken tender flying over Plano?"], ["yusuf|faris", "Anaya Apa is driving."], ["ruman", "That explains everything."]],
    [["ayra|harun", "Can I have a bite? Just a tiny one?"], ["yusuf|musa", "Anaya Apa said if anyone bites the plane, they WALK to Greensboro."], ["little", { zainab: "Bite!", babymusa: "Nom!", default: "Nom!" }]],
  ],
  'trip.introTender': [
    [["musa|hassan", "We're flying to Greensboro... on a chicken tender."], ["yusuf|faris", "Extra crispy!"], ["five", "With dipping sauce rockets!"], ["little", { zainab: "Sauce!", babymusa: "Ba!", default: "Sauce!" }]],
    [["ruman", "Ruman here. Anaya, are you seriously flying a chicken tender all the way here?"], ["yusuf|musa", "She says it's the best food AND the best plane."], ["ruman", "...Save me a piece."]],
  ],
  'intro.introLego': [
    [["musa|hassan", "Yusuf, did you build the WHOLE plane out of bricks?!"], ["faris|anaya", "He was in the garage ALL night."], ["five", "It's like a giant toy!"], ["little", { zainab: "Bricks! Bricks!", babymusa: "Ba!", default: "Bricks!" }],
      ["anaya|musa", "Nobody pull any pieces off. I mean it."]],
    [["ruman", "Ruman here. Is that a plane made of... toy bricks?"], ["anaya|musa", "Yusuf built it. Every single piece."], ["ruman", "Respect."]],
    [["ayra|harun", "Can I add a brick? Pleeease?"], ["anaya|musa", "Not while we're flying!"], ["zainab|babymusa", { zainab: "Me brick!", babymusa: "Ba!" }]],
  ],
  'trip.introLego': [
    [["musa|hassan", "All the way to Greensboro in a brick plane!"], ["faris|harun", "Did you follow the instructions?"], ["anaya|musa", "Yusuf doesn't use instructions."], ["little", { zainab: "Uh-oh!", babymusa: "Uh-oh!" }]],
  ],
  'intro.introDragon': [
    [["five", "AYRA HAS A DRAGON!"], ["anaya|yusuf", "A golden, sparkly, glowing... CONCERT dragon?"], ["musa|hassan", "Of course. Ayra loves K-pop."], ["little", { zainab: "Dragon! Rawr!", babymusa: "Rawr!", default: "Rawr!" }]],
    [["ruman", "Ruman here. Why is there a golden dragon flying over Plano?"], ["musa|hassan", "Ayra is driving it."], ["ruman", "...Of course she is."]],
    [["anaya|yusuf", "Everybody hold on to the dragon. Gently. Don't pull its mane."], ["harun|faris", "It's so SHINY!"], ["zainab|babymusa", { zainab: "Pretty!", babymusa: "Ooooh!" }]],
  ],
  'trip.introDragon': [
    [["musa|hassan", "We're riding a golden dragon to Greensboro!"], ["five", "Best. Concert. EVER."], ["anaya|yusuf", "This is not a concert."], ["faris|harun", "It's a SKY concert!"]],
  ],
  'trip.introTruck': [
    [["musa|hassan|ayra|harun", "We're flying to Greensboro in a TRUCK!"], ["anaya|yusuf", "In the BACK of a truck. With the wind in our hair."], ["five", "BEST. DAY. EVER."], ["little", Z("Vroom vroom!", "Vroom!")]],
    [["ruman", "Ruman here. Faris, you're driving all the way to Greensboro?"], ["anaya|yusuf", "He says he's a very good driver."], ["ruman", "He's five."], ["anaya|musa", "I KNOW."]],
  ],

  // ======================================================== The Big Flight
  'trip.intro': [
    [["musa|hassan|ayra|harun", "Next stop: OUR house in Greensboro! Everybody ready?"], ["five", "Did anybody pack snacks?"], ["anaya|yusuf", "I packed snacks. Obviously. I pack everything."],
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
    [["ayra|harun", "Is Dallas bigger than Greensboro?"], ["musa|hassan|harun", "Greensboro has better trees."], ["yusuf|anaya|faris", "Dallas has a giant glowing ball. Just saying."]],
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
    [["ruman", "Ruman here. You're in Tennessee? Look for the mountains soon."], ["musa|hassan|ayra|harun", "Okay, Ruman!"]],
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
    [["musa|hassan|ayra|harun", "NORTH CAROLINA! We're almost home!"], ["little", Z("Yay!", "Yaaa!")]],
    [["ruman", "Ruman here. Welcome to North Carolina, Squadron!"], ["ayra|harun", "RUMAN! We're in our STATE!"], ["ruman", "I know. I can practically hear you from here."]],
  ],
  'trip.viaduct': [
    [["yusuf|musa", "The Blue Ridge Parkway! The road floats around the mountain!"], ["harun|ayra", "How do the cars not fall off?"], ["anaya|yusuf", "Engineering. Look it up."]],
    [["faris", "If I lived on that road I'd ride my bike on it every day."], ["anaya|yusuf", "You can't even ride your bike down our driveway, Faris."], ["faris", "...I'm working on it."]],
  ],
  'trip.pilot': [
    [["musa|hassan|ayra", "Pilot Mountain! You can see it from Greensboro on clear days."], ["faris|harun", "Hey, WE'RE pilots!"], ["anaya|musa", "Only {pilot} is the pilot. You're a passenger."]],
    [["harun|ayra", "It looks like a giant cupcake!"], ["faris|harun", "With broccoli sprinkles!"], ["little", Z("Cupcake!", "Nom!")]],
  ],
  'trip.greensboro': [
    [["musa|hassan|ayra|harun", "GREENSBORO! Welcome to our town, everybody!"], ["anaya|yusuf", "Look at that sunset. Okay, I'll admit it. This is pretty cool."], ["babymusa|zainab", { babymusa: "Ba?", zainab: "Home?" }]],
    [["ruman", "Ruman here. I can SEE you! You're tiny!"], ["ayra|harun", "RUMAN! We see the town!"], ["ruman", "Get ready, I'm going outside to wave."]],
    [["yusuf|faris", "So THIS is Greensboro!"], ["musa|hassan|ayra", "Wait till you see our street. It's the best one."], ["anaya|yusuf", "We'll be the judge of that."]],
  ],
  'trip.guilford': [
    [["musa|hassan|ayra", "That's the Guilford Courthouse battlefield. It's really old!"], ["harun|ayra", "Older than Anaya Apa?"], ["anaya", "HEY."]],
    [["musa|hassan|harun", "We go there on field trips. There are statues and cannons!"], ["faris|yusuf", "CANNONS?!"], ["anaya|musa", "Old ones. For looking. Not for using."]],
  ],
  'trip.science': [
    [["musa|hassan|ayra", "The Science Center! It has an aquarium AND a zoo!"], ["ayra|faris", "Can we see the penguins? Pleeeease?"], ["little", Z("Fishies!", "Fiss!")]],
    [["harun|ayra", "Ruman took us there and a sea turtle looked right at me!"], ["faris|yusuf", "No way!"], ["harun|ayra", "Way!"]],
  ],
  'trip.coliseum': [
    [["yusuf|musa", "The Coliseum is HUGE!"], ["faris|harun", "I bet I could throw a ball over it."], ["anaya|yusuf", "You can't throw a ball over the couch."]],
    [["musa|hassan|harun", "I saw a basketball game there!"], ["yusuf|faris", "Who won?"], ["musa|hassan|ayra", "I don't remember. I just remember the nachos."]],
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
    [["musa|hassan|ayra|harun", "There's OUR street! The blue house!"], ["ruman", "I see you! I'm in the front yard!"], ["anaya|yusuf", "Gentle landing, {pilot}. GENTLE."]],
    [["ayra|harun", "I can see Ruman waving!"], ["yusuf|faris", "Hi, Ruman!"], ["little", Z("Hi! Hi!", "Hi!")], ["anaya|musa", "Wave AFTER we land."]],
  ],
  'trip.land': [
    [["anaya|musa", "Landing time! The plane lands itself by the blue house."], ["little", Z("Bye-bye sky!", "Bye-bye!")]],
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
    [["anaya|yusuf", "Landing time! The plane lands itself. Everybody hold on!"]],
    [["musa|yusuf", "Auto-landing! Here we go!"], ["little", Z("Down! Down!", "Ba!")]],
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

  honk: [
    [["five", "HONK HONK! Do it again!"], ["anaya|yusuf", "Please don't do it again."]],
    [["little", Z("Honk! Honk!", "Onk!")]],
    [["faris|harun", "The plane has a HORN?!"], ["yusuf|musa", "It's a bike horn. I taped it on."]],
    [["anaya|musa", "Who are you honking at? We're in the SKY."], ["five", "The birds!"]],
    [["zainab|babymusa", Z("Again! Again!", "Hehe! Onk!")], ["anaya|yusuf", "Great. Now they'll want it the whole trip."]],
    [["ayra|harun", "Honk at the clouds!"], ["any", "Hi, clouds!"]],
    [["anaya|yusuf", "That horn is SO loud."], ["yusuf|musa", "That's the best part!"]],
  ],
  honkTruck: [
    [["five", "WHOA! The truck horn is SO LOUD!"], ["anaya|yusuf", "My ears!"]],
    [["little", Z("Beep beep!", "Bee!")]],
    [["yusuf|musa", "That's a real truck horn!"], ["anaya|musa", "Faris, stop honking at the birds."]],
    [["ayra|harun", "Honk again, Faris! HONK AGAIN!"], ["anaya|yusuf", "Do NOT honk again."]],
    [["zainab|babymusa", Z("Twuck honk!", "Onk!")], ["ruman", "Ruman here. Was that you? I heard that all the way in Greensboro."]],
  ],

  honkTender: [
    [["five", "Was that a CHICKEN?!"], ["yusuf|musa", "The chicken tender has a CHICKEN horn!"], ["little", { zainab: "Bawk bawk!", babymusa: "Bok!", default: "Bawk!" }]],
    [["faris|harun", "BAWK BAWK! Do it again, Anaya Apa!"], ["zainab|babymusa", { zainab: "Again! Bawk!", babymusa: "Bok bok!" }]],
    [["yusuf|musa", "The birds are going to think we're a giant chicken."], ["ayra|harun", "We ARE a giant chicken!"]],
    [["ruman", "Ruman here. Did a chicken just get on the walkie-talkie?"], ["hassan|musa", "That was Anaya Apa's horn!"]],
    [["little", { zainab: "Chicky! Chicky!", babymusa: "Bok!", default: "Bok!" }]],
  ],
  honkLego: [
    [["five", "BEEP BEEP!"], ["little", { zainab: "Beep! Beep!", babymusa: "Bee!" }]],
    [["musa|hassan", "The brick plane has a toy horn!"], ["anaya|musa", "Of course it does."]],
    [["faris|harun", "Beep it again! BEEP IT AGAIN!"], ["anaya|musa", "Please don't."]],
  ],
  honkDragon: [
    [["five", "The dragon ROARED!"], ["little", { zainab: "Rawr! Rawr!", babymusa: "Raa!" }]],
    [["anaya|yusuf", "That roar was LOUD. And kind of... sparkly?"], ["harun|faris", "It's a concert dragon! It sings!"]],
    [["ruman", "Ruman here. Did a dragon just roar? Over."], ["musa|hassan", "Yes. Over."], ["ruman", "Cool. Over."]],
    [["faris|harun", "Do it again, Ayra! Make it roar!"], ["zainab|babymusa", { zainab: "Again! Rawr!", babymusa: "Rawr!" }]],
  ],
  legoBanter: [
    [["faris|harun", "A brick just fell off!"], ["anaya|musa", "WHAT?!"], ["faris|harun", "Just kidding."], ["anaya|musa", "NOT funny."]],
    [["musa|hassan", "How many bricks is this plane?"], ["anaya|faris", "Yusuf says about a million."], ["five", "A MILLION?!"]],
    [["zainab|babymusa", { zainab: "Brick! Mine!", babymusa: "Ba!" }], ["anaya|musa", "No eating bricks!"]],
    [["ayra|harun", "If we crash, can we just build it again?"], ["musa|anaya", "That's the best part of bricks!"]],
    [["anaya|faris", "Everybody stay in your brick seat. Your BRICK seat."]],
    [["harun|ayra", "Ow! I stepped on a brick!"], ["anaya|musa", "That's the worst feeling in the whole world."]],
  ],
  dragonBanter: [
    [["harun|faris", "The dragon's scales are so shiny I can see myself!"], ["little", { zainab: "Me! Me!", babymusa: "Ba!" }]],
    [["five", "Let's sing a K-pop song!"], ["anaya|yusuf", "No singing on the dragon."], ["five", "La la la LAAA!"], ["anaya|musa", "...Fine. ONE song."]],
    [["musa|hassan", "The lights on the side keep changing colors!"], ["harun|faris", "It's like a light show!"]],
    [["faris|harun", "Does the dragon eat candy?"], ["anaya|musa", "If it does, we're in trouble."]],
    [["zainab|babymusa", { zainab: "Dragon nice!", babymusa: "Ba-ba!" }], ["musa|yusuf", "It IS a nice dragon."]],
    [["harun|faris", "Can we keep the dragon?"], ["anaya|musa", "Where would it even sleep?"], ["harun|faris", "In the backyard!"]],
    [["musa|hassan", "Everybody wave your light sticks!"], ["five", "*waves light sticks*"], ["little", { zainab: "Wave! Wave!", babymusa: "Ya!" }]],
  ],
  // extra chatter when Anaya Apa is flying the giant chicken tender
  tenderBanter: [
    [["harun|faris", "I'm so hungry. This plane is making me SO hungry."], ["yusuf|musa", "Don't lick the plane!"], ["harun|ayra", "I wasn't! ...Okay, a little."]],
    [["ayra|faris", "Is there honey mustard?"], ["musa|hassan", "There's honey mustard in the rocket cups!"], ["ayra|harun", "This is the best plane EVER."]],
    [["zainab|babymusa", { zainab: "Nugget!", babymusa: "Nom!" }], ["yusuf|faris", "It's a TENDER, not a nugget. Anaya Apa will want you to know that."]],
    [["faris|yusuf", "My hands are all crumbly."], ["musa|hassan", "That's the breading. It's very crispy."]],
    [["hassan|musa", "When we land, can we get actual chicken tenders?"], ["any", "YES!"], ["little", { zainab: "Yes!", babymusa: "Ya!" }]],
    [["ayra|harun", "Why do we have french fries for wings?"], ["yusuf|faris", "Because Anaya Apa said a tender without fries is just sad."]],
    [["yusuf", "Anaya Apa has eaten chicken tenders at every restaurant in Plano."], ["musa|hassan", "Every one?"], ["yusuf|faris", "Every. Single. One."]],
    [["harun|ayra", "If the plane gets hungry, does it eat itself?"], ["musa|yusuf", "...I really hope not."]],
  ],

  // extra chatter when Faris is driving the flying truck
  truckBanter: [
    [["ayra|harun", "The truck is so shiny I can see my face in it!"], ["little", Z("Me! Me in truck!", "Ba!")]],
    [["yusuf|musa", "Faris, does this thing have a radio?"], ["anaya|yusuf", "Do NOT let him find the radio."]],
    [["harun|ayra", "Wind in my hair! Wind in my HAIR!"], ["anaya|musa", "Hold on to your slippers in the back!"]],
    [["five", "Can we honk? Faris, HONK!"], ["anaya|yusuf", "Trucks don't honk in the sky."], ["little", Z("Beep beep!", "Bee!")]],
    [["musa|yusuf", "It flies with little blue rockets underneath!"], ["harun|ayra", "Rocket truck! ROCKET TRUCK!"]],
    [["anaya|yusuf", "Faris, eyes on the road. I mean the sky. I mean the rings."]],
    [["zainab|babymusa", Z("Twuck go up!", "Up! Up!")], ["yusuf|musa", "Yep, the truck goes up!"]],
    [["ayra|harun", "This is the coolest truck in the whole world."], ["anaya|musa", "It's the ONLY flying truck in the whole world."]],
  ],

  // random chatter while flying
  banter: [
    [["hassan", "Yusuf, when we land, basketball. One on one."], ["yusuf", "You're ON."], ["musa|anaya", "I'm reffing."], ["five", "Can we play too?!"]],
    [["hassan", "Musa, I bet I can count more cows than you."], ["musa", "You're on. One... two..."], ["hassan", "Seventeen!"], ["musa", "That's not fair, you're on the cow side!"]],
    [["hassan", "Anaya Apa, can I be in charge of the snacks?"], ["anaya", "Absolutely not."], ["hassan", "Worth a try."]],
    [["harun|ayra", "Hassan, tell the joke about the cardboard box!"], ["hassan", "Why did the box go to the doctor? It felt a little... flat."], ["five", "HAHAHA!"], ["anaya|yusuf", "That was terrible. I love it."]],
    [["hassan", "When we get home, I'm showing everybody my new basketball shoes."], ["faris|harun", "Are they fast?"], ["hassan", "SUPER fast. Faster than this plane."], ["yusuf|musa", "Nothing is faster than this plane."]],
    [["hassan", "Ruman, are you there? Over."], ["ruman", "I'm here, Hassan. Over."], ["hassan", "Just checking. Over."], ["ruman", "...Okay. Over."]],
    [["zainab|babymusa", Z("Hassan! Hassan!", "Ha-ha!")], ["hassan", "Hi, little buddy! High five!"], ["zainab|babymusa", Z("Fi!", "Ba!")]],
    [["hassan", "I can see the Greensboro house from here!"], ["anaya|yusuf", "We're still in a different state, Hassan."], ["hassan", "...I can IMAGINE it."]],
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
    [["faris|zainab", { faris: "Our house is the best house.", zainab: "Our house!", default: "Plano is the best!" }], ["musa|hassan|ayra|harun", "Our house has a basketball hoop!"], ["yusuf|faris", "...Okay, that IS pretty good."]],
    // Greensboro siblings
    [["ayra", "Musa, are you going to show them our room?"], ["musa|hassan|harun", "Yeah! And the backyard! And the tree!"], ["harun|ayra", "And my rock collection!"], ["anaya|yusuf", "Can't wait. Truly."]],
    [["harun", "I miss Ruman."], ["ayra|musa|hassan", "We'll see him soon!"], ["harun|ayra", "I want to tell him we flew in a BOX."]],
    [["musa|hassan|ayra", "Harun, stop kicking my seat."], ["harun", "I'm not kicking. I'm doing airplane legs."]],
    [["ayra|harun", "When we get home I want pancakes."], ["musa|hassan|harun", "It's going to be dinnertime."], ["ayra|faris", "Dinner pancakes!"]],
    // the walkie-talkie
    [["ruman", "Ruman here. How's the flight?"], ["anaya|yusuf", "Loud."], ["five", "AWESOME!"], ["ruman", "Sounds about right."]],
    [["ruman", "Ruman here. Anaya, are you bossing everyone again?"], ["anaya", "Somebody has to, Ruman."], ["ruman", "Fair enough."]],
    [["ruman", "Ruman here. Just checking: is everybody still wearing the pajamas?"], ["any", "OBVIOUSLY!"], ["little", Z("Jammies!", "Ba!")]],
    [["ruman", "Ruman here. I made the beds for everyone. You owe me."], ["musa|hassan|ayra|harun", "Thanks, Ruman!"], ["anaya|yusuf", "We'll see if they're made correctly."]],
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
