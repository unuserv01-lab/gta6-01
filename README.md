# LIVE HEIST — Costa Vidrio

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/unuserv01-lab/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/unuserv01-lab/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
Built for make.fun's gta6-01 bounty.

An open-world crime game in the browser. The whole city of **Costa Vidrio**
is broadcasting you live: your wanted level **is** the viewer count.
The louder your crime, the more stars you earn, the bigger the audience —
and the harder the police, the news helicopter, the roadblocks and SWAT
come for you. Slip into an alley or the garage to cut the broadcast
("putus siaran") and the stars fall.

## How to play

Serve the game folder with any static server and open `game/index.html`
in a desktop browser. It plays 100% offline — no network request, no CDN.

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Run |
| E | Steal a car / exit the car (hold E to rob the shop) |
| Mouse click | Shoot toward the cursor |
| Space | Punch |
| M | Start the next heist episode |
| P / Esc | Pause |
| Enter | Start / continue |

## The game

- **Explore on foot and by car** — a sunny coastal city with avenues,
  streets, shops, parks, a beach and the sea. Steal any civilian car
  with E and drive it.
- **Traffic + pedestrians** — civilian cars drive the roads, pedestrians
  stroll the sidewalks. At 4+ stars, bystanders stop, raise their phones
  and record you (REC icon + camera flash).
- **Wanted = viewer count** — heat from stealing, punching, shooting and
  robbing raises the stars (1–5) and the LIVE viewer counter. Stars 1–2:
  patrol cars chase. Star 3: the TV-7 news helicopter sticks to you.
  Stars 4–5: roadblocks and a SWAT van. Hide in the garage or an alley
  to cut the broadcast and cool down.
- **Missions (episodes)** — Episode 1 "Paket Panas": steal a car and
  deliver the package to the gold DROP point. Episode 2 "Rampok Toko
  Sari": rob the shop, then escape to the garage. Rewards are sponsor
  cash + followers — that is the progression.
- **HUD** — LIVE badge, viewer count, wanted stars, cash + followers,
  minimap (player, police, heli, mission marker), mission objective,
  scrolling TV-7 news ticker, health bar.
- **Polish** — camera follows the player, drift smoke, crash sparks,
  camera flashes, WebAudio synth (siren, horn, gunshot, chimes, engine),
  title / pause / busted / season-complete screens, and a localStorage
  save (cash, followers, episodes).

## Screenshots

`?shot=1` cover (hero car on the sunny avenue, full HUD) •
`?shot=2` 4-star chase with the news heli, 3 patrol cars and a roadblock •
`?shot=3` on foot by TOKO SARI with recording bystanders •
`?shot=4` Season 1 complete — episode results.

All names, places, characters and art are original. Nothing is taken from
any commercial game.
