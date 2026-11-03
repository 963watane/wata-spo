// Everything the members say lives in this file: voice lines, off-stream
// talks and live-chat reactions. Written in-character for this fan game from
// each member's public persona (games they play, likes, running jokes); they
// are not real quotes. Swap in your oshi's real catchphrases here.

const VOICE = {
  // Newest member: says she's laid-back, everyone else says she's LOUD. League jungler, night owl.
  sendo: {
    lobby: [
      'Dohayou! ...What do you mean it\'s evening? It\'s morning somewhere!',
      'Everyone says I\'m loud. I am a calm and relaxed person. VERY calm!',
      'After 10 PM is off-hours. ...Okay, one more game. Off-hours start after this one.',
      'I\'m the newest one here, so every senpai is teaching me something. Mostly bad habits.',
      'Jungle tip: if you\'re lost, just take objectives. Same goes for life.',
      'Am I a high schooler? ...That\'s a secret. A really well-kept secret.',
    ],
    tap: ['Whoa! Hi!', 'Need a gank?', 'Hehe, what\'s up?', 'I\'m not loud! ...Was that loud?'],
    battleStart: ['Okay, I\'ll jungle! Follow me!', 'Objective time, let\'s go!'],
    ult: ['Here comes the sunset!', 'Everyone, full send!'],
    ko: ['I got caught out of position... sorry, senpai...'],
    victory: ['GG! Did you see that? DID YOU SEE IT?', 'We won! I knew the jungle would carry!'],
    levelUp: 'I leveled up! That\'s basically a power spike!',
    recruit: 'Dohayou! I\'m Sendo Yuuhi, the newest member! I\'ll be loud... I mean, I\'ll do my best!',
  },
  // Caring big-sister type, passionate and competitive, tsundere teasing. Apex shot-caller, great singer.
  hinano: {
    lobby: [
      'You\'re here again? ...Good. I wasn\'t waiting or anything.',
      'Callouts are simple. Say where, say how many, say it fast.',
      'You\'re annoying. ...But I like you. Don\'t make it weird.',
      'Ugh, I lost three games in a row. I\'m getting irritated. Water first.',
      'If you\'re tired, sleep. I mean it. I\'ll still be here tomorrow.',
      'Omurice and strawberries. That\'s the perfect day. No onions. Ever.',
    ],
    tap: ['What? ...Fine, I\'m listening.', 'Hey, that tickles!', 'You\'re so annoying. ...Heh.', 'Need a callout?'],
    battleStart: ['Stay behind me. I\'ve got this.', 'Positions! Let\'s play this clean.'],
    ult: ['Nobody touches my team!', 'Hold the line!'],
    ko: ['Mo-! I\'m down... play safe without me!'],
    victory: ['GG. Told you we\'d win.', 'Good job, everyone. Really. ...Don\'t tell anyone I said that.'],
    levelUp: 'Stronger. ...Thanks. I mean it.',
    recruit: 'Tachibana Hinano. Stay behind me and we won\'t lose. ...Got it?',
  },
  // Cheerful, laughs and cries easily, VERY competitive, acts first and thinks later. FPS pro.
  noah: {
    lobby: [
      'Konnoa~! Ready to win today? Because I am.',
      'My body says rest, but my brain says one more ranked. Brain wins!',
      'Losing is fine. Losing TWICE is not. Again!',
      'White rice is the best food. Rice with meat is the best-er food.',
      'I cried at a movie earlier. And laughed at the same time. It was a good movie!',
      'Thunder outside? Nope. Not looking. Headphones on.',
    ],
    tap: ['Ahaha! What is it?', 'Hm? Wanna duo?', 'Hehe~ that tickles!', 'Don\'t distract me, I\'m winning!'],
    battleStart: ['Leave the damage to me~', 'Okay! Let\'s get a highlight!'],
    ult: ['Lights out~!', 'Highlight clip incoming!'],
    ko: ['Nooo! I rushed in again, didn\'t I...'],
    victory: ['Ahaha! Easy~! ...Okay it wasn\'t easy, but we WON!', 'GG! Victory rice time!'],
    levelUp: 'Power up! Now nobody can beat me!',
    recruit: 'Konnoa~! Kurumi Noah! I don\'t lose. ...Okay, I lose sometimes, but then I win!',
  },
  // Pure and passionate, gets completely absorbed. Practice monster and illustrator. Loves cats and saunas.
  tsuna: {
    lobby: [
      'One more ranked game. Just one. ...Okay, maybe three.',
      'I drew everyone again today! The colors came out SO good.',
      'Sauna, then cold water, then games. That\'s the perfect routine.',
      'Cucumbers are not food. I will not be taking questions.',
      'I practiced aim for four hours and I don\'t even remember starting.',
      'Natsu-chan sat on my keyboard again. That\'s why I lost. Probably.',
    ],
    tap: ['Ehehe, hi!', 'Don\'t poke me! ...Okay, a little.', 'Ready to go?', 'Wanna see my drawing?'],
    battleStart: ['Let\'s gooo! Time to paint!', 'Ranked mode: ON!'],
    ult: ['Everything gets painted!', 'Full canvas, let\'s go!'],
    ko: ['Nooo, I was so cracked just now!'],
    victory: ['GG! ...Okay, it wasn\'t easy. But GG!', 'We won! Ahaha!'],
    levelUp: 'Level up! All that practice paid off!',
    recruit: 'Nekota Tsuna! I draw, I play, I practice a LOT. Let\'s win some games!',
  },
  // The straight man who reins everyone in. Shy with strangers, blunt with friends. Desk slams.
  uruha: {
    lobby: [
      'Um... hi. Don\'t stare too much, okay? I get nervous.',
      'Someone has to keep this team in line. ...It\'s always me.',
      'My room is not messy. It\'s... organized in a way only I understand.',
      'Seriously, why is everyone on this team so chaotic?!',
      'Gyoza and an energy drink. That\'s a balanced meal. Shut up.',
      'I slept twelve hours. It\'s a skill. Not everyone can do it.',
    ],
    tap: ['Eep! Don\'t sneak up on me!', 'W-what is it?', 'For real, what?', 'Hey! That\'s not funny!'],
    battleStart: ['Okay, okay. Focus. We can do this.', 'Everyone, please follow the plan this time!'],
    ult: ['Stay still for one second!', 'That\'s enough out of you!'],
    ko: ['Ugh... I TOLD you all to follow the plan...'],
    victory: ['We won! ...Was I too loud just now?', 'See? Teamwork works when we actually do it.'],
    levelUp: 'I got stronger. That\'s... honestly pretty great.',
    recruit: 'I-Ichinose Uruha. I\'ll keep things under control. Probably. Hopefully.',
  },
  // A refined lady (in her own words) who loves drawing, games and food. Serious, energetic, clumsy.
  lisa: {
    lobby: [
      'Good day! Have you eaten? I\'m asking for... research. Food research.',
      'I shall be very serious today. ...Is that fried chicken I smell?',
      'Tantanmen, pizza, fried potatoes. A lady has refined tastes.',
      'I need ten hours of sleep to be elegant. Today I got nine. Be gentle with me.',
      'Look at the stars tonight! The Pleiades are my favorite. Seven little sisters.',
      'I tripped on the way here. I\'m perfectly fine! The snacks are fine too!',
    ],
    tap: ['Oh my! Hello!', 'Is it snack time?', 'Kyah! You startled me!', 'Hm? Did you say dinner?'],
    battleStart: ['Let us do our best! ...And then let us eat!', 'I brought snacks for everyone!'],
    ult: ['Dinner is served!', 'Everyone, eat up!'],
    ko: ['I tripped... how very unladylike... sorry, everyone...'],
    victory: ['We won! Victory meal time!', 'Ohoho! A flawless and elegant victory!'],
    levelUp: 'I feel stronger! Like after a truly excellent lunch.',
    recruit: 'Hanabusa Lisa, at your service! I love drawing, games and food. Mostly food!',
  },
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const voice = (id, key) => {
  const v = VOICE[id] && VOICE[id][key];
  return Array.isArray(v) ? pick(v) : v || '';
};

// Off-stream talks: short scenes between members. Unlocked by owning
// everyone in the scene. First watch gives gems.
const TALKS = [
  { id: 'sunset-duo', scene: 'sendo-sunset', title: 'Sunset Duo', members: ['sendo', 'tsuna'], reward: 150, lines: [
    ['narrator', 'After stream. Sendo and Tsuna are still in voice chat.'],
    ['tsuna', 'Sendo. Sendo. One more game.'],
    ['sendo', 'You said that four games ago!'],
    ['tsuna', 'And I meant it every single time.'],
    ['sendo', 'It\'s past ten, Tsuna-senpai. That\'s off-hours. I\'m off the clock.'],
    ['tsuna', 'You\'re literally queuing right now.'],
    ['sendo', '...That\'s my hands. My hands are not off the clock.'],
    ['tsuna', 'THIS is why you\'re my favorite duo.'],
  ] },
  { id: 'study-break', scene: 'hinano-captain', title: 'Study Break', members: ['hinano', 'noah'], reward: 150, lines: [
    ['narrator', 'Hinano is reviewing a scrim in a quiet café. Noah slides into the seat across from her.'],
    ['noah', 'Hinano~ whatcha watching?'],
    ['hinano', 'Last night\'s scrim. Where we lost the last fight.'],
    ['noah', 'Oh! That was me. I went in.'],
    ['hinano', 'I know. I watched you go in. Alone. Into three people.'],
    ['noah', 'My body said no, but my brain said GO.'],
    ['hinano', 'Your brain is the problem. ...But the clip was kind of cool.'],
    ['noah', 'Ahaha! Two strawberry lattes on me, then. As an apology!'],
  ] },
  { id: 'three-am', scene: 'noah-goose', title: 'Ranked at 3 AM', members: ['tsuna', 'noah'], reward: 150, lines: [
    ['narrator', '3 AM. Two streams are still live.'],
    ['tsuna', 'Kurumi-senpai, you\'re still up?!'],
    ['noah', 'I lost my last game. I can\'t sleep on a loss!'],
    ['tsuna', 'That was two hours ago.'],
    ['noah', 'And I\'ve lost five more since! It\'s a whole thing now!'],
    ['tsuna', 'Okay. Okay. I\'ll duo with you. Just until we win one.'],
    ['noah', 'You\'re the best! ...Wait, you\'re also still up. Why?'],
    ['tsuna', 'I started drawing at nine and looked up and it was three.'],
  ] },
  { id: 'shot-caller', scene: 'sendo-class', title: 'Shot Caller', members: ['hinano', 'sendo'], reward: 150, lines: [
    ['narrator', 'Practice match. Hinano is teaching Sendo how to make callouts.'],
    ['hinano', 'Okay. Enemy on the roof. What do you say?'],
    ['sendo', 'THERE\'S A GUY ON THE ROOF AND HE LOOKS SO MEAN!!'],
    ['hinano', 'Too loud. My ears are ringing.'],
    ['sendo', 'Sorry! I\'m calm! I\'m a very calm person!'],
    ['hinano', '..."One on roof, low." Short and clear.'],
    ['sendo', 'One on roof, low! ...Like that?'],
    ['hinano', 'Perfect. You\'re annoying, but you learn fast. ...I like that.'],
  ] },
  { id: 'cafe-practice', scene: 'tsuna-sleepy', title: 'Café Practice', members: ['tsuna', 'hinano'], reward: 150, lines: [
    ['narrator', 'Tsuna, in full maid outfit, is practicing for a café collab.'],
    ['tsuna', 'W-welcome home, master...'],
    ['hinano', 'Louder. You sound like you\'re being held hostage.'],
    ['tsuna', 'WELCOME HOME, MASTER!'],
    ['hinano', 'Too loud. Now you sound like you\'re the hostage taker.'],
    ['tsuna', 'There\'s no winning with you!'],
    ['hinano', 'There is. You just have to find the middle.'],
    ['tsuna', '...Welcome home~'],
    ['hinano', 'Perfect. Chat would lose it.'],
  ] },
  { id: 'straight-man', scene: 'uruha-window', title: 'The Straight Man', members: ['uruha', 'tsuna'], reward: 150, lines: [
    ['narrator', 'A quiet afternoon. Uruha is practising her aim. Tsuna is "helping".'],
    ['tsuna', 'Okay, okay, now try it with your eyes closed!'],
    ['uruha', 'Why would I ever do that?!'],
    ['tsuna', 'For content!'],
    ['uruha', '...Is every team I join going to be this chaotic?'],
    ['tsuna', 'Yep! Welcome!'],
    ['uruha', 'Fine. But if we\'re doing a collab, we\'re following a PLAN.'],
    ['tsuna', 'She slammed the desk. Chat, she slammed the desk. Clip it.'],
    ['uruha', 'I did NOT slam the... okay, I slammed it a little.'],
  ] },
  { id: 'food-review', scene: 'lisa-tea', title: 'Food Review Stream', members: ['lisa', 'noah'], reward: 150, lines: [
    ['narrator', 'A table covered in food. Two streamers. Zero self-control.'],
    ['lisa', 'Good evening! Tonight we review every bento in the convenience store. Seriously and elegantly.'],
    ['noah', 'I\'m only here for the rice. The rice decides the score.'],
    ['lisa', 'That\'s not how reviews work! ...This karaage is incredible.'],
    ['noah', 'Rice: perfect. Ten out of ten. Next!'],
    ['lisa', 'You can\'t give every bento ten! ...This one is also ten.'],
    ['noah', 'You know, I\'m the one who told Lisa to audition. Best decision ever.'],
    ['lisa', 'You\'re my benefactor! Here, have my last piece of karaage. ...Half of it.'],
    ['chat', 'this is just a mukbang / professional reviewers lmao / i\'m hungry now'],
  ] },
  { id: 'collab-meeting', scene: 'noah-goose', title: 'Collab Meeting', members: ['sendo', 'hinano', 'noah', 'tsuna'], reward: 300, lines: [
    ['narrator', 'All four members join a call to plan a big collab stream.'],
    ['sendo', 'Okay! Ideas for the collab stream. GO!'],
    ['hinano', 'You don\'t have to shout, we\'re all in the call.'],
    ['tsuna', 'Custom match. Everyone versus me. I win.'],
    ['noah', 'Everyone versus me and I win FASTER.'],
    ['hinano', 'Fall Guys. Team mode. ...I want a crown. Just once.'],
    ['sendo', 'Hinano-senpai still hasn\'t won a crown on stream?'],
    ['hinano', 'Don\'t say it like that! ...Fine, it\'s decided. Fall Guys. And I\'m winning.'],
    ['noah', 'Collab stream: decided~'],
  ] },
];

// Live-chat reactions shown during battles.
const CHAT = {
  names: ['spo_fan', 'apex_enjoyer', 'ladybug_01', 'tsunatomo', 'hinanaa', '963fam', 'potaku', 'hanataba', 'clip_it', 'fps_dad', 'lurker99', 'ping_120'],
  start: ['first!', 'waku waku', 'hi hi!', 'LETS GO', 'just got here', 'raid incoming'],
  crit: ['CLUTCH', 'crit!!', 'HUGE', 'nice aim', 'what a hit'],
  ult: ['ULT LETS GOOO', 'clip it!!', 'POG', 'INSANE', 'highlight reel'],
  hurt: ['ouch', 'careful!', 'heal pls', 'that hurt me too'],
  ko: ['F', 'F', 'nooo', 'RIP', 'she\'ll be back'],
  kill: ['GG', 'ez', 'gone', 'one down', 'deleted'],
  boss: ['boss time', 'it\'s huge', 'we got this', 'shields up!!'],
  collab: ['COLLAB!!', 'the whole team!!', 'best stream ever', '8888888'],
  win: ['GG!!', 'GGGG', 'otsu!', 'clip that ending', 'W stream'],
  lose: ['gg go next', 'unlucky', 'we go again', 'level up and retry!'],
  idle: ['lol', '8888', 'hype', 'w', 'nice', 'wwww', 'cute'],
};
