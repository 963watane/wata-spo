// In-arena story scenes: short exchanges the 3D chibis act out on the battlefield
// right before the enemies appear (start) and after the last one falls (end).
// The illustrated visual-novel story (story-data.js) still plays before and after
// the stage; these lines pick up where it leaves off. Same format: [speaker, text].
// speaker = a member id, 'narrator', or 'chat'. Members who speak but aren't in the
// squad appear in the scene and step back before the fight. Lines are fiction.
const FIELD = {
  '1-1': {
    start: [
      ['sendo', 'Okay, they\'re right in front of us. Tsuna-senpai, stay behind me! I\'m the jungler, I go in first!'],
      ['tsuna', 'Their eyes are spinning. Like a loading wheel... with teeth.'],
      ['chat', 'here they come / sendo pls don\'t int / ganbare!!'],
    ],
    end: [
      ['tsuna', 'All popped! Sendo, your aim is actually really good.'],
      ['sendo', '"Actually"?! I\'m always good! ...Okay, I\'m sometimes good.'],
    ],
  },
  '1-2': {
    start: [
      ['tsuna', 'There, on the far side. The thin ones with the crosshair eyes.'],
      ['sendo', 'Snipers. Stay out of the red lines, senpai. Those are where the shots go!'],
    ],
    end: [
      ['sendo', 'Lane cleared! The trail keeps going, though.'],
      ['tsuna', 'It\'s heading toward another stream. A really noisy one.'],
    ],
  },
  '1-3': {
    start: [
      ['noah', 'Ahaha, here we go! Green ones first, okay? They heal the others!'],
      ['tsuna', 'Senpai, please don\'t charge in alone again.'],
      ['noah', 'I won\'t! ...Probably!'],
    ],
    end: [
      ['noah', 'That was SO fun! Again! Let\'s do it again!'],
      ['sendo', 'Kurumi-senpai, your chat is still typing "RUN BOTS RUN".'],
    ],
  },
  '1-4': {
    start: [
      ['hinano', 'Wall in front, bots behind it. Break the big one first. Noah, wait for my call.'],
      ['noah', 'Waiting! Look at me, I\'m waiting!'],
      ['hinano', 'You\'re bouncing.'],
      ['noah', 'I\'m bouncing patiently!'],
    ],
    end: [
      ['hinano', 'Clean. That\'s how we do it.'],
      ['noah', 'She said clean! Chat, Hinano said clean!'],
    ],
  },
  '1-5': {
    start: [
      ['sendo', 'Ugh, every step feels half a second late.'],
      ['hinano', 'The pink ones drain your rhythm. Stay mobile, dodge early.'],
      ['tsuna', 'And when they blink next to you, turn around. They love your back.'],
    ],
    end: [
      ['noah', 'My timing\'s back! Hello timing, I missed you!'],
      ['hinano', 'Heal up. That heartbeat sound is getting louder.'],
    ],
  },
  '1-6': {
    start: [
      ['narrator', 'Static shivers across the stage. Something crimson is watching from the far end.'],
      ['hinano', 'Minions first, then him. When the ground goes red around him, get OUT.'],
      ['noah', 'And if he breaks, I go all in?'],
      ['hinano', '...And if he breaks, you go all in.'],
    ],
    end: [
      ['sendo', 'We... we actually did it!'],
      ['tsuna', 'He was still smiling when he faded. I didn\'t like that.'],
      ['hinano', 'Later. Right now, everyone breathe.'],
    ],
  },
  '2-1': {
    start: [
      ['noah', 'So this is what the city looks like from inside a traffic camera.'],
      ['sendo', 'Shades on the crossing! Jungle rules: clear the camp, then rotate!'],
      ['hinano', 'Rotate WITH us, Sendo.'],
    ],
    end: [
      ['tsuna', 'The camera lights are going back to green. One down.'],
      ['sendo', 'Only a few hundred more cameras to go!'],
    ],
  },
  '2-2': {
    start: [
      ['hinano', 'Firewall again. You know the drill.'],
      ['noah', 'Break the wall, then the bots! I remember!'],
      ['chat', 'mods are asleep / now\'s our chance / GO GO GO'],
    ],
    end: [
      ['noah', 'Comments are flowing again! I can read everything!'],
      ['hinano', '...Maybe don\'t read everything.'],
    ],
  },
  '2-3': {
    start: [
      ['sendo', 'Three waves. Deep breaths, everyone.'],
      ['noah', 'Ult saved. Ult staying saved. Ult is a treasure.'],
      ['tsuna', 'You\'re talking to your Ultimate now?'],
    ],
    end: [
      ['noah', 'I used it on the last wave! Exactly like Hinano said!'],
      ['hinano', 'I saw. Proud of you.'],
    ],
  },
  '2-4': {
    start: [
      ['narrator', 'No music. No chat. Just the hum of dead air.'],
      ['noah', 'If something jumps out, I\'m allowed to scream. That\'s the rule.'],
      ['hinano', 'You can scream after you dodge.'],
    ],
    end: [
      ['noah', 'I didn\'t scream! ...Much.'],
      ['tsuna', 'There\'s music up ahead. Somebody\'s setting up a stage.'],
    ],
  },
  '2-5': {
    start: [
      ['tsuna', 'His stage, his lights. Fine. I\'ll paint over all of it.'],
      ['hinano', 'He dashes in a straight line. Step to the side, not back.'],
      ['sendo', 'Final lap! Let\'s go, everyone!'],
    ],
    end: [
      ['noah', 'Second act, second win!'],
      ['tsuna', 'Do you feel that? The floor is humming. Something huge is underneath.'],
    ],
  },
  '2-6': {
    start: [
      ['hinano', 'That\'s the Core. When it pulses, the rings come out. Dodge THROUGH them.'],
      ['noah', 'Is it thundering? That\'s thunder. I hate thunder.'],
      ['tsuna', 'It\'s static, senpai! Static! Probably!'],
      ['sendo', 'Burn it down, take the buff, win the game!'],
    ],
    end: [
      ['sendo', 'Every stream in the city just came back online!'],
      ['hinano', 'We did it. All of us.'],
    ],
  },
  '3-1': {
    start: [
      ['tsuna', 'Trolls. Fed on angry comments. They\'re huge.'],
      ['hinano', 'They throw fire where you\'re standing. Keep moving and they miss.'],
      ['noah', 'Moving! I\'m great at moving!'],
    ],
    end: [
      ['sendo', 'The comment section is so much calmer now.'],
      ['hinano', 'Somebody\'s farming those trolls. This isn\'t over.'],
    ],
  },
  '3-2': {
    start: [
      ['uruha', 'Okay. Clip thieves. They steal Energy when they hit, so don\'t let them near you.'],
      ['noah', 'Got it! Charge in and—'],
      ['uruha', 'That is the OPPOSITE of what I just said!'],
    ],
    end: [
      ['uruha', 'See? Plan. Works. Every time.'],
      ['noah', 'Uruha is so cool when she\'s mad!'],
      ['uruha', 'I\'m not mad! ...I\'m passionate.'],
    ],
  },
  '3-3': {
    start: [
      ['lisa', 'Good day, trolls! I\'m afraid this argument is over. Ohoho!'],
      ['uruha', 'You can\'t just announce that!'],
      ['hinano', 'Three waves. Save something for the last one.'],
    ],
    end: [
      ['lisa', 'Everyone did wonderfully. Potatoes for all!'],
      ['uruha', 'Where are you even getting potatoes from?'],
    ],
  },
  '3-4': {
    start: [
      ['narrator', 'Overhead, the giant eye of thumbnails blinks.'],
      ['lisa', 'It\'s watching us. How rude.'],
      ['uruha', 'Ignore the eye. Focus on what\'s in front of you. For real.'],
    ],
    end: [
      ['sendo', 'It flinched. It actually flinched!'],
      ['hinano', 'Good. Let it be scared.'],
    ],
  },
  '3-5': {
    start: [
      ['hinano', 'Copies of us. Everywhere.'],
      ['tsuna', 'Their lines are all wrong. Copies can never get the lines right.'],
      ['uruha', 'They hit like the real thing though! Dodge!'],
    ],
    end: [
      ['noah', 'The real ones win! Obviously!'],
      ['sendo', 'They kept saying the same name, though...'],
    ],
  },
  '3-6': {
    start: [
      ['narrator', 'The wall of screens turns, every one of them showing the same eye.'],
      ['uruha', 'Break it before the big charge lands. Everyone. PLAN.'],
      ['lisa', 'And after this, tantanmen. That\'s a promise!'],
      ['sendo', 'Last stream of the arc. Let\'s make it the best one!'],
    ],
    end: [
      ['noah', 'We won! We actually won!'],
      ['hinano', 'Everyone did amazing. ...Don\'t look at me, I\'m not crying.'],
      ['lisa', 'Tantanmen! Ohoho!'],
    ],
  },
};

// Stages without a scene (Tower, events, Daily Stream, Raid) get a quick
// exchange from the squad's own voice lines.
function fieldLines(stage, part) {
  const f = FIELD[stage.id];
  if (f && f[part]) return f[part];
  return null;
}
