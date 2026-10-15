# LevelUP Math Arena

Game matematika 2D multiplayer berbasis browser untuk sesi private dengan satu host/guru dan dua pemain dari jenjang berbeda.

## Game Flow

Satu room menjalankan empat game secara berurutan:

1. **Tug of War** — jawaban benar memberi power 1/2/3. Posisi tali memakai `Pbaru = Plama + powerA - powerB`, menang di ±10.
2. **Math Racing** — jawaban benar menggerakkan kendaraan menuju target 20 tile.
3. **Boss Battle** — kedua pemain bekerja sama mengurangi 200 HP boss; dua jawaban benar dalam ronde yang sama mendapat combo damage.
4. **Bomb Defuse** — cooperative final mission dengan correct contribution dan strike sebagai mekanik MVP.

Host membuat room 6 digit, dua pemain join tanpa login, lalu host mengontrol setiap ronde dan perpindahan game.

## Stack

- Next.js 16 + TypeScript
- Phaser 4 untuk arena Tug of War
- Supabase Postgres
- Supabase Realtime Broadcast + Presence
- Vercel-ready
- GitHub Actions untuk typecheck + production build

## Struktur penting

```text
app/
  host/                 host control + learning analytics
  join/                 join room
  play/[code]/          layar pemain
  api/rooms/            secure room/game APIs
src/
  components/           arena renderer
  core/game.ts          mekanik 4 game
  lib/                  Supabase + token + realtime helpers
supabase/
  migrations/           schema arena_*
  seed.sql              starter question bank kelas 4 dan 7
```

## Security model

Browser tidak membaca tabel game secara langsung. Tabel `arena_*` memakai RLS dan akses langsung `anon/authenticated` dicabut. Next.js server routes melakukan validasi room/player token, mengambil kunci jawaban dengan service-role, dan hanya mengirim payload soal yang sudah disanitasi ke pemain.

Jangan pernah mengekspos `SUPABASE_SERVICE_ROLE_KEY` sebagai `NEXT_PUBLIC_*`.

## Environment

Salin `.env.example` menjadi `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` hanya untuk server runtime.

## Database

Migration utama:

```text
supabase/migrations/001_math_arena.sql
supabase/migrations/002_index_math_arena_foreign_keys.sql
```

Starter bank soal tersedia di:

```text
supabase/seed.sql
```

Database yang sedang dipakai pada development adalah project Supabase `math-levelup`, tetapi semua tabel game memakai prefix `arena_` agar tidak berbenturan dengan tabel LevelUP yang sudah ada.

## Local development

```bash
npm install
npm run dev
```

Buka:

- `/host` pada perangkat guru
- `/join` pada perangkat pemain
- setelah join pemain diarahkan ke `/play/[room-code]`

## QA

```bash
npm run typecheck
npm run build
```

Workflow `.github/workflows/ci.yml` menjalankan kedua pemeriksaan tersebut otomatis di GitHub Actions.

## MVP analytics

Setelah sesi selesai, host dapat membuka hasil belajar per pemain yang berisi:

- accuracy
- benar / total soal
- average response time
- strongest topic
- needs practice
- statistik per topik

## Asset direction

Visual MVP sekarang memakai programmatic pixel-art/DOM visuals agar mechanics dapat diuji tanpa ketergantungan asset. Tahap visual berikutnya adalah mengganti karakter placeholder dengan sprite pixel-art konsisten dan atlas animasi untuk Phaser.
