// All documentation content. `body` is a mini-markdown dialect rendered by
// docs.js: ## h2, ### h3, - lists, | tables, ``` code fences, `inline`, **bold**.

const DOCS = {
  groups: [
    {
      title: 'Get Started',
      pages: ['overview', 'installation', 'architecture', 'database'],
    },
    {
      title: 'Core',
      pages: ['spz-core', 'spz-identity', 'spz-appearance', 'spz-spawn'],
    },
    {
      title: 'Racing',
      pages: ['spz-races', 'spz-poll', 'spz-raceUI', 'spz-leaderboard', 'spz-progression', 'spz-speedcam', 'spz-raceline'],
    },
    {
      title: 'Vehicles & Physics',
      pages: ['spz-vehicles', 'spz-physics', 'spz-carspawner', 'spz-speedometer', 'spz-nos', 'spz-vehfunc'],
    },
    {
      title: 'Interface',
      pages: ['spz-nametag', 'spz-loading', 'spz-ui'],
    },
    {
      title: 'Platform',
      pages: ['spz-rpc', 'spz-fpscap', 'spz-log', 'spz-txrecipe'],
    },
    {
      title: 'Reference',
      pages: ['dependencies'],
    },
  ],

  pages: {

    /* ══ GET STARTED ═══════════════════════════════════════ */

    'overview': {
      title: 'What is SPiceZ-Core?',
      tagline: 'A modular, open-source, racing-only framework for FiveM.',
      badges: ['GPL v3', 'Lua 5.4', 'FiveM'],
      body: `
SPiceZ-Core (\`spz-*\`) is a FiveM framework built from the ground up for **competitive street racing**. It is not an RP framework with races bolted on — racing is the entire scope.

## Design principles

- **No bloat** — racing only. No jobs, housing, or crime systems.
- **Module-first** — every feature is a standalone resource with its own repository. Enable, disable, or replace any of them.
- **Event-driven** — modules communicate exclusively through events and exports; none reach into another's internals.
- **Config-driven** — every tunable lives in a \`config.lua\`.
- **Server-authoritative** — lap times, sector times, positions, results, and records are measured and decided on the server. Clients never decide race outcomes.

## The stack

| Layer | Technology |
| --- | --- |
| Runtime | FiveM / Cfx server |
| Language | Lua 5.4 |
| Database | MySQL / MariaDB via oxmysql |
| Shared library | ox_lib |
| NUI | Preact + Vite + TypeScript |
| Isolation | FiveM routing buckets |

## Developer

SPiceZ-Core is developed and owned by **SPiceZ21** — [github.com/SPiceZ21](https://github.com/SPiceZ21). All repositories are licensed under GPL v3.
`,
    },

    'installation': {
      title: 'Installation',
      tagline: 'One recipe URL in txAdmin. Everything else is automatic.',
      badges: ['txAdmin', 'Recipe v3'],
      body: `
## txAdmin recipe (recommended)

- Open your **txAdmin** dashboard → Server Setup → **Remote URL Template**.
- Paste the recipe URL:

\`\`\`
https://raw.githubusercontent.com/SPiceZ21/spz-txrecipe/main/spz-recipe.yaml
\`\`\`

- Follow the wizard — server name, license key, database connection.
- The recipe downloads every dependency (\`oxmysql\`, \`ox_lib\`, \`fivem-appearance\`, \`pma-voice\`) and every \`spz-*\` module, then writes a production-ready \`server.cfg\`.

**There are no SQL files to import.** The database schema is owned by spz-core and applies itself on first boot — see [Database](#/database).

## Requirements

| Requirement | Notes |
| --- | --- |
| Server artifact | Build 27926 or higher |
| MySQL / MariaDB | Any running instance (XAMPP works locally) |
| FiveM license key | keymaster.fivem.net |

## Manual install

Ensure order matters. The full order is maintained in the recipe's \`server.cfg\`; the short version:

\`\`\`cfg
# Dependencies
ensure oxmysql
ensure ox_lib
ensure fivem-appearance
ensure pma-voice

# Core (order matters)
ensure spz-rpc
ensure spz-loading
ensure spz-core
ensure spz-identity
ensure spz-appearance
ensure spz-spawn

# Racing modules
ensure spz-speedcam
ensure spz-vehicles
ensure spz-races
ensure spz-progression
ensure spz-nametag
ensure spz-poll
ensure spz-raceUI
ensure spz-leaderboard
ensure spz-carspawner
ensure spz-physics
ensure spz-fpscap
ensure spz-raceline
ensure spz-speedometer
ensure spz-nos
ensure spz-vehfunc

ensure vMenu
\`\`\`
`,
    },

    'architecture': {
      title: 'Architecture',
      tagline: 'Small modules, strict boundaries, one authoritative server.',
      badges: ['Statebags', 'Routing buckets'],
      body: `
## Module boundaries

Every module is a separate FiveM resource with its own git repository. Cross-module communication happens only through:

- **Events** — e.g. spz-races fires \`spz-raceline:lapCompleted\` with the server-measured lap time; spz-raceline decides whether to store the driven line.
- **Exports** — e.g. \`exports["spz-identity"]:GetProfile(source)\`.
- **Statebags** — identity publishes \`nation\`, \`raceNumber\`, \`rank\` etc. on player state; nametag and raceUI read them without ever calling identity.

## Server authority

The race engine (spz-races) runs a statebag-driven state machine: \`IDLE → WAITING → WARMUP → COUNTDOWN → LIVE → ENDED → CLEANUP\`. All timing — laps, sectors, finish order, records — is measured with server clocks. Clients report checkpoint hits; the server validates order and does the math. \`sv_stateBagStrictMode\` is enabled: clients cannot write replicated state.

## World isolation

Each race runs in its own **routing bucket** — racers can't be interfered with by freeroam traffic. Time trials get a private bucket per player. Cleanup returns everyone to bucket 0.

## Race lifecycle timing

| Phase | Default |
| --- | --- |
| Join window (armed by first E press) | 30s |
| Track vote poll | 30s |
| Warmup free-drive | 60s |
| Grid settle + countdown | 3s + 3-2-1 |
| Finish window after first finisher | 180s |
| Results screen | 12s |
| Intermission (overlapped with results) | 30s |
`,
    },

    'database': {
      title: 'Database & Migrations',
      tagline: 'One schema owner. Zero manual SQL.',
      badges: ['spz-core', 'oxmysql'],
      body: `
The entire schema is owned by **spz-core**. Every file in \`spz-core/migrations/\` is applied once, in order, on server boot, and recorded in the \`spz_migrations\` ledger table — restarts and upgrades are no-ops. No other resource creates or alters tables.

\`SPZ:coreReady\` does not fire until migrations complete, so no module ever queries a half-built database. Modules that need an explicit gate can call \`exports["spz-core"]:WaitForMigrations()\`.

## Adding schema

Add a new numbered file to \`spz-core/migrations/\` and list it in \`server/migrations.lua\`. **Never edit a migration that has shipped.**

## Tables

| Table | Owner | Purpose |
| --- | --- | --- |
| players | spz-identity | Profiles, stats, ranks, nation, race number |
| crews | spz-identity | Crew groups, tags, crew outfits |
| driver_licenses | spz-progression | License unlock history |
| vehicle_customizations | spz-vehicles | Saved per-vehicle cosmetic setups |
| race_sessions | spz-races | Per-race metadata |
| race_results | spz-races | Per-player results, lap times, SR/iRating changes |
| track_records | spz-races | Personal bests per track and class |
| track_sectors | spz-races | Best sector times per player/track/class |
| racelines | spz-raceline | Best-lap driving lines |
| speedcam_bests | spz-speedcam | Speed camera records |
| economy_transactions | spz-core | Credits ledger |
| player_outfits | spz-appearance | Saved outfits |
| player_badges | spz-progression | Seasonal badges |
`,
    },

    /* ══ CORE ══════════════════════════════════════════════ */

    'spz-core': {
      title: 'spz-core',
      tagline: 'Framework bootstrap — sessions, state machine, routing buckets, migrations.',
      badges: ['v2.0', 'Server + Client', 'Required'],
      body: `
The foundation every other module depends on. Boots the framework in a strict order: config → database ping → **migrations** → player sessions → state systems → \`SPZ:coreReady\`.

## Responsibilities

- **Database migrations** — single schema owner (see [Database](#/database)).
- **Player sessions** — creation on connect, cleanup on drop, session cache.
- **Routing bucket manager** — allocation and teardown of isolated race worlds.
- **Event bus** — shared event name constants and emitter helpers.
- **Permissions & middleware** — ACE-backed permission checks for admin actions.
- **Client environment** — personal (client-side only) time and weather.

## Commands

| Command | Description |
| --- | --- |
| /weather | Personal weather picker (ox_lib dropdown, client-side only) |
| /time | Personal time — presets (morning/evening/night) or exact H M |

## Key exports

| Export | Side | Purpose |
| --- | --- | --- |
| CreateSession(src, name, identifier) | server | Register a player session |
| AssignPlayerToBucket(src, bucket) | server | Move player between worlds |
| DeleteBucket(id) | server | Tear down a race bucket |
| WaitForMigrations(timeoutMs) | server | Block until schema is ready |
`,
    },

    'spz-identity': {
      title: 'spz-identity',
      tagline: 'Player profiles, licenses, crews, nation & race number.',
      badges: ['Server-heavy', 'oxmysql'],
      body: `
Owns the \`players\` table at runtime: profile load on connect, in-memory cache with dirty-flag batch saves, and the character creation flow.

## Character creation

First-time players go through: **creation form** (alias, model base, nation, race number) → **fivem-appearance** dress-up → spawn menu. Validation is fully server-side:

- Alias: 3–16 chars, alphanumeric + underscore, unique.
- Nation: ISO 3166-1 alpha-2 — drives the flag on nametags and standings.
- Race number: **1–99, unique across all racers** (F1 rules). Taken numbers are rejected with a clear error.

## Statebags published

\`username\`, \`gender\`, \`rank\`, \`sr\`, \`iRating\`, \`crewId\`, \`crewTag\`, \`licenseTier\`, \`nation\`, \`raceNumber\`, \`avatarUrl\`, \`identityReady\` — consumers read state, they never query identity directly.

## Key exports

| Export | Purpose |
| --- | --- |
| GetProfile(source) | Full cached profile (id, stats, crew, …) |
| UpdateProfile(source, key, value) | Mutate + mark dirty for batch save |
| GetUsername(source) | Display name |
| IsFirstTime(source) | Needs character creation? |

## Crews

Crew create/join/leave with unique tags, owner transfer, and a crew-change cooldown. Crew tag renders on nametags and in race standings.
`,
    },

    'spz-appearance': {
      title: 'spz-appearance',
      tagline: 'Outfit persistence and crew uniforms on top of fivem-appearance.',
      badges: ['fivem-appearance', 'oxmysql'],
      body: `
Thin persistence layer over the standalone **fivem-appearance** character editor. No framework requirement — that's why fivem-appearance replaced illenium-appearance in the stack.

## Behaviour

- Saves each player's outfit to \`player_outfits\` (JSON) and re-applies it on spawn.
- **Crew uniforms**: a crew can define a shared outfit (\`crews.crew_outfit\`); members wear it automatically, with priority crew outfit → personal outfit → whatever is worn.
- Re-applies reactively when the player's crew changes (statebag change handler).
- Uses \`setPedAppearance\` when the model is unchanged, so re-applying never re-swaps the ped model (which would break player control).

## Key exports

| Export | Side | Purpose |
| --- | --- | --- |
| GetOutfitForPlayer(source) | server | Resolved outfit + source ("crew"/"personal") |
`,
    },

    'spz-spawn': {
      title: 'spz-spawn',
      tagline: 'Spawn menu, idle animation, cinematic camera, character creation UI.',
      badges: ['NUI', 'Preact'],
      body: `
The front door of the server. Hosts the character-creation form for first-time players and the deployment-zone spawn menu for everyone else.

## Features

- **Cinematic spawn scene** — fixed preview location, idle animation, slow orbiting camera, evening light.
- **Spawn carousel** — pick a deployment zone with arrow keys / on-screen nav, Enter to spawn.
- **Character creation** — racer alias, model base, **nation picker with live flag preview**, and race number (1–99). Server errors (taken name/number) render inline without losing input.
- Player card with avatar, crew tag, license class, and playtime from statebags.

## Flow

\`\`\`
connect → identity loads profile
  first time?  → creation form → fivem-appearance dress-up → spawn menu
  returning?   → spawn menu → deploy
\`\`\`
`,
    },

    /* ══ RACING ════════════════════════════════════════════ */

    'spz-races': {
      title: 'spz-races',
      tagline: 'The race engine — queue, poll, warmup, countdown, checkpoints, timing, time trials.',
      badges: ['v1.9', 'Server-authoritative', '56 tracks'],
      body: `
The heart of the framework. Runs the full race lifecycle as a statebag-driven state machine with all timing measured server-side.

## Race flow

- **Queue** — press **E** at the lobby to join (and E again to leave). The first joiner arms a 30s join window; no minimum player count. Players who press E mid-race are enrolled into the next cycle automatically.
- **Poll** — 30s track vote (via spz-poll), weighted track selection.
- **World setup** — isolated routing bucket, grid spawn with ped pre-teleport (multiplayer-safe), spawn grace during warmup for slow loaders.
- **Warmup** — 60s free-drive to scout the track or tune the car.
- **Countdown** — TP back to grid frozen (freeze-before-TP kills jump starts), 3s silent settle, 3-2-1-GO.
- **Live** — checkpoint validation, per-lap timing, **3-way sector timing**, live positions, idle-kick watchdog.
- **Finish window** — the first finisher arms a 180s countdown; stragglers are warned at 60/30/10s and then DNF'd so the podium never waits.
- **Mid-race reconnect** — a crash or timeout during a live race holds the grid slot for 60s; rejoining restores lap, checkpoint and race clock at the last crossed checkpoint. The window expiring falls through to a normal disconnect DNF.
- **Incidents** — hard world impacts (sudden speed loss + body damage together) are detected client-side, validated server-side, shown on the post-race card, and feed the SR penalty and clean-race bonus.
- **Results → intermission** — results screen (12s) overlapped with the 30s intermission countdown; next join window arms instantly.

## Sectors

Every track splits into 3 sectors by checkpoint count (derived, works for all tracks). Sector colours: **purple** = session best, **green** = personal best, **yellow** = slower. Bests persist per track/class in \`track_sectors\`.

## Checkpoints

Custom streamed gate props (start / finish / checkpoint arches) placed at the track's left/right gate positions. The next checkpoint renders as a 3D-projected pill in the race UI with live distance.

## Time trials

\`/timetrail\` opens an ox_lib track picker. Solo bucket, ghost-free hotlapping with lap/sector timing, sprint and circuit support, \`/quittt\` to exit. Sector PBs store under a separate TT class so any-car TT times never pollute class-scoped race bests.

## Commands

| Command | Description |
| --- | --- |
| /joinrace, /leaverace | Queue without the E prompt |
| /timetrail | Time-trial track picker |
| /quittt | Leave the current time trial |

## Key events (for module authors)

| Event | Fired when |
| --- | --- |
| spz-raceline:lapCompleted | Any race/TT lap completes (server, with lap ms) |
| SPZ:sectorComplete | A sector closes (client, with time + colour) |
| SPZ:raceEnd | Results broadcast to racers |
`,
    },

    'spz-poll': {
      title: 'spz-poll',
      tagline: 'Track vote between race cycles.',
      badges: ['NUI', 'Preact'],
      body: `
Renders the track vote that runs after the join window closes. Weighted random track options, live vote counts, automatic resolution on timeout — ties resolved by weight.

## Behaviour

- Poll opens for \`Config.PollDuration\` (default 30s) with candidate tracks from the race engine.
- Players click to vote; votes tally server-side in spz-races.
- Result feeds directly into world setup — no extra confirmation step.
`,
    },

    'spz-raceUI': {
      title: 'spz-raceUI',
      tagline: 'Race overlay — telemetry, standings, sectors, 3D checkpoint pill, post-race.',
      badges: ['NUI', 'Preact + Vite'],
      body: `
Every in-race surface, exposed as exports that spz-races drives through a thin NUI bridge.

## Components

- **Telemetry HUD** — lap/CP counters, per-lap timer + total race time (single client-owned clock, no drift), position chip, checkpoint progress bar, PB/record tags.
- **Sector strip** — S1/S2/S3 with purple/green/yellow colouring, resets each lap.
- **Standings list** — up to 6 racers: position, **nation flag, race number**, name, live gap. You swap into the last slot if outside the top 6. Toggle with **Z**.
- **3D checkpoint pill** — GPU-composited billboard projected onto the next checkpoint with live distance; grows urgent as you close in.
- **Countdown & warmup panels** — staging info, warmup tiles with track/class/grid.
- **Lobby pill** — E-to-join prompt, queue position, intermission countdown.
- **Post-race toast** — non-blocking results card (podium, time, best lap, SR/XP deltas). You keep driving; Backspace dismisses.

## Exports

| Export | Purpose |
| --- | --- |
| ShowCountdown(data) | Staging + 3-2-1 |
| UpdateRaceOverlay(data) | Positions / lap / CP merge |
| UpdateSector(data) / ResetSectors() | Sector strip |
| UpdateCPWaypoint(data) | 3D pill screen position |
| ShowPostRaceStats(data) | Results toast |
| UpdateLobby(data) | Join/queue/intermission pill |
`,
    },

    'spz-leaderboard': {
      title: 'spz-leaderboard',
      tagline: 'Standings, classes, records and activity in a tablet view.',
      badges: ['NUI', 'ox_lib'],
      body: `
Tablet-style leaderboard UI backed by the leaderboard engine inside spz-races (records, standings, stats — with query caching).

## Data sources

| Callback | Returns |
| --- | --- |
| Track records | Top N per track + class, formatted times |
| Standings | Global points / iRating ordering |
| Player stats | Personal bests, race history |

Records live in \`track_records\` (races) and \`track_sectors\`; speed-camera bests come from spz-speedcam.
`,
    },

    'spz-progression': {
      title: 'spz-progression',
      tagline: 'XP, ranks, safety rating, iRating, license promotion.',
      badges: ['Server', 'Seasons'],
      body: `
Sim-racing-style progression driven by race results.

## Systems

- **XP & levels** — points from finishing position convert to XP; levels feed rank display. A clean race (zero incidents) adds a bonus.
- **Ranks** — D-5 up through S-1; rank shows on nametag plate and license class gates car classes.
- **Safety Rating (SR)** — clean racing raises it, incidents and DNFs lower it; daily gain/loss caps prevent farming. Incidents are hard world impacts detected client-side (speed drop + body damage together) and server-validated — see spz-races.
- **iRating** — Elo-style skill rating adjusted by finishing position vs. field strength.
- **License promotion** — thresholds unlock higher license tiers, gating faster vehicle classes.
- **Seasons** — periodic reset + archive, seasonal badges into \`player_badges\`.
- **Login streaks** and per-track anti-grind (same-track diminishing returns).
`,
    },

    'spz-speedcam': {
      title: 'spz-speedcam',
      tagline: 'Speed camera network with personal bests and global records.',
      badges: ['26 cameras', 'oxmysql'],
      body: `
Fixed camera positions across the map flash you and record your speed.

## Behaviour

- Client detects camera pass + speed; server validates (0–600 km/h sanity) and checks records.
- **Personal best** per camera per player, upserted only on improvement.
- **Global record** per camera — beating it broadcasts to the whole server.
- Compact HUD above the minimap, sized to match, with a browser-preview mode for design work.

## Exports

| Export | Purpose |
| --- | --- |
| GetCameraRecords(camId, limit) | Top speeds for one camera |
| GetTopSpeed(camId) | Current global record |
`,
    },

    'spz-raceline': {
      title: 'spz-raceline',
      tagline: 'Auto-recorded racing lines painted on the road.',
      badges: ['v0.3', 'Standalone-ish'],
      body: `
A racing-line trainer. Every race and time-trial lap is captured silently; when a lap **beats your stored best for that track**, the driven line is saved and painted on the road as a flat ribbon — **green** on throttle, **red** on brakes, faint white coasting.

## How it works

- Distance-gated sampling (2m) of position + pedal state. Brake wins over throttle, so trail-braking reads as braking.
- Lap times come from spz-races (server-measured); the client submits **points only** against a server-issued token — a client can never fake a record.
- Circuit lines capture through the final-checkpoint → start-line stretch and close into a **continuous loop**, with any residual seam bridged at display time.
- **Auto-detect**: come within 150m of a track where you have a stored line and it loads and displays automatically; leaves when you do.
- In a time trial your stored best shows as a ghost line; beating it swaps the ghost instantly.
- **Ghost car** — the best lap also replays as a translucent car (your own vehicle model, brake lights where you braked), launching in sync with each lap start. Lines carry per-point timing, so the ghost's pace through every corner is your real pace.
- Two-stage rendering (slow visible-set builder + per-frame painter) keeps the draw cost flat.

## Commands

| Command | Description |
| --- | --- |
| /raceline show | Show the line |
| /raceline hide | Hide the line |
| /raceline ghost | Toggle the time-trial ghost car |

Storage: \`racelines\` table — one row per player per track, flat JSON point array, first point doubles as the proximity anchor.
`,
    },

    /* ══ VEHICLES ══════════════════════════════════════════ */

    'spz-vehicles': {
      title: 'spz-vehicles',
      tagline: 'Vehicle registry, class system, race spawning, customization persistence.',
      badges: ['Registry', 'oxmysql'],
      body: `
Owns everything about cars: the class-tiered vehicle registry, race grid spawning, and saved cosmetic setups.

## Systems

- **Registry** — vehicles organised into classes (D → S); license tier gates what you can drive.
- **Race spawning** — grid placement with per-player spawn confirmation, retries for slow clients, and locked vehicles until GO.
- **Customization persistence** — liveries and cosmetic mods save per player per model into \`vehicle_customizations\` and re-apply on spawn.
- **Race prep** — assists profile (TCS/ABS/ESC/launch), fuel/damage reset on grid.

## Key exports

| Export | Side | Purpose |
| --- | --- | --- |
| SpawnRaceVehicle(src, model, grid) | server | Grid spawn with confirmation |
| DespawnVehicle(src) | server | Clean removal |
| UnlockRaceVehicle(src) | server | Release at GO |
`,
    },

    'spz-physics': {
      title: 'spz-physics',
      tagline: 'CHASER-style powertrain simulation.',
      badges: ['v0.4', 'Standalone'],
      body: `
Replaces GTA's arcade throttle response with a simulated powertrain, fully standalone — usable on any server.

## Simulation

- **Torque curves** per engine profile — power delivery depends on RPM, not a flat multiplier.
- **Gear ratios + final drive** — real shift points; Shift/Ctrl for manual up/down.
- **Clutch simulation** — engagement on launch and shifts.
- **Rev limiter** and **engine braking**.
- **PP (Performance Points) rating** — a single comparable number per car computed from the sim parameters.
- Per-vehicle profiles in \`data/profiles.lua\`; sensible defaults for unprofiled cars.

## HUD

Optional minimal RPM/gear readout (the main speedometer integration lives in spz-speedometer).
`,
    },

    'spz-carspawner': {
      title: 'spz-carspawner',
      tagline: 'ox_lib vehicle spawn menu.',
      badges: ['ox_lib', 'Class-gated'],
      body: `
Freeroam car spawner as a clean ox_lib context menu — no custom NUI to maintain.

## Behaviour

- Classes → vehicles, gated by your license tier (locked classes shown but disabled).
- Server-side spawn authority and validation; previous personal vehicle is replaced.
- Fixed-position preview when browsing from the spawn area.
`,
    },

    'spz-speedometer': {
      title: 'spz-speedometer',
      tagline: 'Racing speedometer with spz-physics integration.',
      badges: ['NUI', 'Preact'],
      body: `
Minimal racing speedo: speed, RPM bar, gear indicator. Reads live powertrain state from spz-physics when present (real RPM/gear from the sim), falls back to native values without it.
`,
    },

    'spz-nos': {
      title: 'spz-nos',
      tagline: 'Nitrous system.',
      badges: ['Client + Server'],
      body: `
Chargeable nitrous with visual effects and server-side state sync / anti-cheat validation. Charge management client-side, activation validated server-side.
`,
    },

    'spz-vehfunc': {
      title: 'spz-vehfunc',
      tagline: 'Indicators, hazards, headlight flash.',
      badges: ['Client', 'Keybinds'],
      body: `
Quality-of-life vehicle controls with smooth, real-car-style light transitions:

- Left / right indicators with self-cancel.
- Hazard lights.
- Headlight flash.

All on rebindable keys (FiveM key mapping — Settings → Key Bindings).
`,
    },

    /* ══ INTERFACE ═════════════════════════════════════════ */

    'spz-nametag': {
      title: 'spz-nametag',
      tagline: 'Minimal 3D nameplates with rank, crew, flag and race number.',
      badges: ['NUI', 'Statebag-driven'],
      body: `
Clean floating nameplates: a solid rank plate (colour-coded by license class) plus a floating name row — **nation flag**, crew tag box, name, and an italic **race number chip** (F1 number-plate style). A speaking equalizer appears on the plate with pma-voice activity.

## Design notes

- Pure statebag reads (\`spz:name\`, \`spz:crew\`, \`spz:nation\`, \`spz:raceNumber\`, …) — zero server round-trips per frame.
- GPU-composited transforms (no layout thrash), distance scaling and fade.
- Flags ship as local 48px WebP assets — no external CDN at runtime.
- Toggle with a rebindable key.
`,
    },

    'spz-loading': {
      title: 'spz-loading',
      tagline: 'Minimal loading screen with local video and audio.',
      badges: ['loadscreen', 'Preact'],
      body: `
Registered as a FiveM \`loadscreen\`. Plays bundled local video + audio (no YouTube dependency), logo-only branding, segmented progress bar, and a volume control. Assets live in the resource's \`public/\` folder — swap the video/logo to rebrand.
`,
    },

    'spz-ui': {
      title: 'spz-ui',
      tagline: 'Shared UI component library (build-time).',
      badges: ['Preact', 'Design system'],
      body: `
The design system behind every SPiceZ NUI: shared Preact components (cards, badges, buttons, modals, tables, toasts, progress bars…) and the token stylesheet (colours, fonts, spacing).

**Build-time only** — the pipeline copies \`src/components/\` and \`src/styles/\` into each consuming resource before its Vite build. It is not ensured on the server and ships no runtime code.
`,
    },

    /* ══ PLATFORM ══════════════════════════════════════════ */

    'spz-rpc': {
      title: 'spz-rpc',
      tagline: 'Discord Rich Presence.',
      badges: ['Client + Server'],
      body: `
Live Discord presence: current activity (freeroam / in queue / racing), track name, position and class while racing. Configure your Discord application ID in \`config.lua\`.
`,
    },

    'spz-fpscap': {
      title: 'spz-fpscap',
      tagline: '60 FPS fairness cap.',
      badges: ['Standalone', 'Client'],
      body: `
GTA physics behave differently at very high frame rates — uncapped FPS is a lap-time advantage. This resource detects clients running above 60 FPS and blocks play until they limit it, with clear on-screen instructions. Fully standalone.
`,
    },

    'spz-log': {
      title: 'spz-log',
      tagline: 'Logging system.',
      badges: ['Server'],
      body: `
Structured logging for framework events — race lifecycle, player joins, admin actions — with configurable levels and outputs in \`config.lua\`.
`,
    },

    'spz-txrecipe': {
      title: 'spz-txrecipe',
      tagline: 'The txAdmin deployment recipe.',
      badges: ['v3.0', 'YAML'],
      body: `
One YAML file that builds the whole server:

- Downloads \`cfx-server-data\`, all dependencies, and every \`spz-*\` module from GitHub (release zips for NUI-built resources, source for Lua-only ones).
- Stores the database connection (\`connect_database\`) — **no SQL import step**; the schema applies itself on first boot via spz-core migrations.
- Writes a production \`server.cfg\`: correct ensure order, \`sv_enforceGameBuild 3407\`, \`sv_stateBagStrictMode true\`, ACE permissions, and commented tuning sections.
- Ships branding assets (logo, banner) and \`permissions.cfg\`.

Recipe URL:

\`\`\`
https://raw.githubusercontent.com/SPiceZ21/spz-txrecipe/main/spz-recipe.yaml
\`\`\`
`,
    },

    /* ══ REFERENCE ═════════════════════════════════════════ */

    'dependencies': {
      title: 'Dependencies',
      tagline: 'Third-party resources the recipe installs.',
      badges: ['Auto-installed'],
      body: `
All installed automatically by the recipe — listed here for reference.

| Resource | Role |
| --- | --- |
| oxmysql | Async MySQL driver. Every DB access goes through \`MySQL.*.await\` — no blocking sync calls anywhere in the framework. |
| ox_lib | Shared library — notifications, context menus, input dialogs, callbacks. Loaded via \`@ox_lib/init.lua\`. |
| fivem-appearance | Standalone character creator & clothing editor (no framework required). Pinned to v1.2.1 (last .zip release). |
| pma-voice | Proximity voice chat. |
| screenshot-basic | Screenshot capture (vehicle previews; overtake-clip fallback still). |
| screencapture | WebM video recording for overtake auto-clips, uploaded to FiveManage. |
| vMenu | Admin menu — staff tooling until spz-admin ships. Always ensured last. |
`,
    },
  },
}
