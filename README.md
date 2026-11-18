# LIVE HEIST — Costa Vidrio

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/unuserv01-lab/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/unuserv01-lab/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game for make.fun's **Make GTA 6** bounty (gta6-01).
The whole city livestreams you: your wanted level *is* your viewer count.

## The game

Costa Vidrio is a sun-soaked coastal city where every heist is an episode
and every bystander is a camera. Steal cars, outrun Vidrio PD, and cut the
feed in a signal dead zone before the whole city watches you get busted.

- **On foot and by car** — walk the avenues, steal any civilian car with E, drive it away
- **Traffic and pedestrians** — 26 civilian cars cruise the grid, 42 pedestrians stroll the sidewalks; when your stars climb, citizens stop and film you (REC icons, phone flashes)
- **Wanted = viewer count** — crimes feed the broadcast; 1–2 stars bring PD cruisers, 3 stars bring the SKY 5 news helicopter, 4–5 stars bring roadblocks and SWAT
- **4 heist episodes** — The Marina Grab, Corner Store Smash, The Sponsor Run, and the Broadcast Heist finale, with sponsor rewards and followers as progression
- **Combat** — fists (F) up close, pistol (click to shoot, R to reload)
- **HUD** — LIVE badge, stars, viewer count, minimap, Vidrio PD response panel, mission objective, radio station, cash, health and armour, scrolling news ticker
- **Start and save** — start screen, pause, localStorage save (auto-saves on episode completion and every 30 seconds)
- **Sound** — fully synthesized WebAudio: engine hum, police sirens, a bassline, no audio files

## How to play

Serve `game/` with any static server and open `index.html`, or run:

```
npx serve game
```

Controls: **WASD** move / drive · **E** enter & steal a car · **F** punch ·
**Click** shoot · **R** reload · **1/2** switch weapon · **S** save ·
**M** mute · **Esc** pause.

## Screenshots

Four staged captures of the running game (`shots.json` holds the scene links):

1. `01-cover.jpg` — four-star chase on Avenida Sol: the Comet, three cruisers, the SKY 5 news heli, a roadblock and filming bystanders
2. `02-chase.jpg` — five stars at the Broadcast Heist finale: SWAT van, news heli, roadblock
3. `03-onfoot.jpg` — on foot outside Bodega Sol, citizens filming, episode objective live
4. `04-mission.jpg` — episode-complete card: Episode 1, The Marina Grab

## Run

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
