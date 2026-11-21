# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/leopad12121/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/leopad12121/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

The Lantern Archive — a top-down stealth game. You are a thief in a night archive: slip past four patrolling wardens, steal the three amber relics, and reach the EXIT without ever being seen. Guards sweep the halls with vision cones you can learn and time; shelves block their sight, dark floor hides you, and a suspicion meter gives you a chance to recover before the alarm sounds. Throw pebbles to lure a warden away, sneak when a cone swings toward you, and run only when you are sure the hall is clear. All art is drawn in code and all sound is synthesized with WebAudio — no files, no network.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. WASD or arrows to move, Shift to run, hold C to sneak, click the floor to throw a pebble, R to restart, M to mute.

## How it plays

- **Four wardens, four patrols.** Each warden walks a fixed loop and pauses to scan at every waypoint — learn the rhythm and slip through behind them.
- **A suspicion meter, not instant death.** Being seen fills the meter; break line of sight and it drains. Only a full meter raises the alarm, and even then you can cool it down by staying unseen for a few seconds.
- **Cover you can read.** Wooden shelves block sight and movement, shadowed floor halves how fast you are spotted, and every vision cone is drawn on the floor.
- **Tools and choices.** Three pebbles lure the nearest warden to investigate a noise; three optional relics trade risk for bonus points; running is faster but louder and far easier to spot.
- **Sound as a sense.** Footsteps tick softly, a warden's steps grow louder as it nears, the alarm wails, and pickups chime — all synthesized live with WebAudio.

---

<sub>Entered on [make.fun](https://make.fun/?ref=d5a50dzy&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
