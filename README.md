[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/unuserv01-lab/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/unuserv01-lab/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Built for make.fun's gta6-01 bounty.

# LIVE HEIST — Costa Vidrio

An open-world crime game in the browser, played live on TV. You are the
Wheelman of Costa Vidrio, a sun-soaked coastal city where every heist is an
episode and every chase is a broadcast.

## The hook

The whole city watches you live. Your wanted level **is** the viewer count:
the louder the crime, the more stars, the more viewers, the more police.
At 3 stars the VIDRIO TV news helicopter hangs over you. At 4 stars
roadblocks go up and bystanders raise their phones to film you (look for
the REC bugs). At 5 stars SWAT rolls in. The only way to cool off fast is
to cut the broadcast — slip into an alley or a garage and the screen shows
**SIGNAL LOST** while your stars fall.

## Play

- **On foot and by car** — walk the sidewalks, steal any parked or civilian
  car (E), drive it, get out again (E).
- **Traffic and pedestrians** — civilian cars drive the road grid,
  pedestrians walk the sidewalks and film you when the heat is on.
- **Wanted stars + police** — cruisers chase, ram and try to bust you;
  roadblocks at 4 stars, SWAT at 5.
- **Missions** — two heist episodes with objectives, a marker and a payout:
  Episode 1 steals the Marina Vault loot; Episode 2 steals the pink Comet
  GT for VIDRIO TV. Rewards are cash and followers, plus a sponsor.
- **Combat** — a punch on foot (Space), a nitro pulse behind the wheel.
- **HUD** — minimap (red at 4 stars), stars, LIVE badge, viewer count,
  scrolling news ticker, objective, cash and followers.
- **Start and save** — title screen, pause, and progress saved in
  localStorage (cash, followers, best audience, episodes done).

## Controls

WASD / arrows — move and drive · E — enter / steal a car, get out ·
Space — punch on foot, nitro in a car · 1 / 2 — pick an episode ·
P — pause · M — mute.

## Run it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. No build step, no network requests, no assets outside `game/`.

```
python3 -m http.server 8080 --directory game
```

## Screenshots

`?shot=1..4` stages the four scenes deterministically (cover, 4-star chase,
on foot among filming bystanders, episode complete). See `shots.json`.

## License

MIT. See `LICENSE`.
