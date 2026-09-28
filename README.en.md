# NEON STRIKE · 霓虹突袭

[简体中文](README.md) | [English](README.en.md)

A cyberpunk arcade shooter built with HTML, CSS, and JavaScript. The browser game has no runtime dependencies or build step. Android and Windows wrapper projects are included for offline desktop and mobile play.

**Current version: v1.8.0**

[Play online](https://hailaij.github.io/dafeiji/) · [Download APK / Windows EXE](https://github.com/hailaij/dafeiji/releases/tag/v1.8.0)

This is the English project guide. In-game labels and the linked design and test reports are currently in Chinese.

## Features

- VibeHub Workshop integration provides decorative player rings, read-only combat readouts, and lifecycle events through a versioned Mod API. Multiplayer policy is `mods-disabled`. See the [Workshop guide (Chinese)](WORKSHOP.md).

- Choose an aircraft and weapon independently: three aircraft (游隼 / Peregrine, 壁垒 / Bulwark, 灵翼 / Spirit Wing) and three weapons (Pulse, Heavy Shot, Spread) offer nine combinations with a live firing preview.
- Five game modes, three difficulty levels, 14 regular enemy designs, and 11 Bosses with distinct attack patterns and synthesized battle music.
- Roguelike upgrades, six weapon evolutions, repair/supply/elite routes, and three compatible build synergies: weak-point execution, electromagnetic circuit, and thorn regeneration.
- Enemy formations, shield support craft, optional supply transports, and destructible side turrets on the Mobile Fortress.
- Aircraft-specific shield visuals, directional hit feedback, shield-break effects, and Boss vulnerability indicators.
- Responsive HUD and simultaneous touch movement / EMP input. Mobile HUD height is approximately 53 px in normal combat, 95 px during portrait Boss fights, and 81 px during landscape Boss fights. Additional details are available in the pause menu.
- Separate music and sound-effect volume controls, music preview, and post-run statistics covering loadout, routes, damage sources, cleared bullets, combos, and cause of death.
- Local high scores stored separately for each mode and difficulty; PWA support for offline browser play after caching.

## Quick start

### Browser

Use the [online version](https://hailaij.github.io/dafeiji/), open `index.html` directly in Chrome or Edge, or serve the repository locally:

```bash
python -m http.server 8080
```

Then visit <http://127.0.0.1:8080>. A local server or the hosted site is needed for service-worker caching; opening the file directly still supports ordinary gameplay.

### Android

Download **neon-strike-v1.8.0.apk** from the [release page](https://github.com/hailaij/dafeiji/releases/tag/v1.8.0). Android 7.0 or later is required. Allow installation from the app used to open the APK when prompted. The game runs offline and requests no network permission. The published APK uses a debug signing certificate.

To rebuild, prepare JDK 17 and the Android SDK as described in [Android build instructions (Chinese)](android/README.md), then run from the repository root:

```powershell
.\sync-assets.ps1
.\android\build-local.ps1
```

Output: `android/dist/neon-strike-v1.8.0.apk`.

### Windows

Download **neon-strike-v1.8.0-win64.exe** from the [release page](https://github.com/hailaij/dafeiji/releases/tag/v1.8.0). The approximately 69 MiB executable targets **Windows 10/11 x64**. It includes .NET and the game assets, but **requires the Microsoft Edge WebView2 Runtime** to be installed. Windows 7 is not a supported target.

To rebuild, prepare .NET SDK 8 or later as described in [Windows build instructions (Chinese)](win/README.md), then run from the repository root:

```powershell
.\sync-assets.ps1
.\win\build-local.ps1
```

Output: `win/dist/neon-strike-v1.8.0-win64.exe`. The synchronization script updates both wrapper projects from the root web source.

## Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | WASD / arrow keys / mouse tracking | Drag; the aircraft stays above your finger |
| Fire | Automatic | Automatic |
| Pause | P / Esc | Top-right pause button |
| EMP | E | Bottom-right skill button |
| Start / restart | Enter or on-screen button | On-screen button |

On mobile, keep one finger moving the aircraft and use another to activate EMP. The skill triggers on press. Its circular indicator shows recharge progress and the remaining cooldown, then displays a ready state.

EMP has a **10-second base cooldown**, deals area damage, stuns enemies, and clears enemy bullets. It also grants 0.25 seconds of protection on activation. Pausing or choosing upgrades freezes its cooldown. Roguelike upgrades can enhance it.

## Game modes

| Mode | Objective and rules |
|---|---|
| Endless (无限) | Survive increasingly difficult waves and pursue a high score. Bosses appear every five waves. |
| Campaign (闯关) | Complete ten stages, each containing three regular waves and a Boss wave. |
| Roguelike (肉鸽) | Choose one of three upgrades every three waves. After wave 3, choose one of your weapon's two evolutions. Choose a repair, supply, or elite route after each three-wave upgrade. Upgrades last for the current run, with caps and diminishing returns on repeated upgrades. |
| 180-second Challenge (180 秒挑战) | Survive three minutes of active combat with a fixed aircraft and weapon. Difficulty remains selectable; pickups are disabled. Enemy pressure increases every minute. Victory depends on surviving the timer, not killing the final Boss. |
| Boss Rush (Boss 连战) | Fight five consecutive Bosses with your chosen aircraft and weapon. Start with a level-3 main weapon; choose repair or increased damage between fights. Pickups are disabled, but Boss summons remain active. |

Weapon evolutions are **Piercing / Chain** for Pulse, **Charged / Explosive** for Heavy Shot, and **Focused / Wide** for Spread. Each has tradeoffs in damage, firing rate, coverage, or secondary targets. See the [expedition design (Chinese)](docs/design/expedition.md) for exact values and route rewards.

## Difficulty

Difficulty modifies enemy stats, spawn pacing, starting lives, and scoring. Mode-specific rules and wave scaling also apply.

| Setting | Easy | Normal | Hard |
|---|---|---|---|
| Starting lives | 5 | 3 | 2 |
| Enemy health | ×0.65 | ×1.0 | ×1.25 |
| Enemy movement speed | ×0.80 | ×1.0 | ×1.12 |
| Enemy bullet speed | ×0.78 | ×1.0 | ×1.12 |
| Spawn interval | ×1.35 (slower) | ×1.0 | ×0.90 (faster) |
| Score multiplier | ×1.0 | ×1.0 | ×1.3 |
| Boss health multiplier | ×0.60 | ×0.75 | ×1.05 |
| Boss warning duration | ×1.35 | ×1.10 | ×1.00 |
| Boss reload duration | ×1.65 | ×1.45 | ×1.00 |

Additional enemy bullet-speed growth from wave progression is capped at 10%. Enemies sense the player periodically, use limited prediction, and stop chasing at close range or after passing the player. Shooting enemies lock their aim and show a warning before firing, leaving time to reposition.

See the [balance adjustment report](docs/reports/balance-adjustment.md) and [long-run balance fixes](docs/reports/longrun-balance-fixes.md). Simulation results measure scripted scenarios and are not human win rates.

## Enemies and Bosses

Regular enemies include straight-flying grunts, weaving craft, hovering gunners, armored tanks, charging divers, splitters, snipers, bombers, player-mirroring craft, healers, phasing enemies, shield support craft, and supply transports. Enemy types unlock as waves progress; elite enemies can appear from wave 6.

Bosses follow a **lock → warning → attack → reload** cycle and enter phase 2 at 50% health or below. They are protected on entry until their first attack. Movement remains continuous through phase transitions; intentional teleport abilities retain their own behavior. EMP clears fired bullets and can delay subsequent attacks.

| Boss | Main mechanic | Phase 2 | Battle music |
|---|---|---|---|
| Classic Commander (经典首领) | Alternating wide and aimed fans | Seven-shot fans and periodic grunt summons | Command Salvo · 112 BPM |
| Hive Mothership (蜂巢母舰) | Inward volleys from both sides; Weaver summons | Five shots per side and more frequent summons | Hive Protocol · 132 BPM |
| Phantom Core (幻影核心) | Teleporting between firing positions | Five-shot narrow fans | Distorted Phantom · 96 BPM |
| Mobile Fortress (移动堡垒) | Alternating bullet-wall passages; armored and vulnerable reload states | Faster walls and shorter reload windows | Steel March · 88 BPM |
| Storm Overlord (风暴支配者) | Three rotating arms of bullets | Reversed spiral and faster attacks | Ionosphere · 150 BPM |
| Rebirth Nexus (涅槃中枢) | Rotating hexagonal formations; vulnerable reconstruction window | Additional offset outer ring | Rebirth Matrix · 108 BPM |
| Annihilation Vortex (湮灭漩涡) | Alternating firing centers | Twelve directions instead of eight | Event Horizon · 126 BPM |
| Siege Cannon (无敌重炮) | Three heavy columns aimed at the player's horizontal position | Faster shells and shorter reloads | Siege Pulse · 78 BPM |
| Supernova (超新星) | Alternating slow and fast rings | Eighteen directions instead of twelve | Critical Burn · 140 BPM |
| Twin Star Rings (双子星环) | Alternating aimed shots from two ports | Additional slow mirrored fans | Mirror Orbit · 120 BPM |
| Omega Finale (欧米茄终局) | A three-step cycle of gates, radial shots, and aimed shots | Denser radial and aimed volleys | Final Directive · 156 BPM |

Music is synthesized with WebAudio, including melodies, bass, percussion, and four-bar harmonic loops. Phase 2 adds melodic and rhythmic layers. No audio assets need downloading. Playback stops on pause, mute, Boss death, or leaving combat and restarts when appropriate.

Open [the Boss lab](test/boss-lab.html) to preview attacks and music with invincibility enabled, or [the art atlas](test/art-lab.html) to inspect sprites, grayscale silhouettes, and collision circles. These previews do not change normal game rules.

## Pickups and scoring

- **W**: weapon level; **S**: shield (three hits); **H**: health repair.
- **B**: six seconds of berserk firing (×2 firing rate, ×1.5 damage).
- **F**: five seconds of frost, slowing enemies and enemy bullets by 55%.
- Consecutive kills within two seconds build a combo multiplier, up to ×2.
- Roguelike critical-hit upgrades can reach a 30% critical chance; additional upgrades affect critical damage.
- High scores and settings are stored locally. The old global score remains stored but is excluded from the new mode/difficulty records.

## Development and testing

The game itself needs no package installation. Run logic tests with Node.js from the repository root:

```bash
node test/logic.test.js
node test/input.test.js
node test/enemy.tracking.test.js
node test/boss.design.test.js
node test/boss.movement.test.js
node test/emp.test.js
node test/expedition.test.js
node test/balance.fix.test.js
```

Browser tests require the Playwright Node package to be resolvable and a locally installed Chrome browser:

```bash
node test/boss.modes.test.js
node test/emp.ui.test.js
node test/expedition.ui.test.js
node test/hud.mobile.test.js
node test/audio.ui.test.js
```

See [test instructions (Chinese)](test/README.md) for additional suites and balance simulation commands. Generated screenshots go to the ignored `test/artifacts/` directory. Historical simulation reports are retained for comparison; avoid overwriting them when running new audits.

## Repository layout

```text
dafeiji/
├── README.md / README.en.md     # Chinese / English project guides
├── index.html / style.css / js/ # Browser game source
├── manifest.json / sw.js        # PWA manifest and offline cache
├── sync-assets.ps1              # Copy web assets to both native wrappers
├── android/                    # Android WebView wrapper and build script
│   ├── app/src/main/assets/www/ # Synchronized offline game assets
│   └── dist/                   # Local APK output
├── win/                        # .NET 8 WinForms / WebView2 wrapper
│   ├── assets/www/             # Synchronized offline game assets
│   └── dist/                   # Local executable output
├── docs/                       # Design documents and test reports
├── test/                       # Tests, preview labs, and simulation data
├── tools/                      # Development utilities
├── skills/                     # Project workflow references
└── .local/archive/             # Local archive; not committed
```

Edit the root web source, then run `sync-assets.ps1` before rebuilding native packages. See the [documentation index (Chinese)](docs/README.md) for further design and verification details.

## Git connection troubleshooting

If GitHub connections time out or fail with `Recv failure: Connection was reset`, and a local proxy is available, first verify it with:

```bash
git -c http.proxy=http://127.0.0.1:<actual-port> ls-remote origin refs/heads/main
```

After a successful check, save a proxy setting for this repository only:

```bash
git config --local remote.origin.proxy http://127.0.0.1:<actual-port>
```

Keep the proxy running while using it. Restore direct access with `git config --local --unset remote.origin.proxy`. Do not disable TLS certificate verification.

## License

[MIT](LICENSE).

## Changelog

### [1.8.0] — 2026-09-28

#### Added

- VibeHub Workshop integration with decorative player rings, read-only combat readouts, and lifecycle events through Mod API 1.0.0.
- Workshop developer guide, capability catalog, minimal Mod example, dependency rules, and compatibility guidance.
- English README and language navigation; VibeHub collaboration, GitHub deployment, and default-branch protection.

#### Improved

- Public API setup is separate from game startup: wait for beforeStart, initialize the game, call markGameReady, then wait for afterStart.
- Hosted Loader failures produce an explicit error; local and offline versions start without waiting for Workshop networking.
- Immutable snapshots, unique registration IDs, callback isolation, and unregister functions define a small public interface.

#### Validation and packaging

- Workshop lifecycle, snapshots, duplicate IDs, offline startup, multiplayer guard, combat, EMP, ten HUD sizes, and Boss audio regressions passed.
- Capability declarations are not a sandbox. The game is currently single-player; mods-disabled requires any future multiplayer entry to reject all enabled Mods.
- Android versionCode 16; web, Android, and Windows versions are 1.8.0. Mod API remains 1.0.0.
- Workshop Mods load through VibeHub; native packages have no platform Mod-selection screen. Physical-device installation acceptance has not been performed for this release.

### [1.7.0] — 2026-09-27

#### Added

- Six roguelike weapon evolutions and repair, supply, and elite routes.
- A 180-second fixed-loadout challenge and five-fight Boss Rush.
- Independent music/effects volume, music preview, and expanded run summaries.

#### Fixed

- Abrupt Boss movement when entering phase 2; phase transitions now preserve movement continuity and accelerate smoothly.
- EMP shockwaves being hidden by the background and cooldown recovery continuing during pauses or selection screens.
- Bosses being killed during entry; protection now lasts until their first attack and is shown in the HUD.

#### Improved

- Caps and diminishing returns for repeated roguelike upgrades; elite bonus upgrades limited to the first three completions.
- Boss Rush health/firepower balance, three-stage challenge pacing, and Phantom damage windows.
- EMP protection, range and cleared-bullet feedback, Boss disruption hints, countdown precision, and ready feedback while retaining the 10-second base cooldown.
- Compact mobile HUD, two-finger controls, hit-direction feedback, shield flashes, shield-break effects, and vulnerability hints.

#### Validation and packaging

- Preserved 654 pre-fix and 654 post-fix long-run simulations, plus 282 EMP-update simulations. These are not human win-rate measurements.
- Regression coverage includes ten HUD sizes, portrait/landscape layouts, simulated safe areas, EMP multitouch, Boss movement, turrets, and audio.
- Android versionCode is 15; web, Android, and Windows versions are 1.7.0. Offline caches and wrapper assets are synchronized.
- This release has not completed physical-device installation acceptance or long-session human playtesting.

For earlier releases, see the [complete Chinese changelog](README.md#更新日志) and [GitHub Releases](https://github.com/hailaij/dafeiji/releases).
