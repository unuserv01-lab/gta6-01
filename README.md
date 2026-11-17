[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/unuserv01-lab/gta6-01/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/unuserv01-lab/gta6-01/reward.svg)](https://make.fun/c/gta6-01)

# LIVE HEIST — Costa Vidrio

Game open-world crime 2D top-down yang berjalan 100% offline di browser desktop,
dibangun untuk kompetisi make.fun **"Make GTA 6" (gta6-01)**.

**Konsep:** seluruh kota Costa Vidrio menyiarkan aksimu secara LIVE. Wanted level
adalah *viewer count* — makin ribut aksimu, makin banyak penonton, makin keras
respons polisi. Bintang 1–2: mobil polisi mengejar. Bintang 3: helikopter berita
TV-7 menempel di atasmu. Bintang 4–5: roadblock, SWAT, dan warga ikut merekam
dengan HP mereka. Kabur ke garasi/gang = **"putus siaran"**, bintang turun.
Tiap heist adalah satu **episode** dengan reward sponsor + followers.

## Cara main

- **WASD / panah** — jalan kaki atau mengemudi
- **E** — curi mobil (dekati mobil sipil) / keluar mobil
- **SPACE** — pukul • **F** — tembak
- **Q** — lihat objective misi • **P / Esc** — jeda • **M** — suara
- **Enter** — mulai / lanjut

## Misi (2 episode)

1. **Episode 1 — Kasino Coral:** masuk ke Coral Casino, tahan di zona kuning
   sampai chip berlian didapat, lalu kabur ke garasi. Reward $2.500 + 5.000 followers.
2. **Episode 2 — Konvoi Berlian:** hentikan mobil konvoi di jalan ring, rebut
   muatannya, kabur ke garasi. Reward $6.000 + 12.000 followers (sponsor SURF & SOLE).

Progress tersimpan otomatis di localStorage (uang, followers, episode selesai).

## Yang ada di dalam game

- Kota Costa Vidrio: jalan kaki + mobil, traffic sipil + pejalan kaki (termasuk
  warga merekam saat bintang tinggi), pantai di timur, 3 garasi "putus siaran"
- Polisi mengejar + bintang wanted 1–5 + viewer count + helikopter berita
- HUD padat: minimap, bintang, badge LIVE, ticker berita, objective, uang, followers
- Combat sederhana, efek partikel + jejak ban + flash kamera, audio synth WebAudio
- Start screen, pause, layar "TERTANGKAP!", layar hasil episode

## Menjalankan

```sh
node serve.ts        # lalu buka http://localhost:8080
```

Tanpa build step, tanpa network request, tanpa library eksternal — vanilla JS +
canvas saja. Screenshot dibuat dari kode game sendiri via `?shot=cover|chase|walk|mission&seed=1`.

## Lisensi

MIT — lihat [LICENSE](LICENSE).
