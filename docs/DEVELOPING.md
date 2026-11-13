# Developing FMLibreEditor

How the editor works, how to build and release it, and how to use the command-line probe.
For installing and using the app, see [INSTALL.md](INSTALL.md).

## Goals

- Attach to a running FM27 and edit players, staff and clubs live, in the spirit of
  FMRTE and FM Live Editor, but free and open source.
- First-class support for the **Game Pass / Microsoft Store** and **Steam** builds; Epic
  later. The **Steam build on macOS** too.
- A modern interface that feels like FM: attribute colours, a pitch position map,
  faces and logos from your installed graphics packs, mass editing with a preview,
  and an undo history.
- Survive game patches: find the game's data again automatically, and fall back to
  read-only whenever something does not check out.

## How it works

FM27's interface is Unity (IL2CPP), but the game itself, its database and
simulation, lives in a native, anti-tamper protected module: `game_plugin.dll`.
FMLibreEditor runs as a separate process and reads that module's heap data with
`ReadProcessMemory`. To edit, it writes values back with `WriteProcessMemory`, into the
game's heap, and into the plugin's own data at one place only: the pool of contracts
(below). It never patches the game's code. It takes memory in the game (`VirtualAllocEx`
on Windows, `mach_vm_allocate` on the game's task port on macOS, see `own_memory.rs`) for
two things: a stadium's name that does not fit the block of the old one, a string laid out
as the game's with a count of holders the game never brings down to nothing, so the game
never hands it to its allocator (see `stadium_name.rs`); and a list with no room for one
more, a player's relations for a tie added (see `relations.rs`), a club's department for
a member of staff (see `staff_move.rs`) or a squad for a player who joins it (see
`transfer.rs`), whose elements it moves there (see `own_memory.rs`). It never gives that
memory back.

A contract for a free agent it signs, or for a member of staff with no club, is the game's
own: the game keeps its contracts in a pool, a static of the plugin that hands out 200-byte
slots and chains the free ones, and the editor takes the first free slot as the game does,
writing the pool's first free slot and its counts (`object_pool.rs`, `signing.rs`,
`staff_move.rs`; `Process::write_static` writes only a module's writable data, never its
code). On Windows it puts no code of its own in the
game; on macOS the game loads one small library of ours, the bridge (see
[On macOS](#on-macos)).

Before every write it checks five things:
- the game still has the save the editor read (see [When the game loads a save](#when-the-game-loads-a-save));
- the object still belongs to the same person;
- the new value is one the field can take;
- the current value looks like that field's (otherwise the layout does not fit);
- the value reads back as written.

If any check fails, nothing changes.

### When the game loads a save

The editor reads the game's lists when it connects, and again when the data is reloaded, and writes to the objects
they found. A save loaded in the game meanwhile, the same one or another, gives the game new objects, mostly at other
places but not always: the lists can stay where they were, with a player of the same UID at the same place in another
career, where a check of the object alone would let a freeze of the other save through. To tell, the editor reads a
count the game keeps (issue #122): its one object of the class `game_plugin::GAME_UI`, which a static of the plugin
points at, counts the saves loaded since the game started (`[game] loads` in `layout.toml`, `+0x100`). Loading a save
adds one; saving does not, as only the code that loads a save writes it. Neither does starting a new game, which the
main menu tells instead: there the lists are empty.

Once the count has changed, or the lists were seen empty, since the editor read them, `Session::save_changed` says so
until they are read again (`Session::recheck`). Meanwhile the editor writes nothing (`Lock::SaveChanged`, which
`field_lock` and `structure_lock` give before any other check), holds nothing frozen, and says so under the masthead,
with Reload data. The names of stadiums renamed in the editor are the one exception, as the game drops them on every
load: their hold checks for itself that the game has a save of the same career (the same human managers), reads the
clubs again where they moved, and only then gives the names back (`Session::vouch_for_save`).

The build profiles place the static (`game_ui`, 0x3C80 before the players pair on both Windows builds of November
2026); a build without a profile finds it as it finds the retirement manager's (below). The Mac keeps the count in the
same object at the same place (read on Steam build 26385295, where loading the save again raised it from 1 to 2).
Copy diagnostics (and `fmlibre-probe diagnostics`) says where the count was read, how it was found and what it is
("Saves loaded"), and its Writing line says when writes wait for Reload data.

### After an update of the game

Each build of the game moves its static data. A build profile in `profiles/` (identified by `game_plugin`'s headers)
places the entity arrays, the in-game date, the retirement manager and the game's own object for each build the editor
was checked with.
For a build without one, or where a place a profile names does not check out, the editor looks for them itself
(`crates/fmlibre-core/src/locate.rs`):
- **The entity arrays** by scanning the plugin, in about half a second.
- **The in-game date** among the values in the plugin's writable data that read as dates: 76 on the Steam test save
  of August 2027. Only a date that two independent witnesses agree with is used:
  - nearly every sampled contract was signed before it, and the latest not long before;
  - nine in ten of the current injuries began on or before it and are not over by then.

  Contracts alone cannot rule out a later date the game keeps for something else: 22 September and 11 October 2027
  on that save. The injuries can, as only 12 and 3 of 110 fitted those. The day before is harder: the game keeps a
  value for it too, and as the witnesses leave some room, it fits unless enough contracts were signed and injuries
  begun on the day. On Game Pass 0.9.2435.0 on 11 January 2028, `game_plugin.dll+0x53886f8` held the 10th: 3 of 3,712
  contract dates came after it and 161 of 173 injuries fitted it, against none and all 173 for the date. When values
  that fit read as several dates, the date is, in turn:
  - the latest of them, if the field beside the arrays holds it: that is where the builds before November 2026 kept
    the date, and 0.9.2409.0 keeps it there too once the game has moved on a day after a load;
  - the one read within 0x400 bytes of where the other builds keep their date, by its distance from the players'
    array: the date's own variable has kept that distance to within 0x38 bytes from one build to the next, while the
    value for the day before sits some 0x2F000 bytes away;
  - the one that fits the witnesses better than every other: no more contracts after it, no fewer injuries, and
    better on one count. On a day on which no contract was signed and no injury began, the day before fits exactly
    as well as the date, so this alone cannot tell them apart.

  Otherwise none is used.
- **The retirement manager's static** where other builds keep it, as far from the players' array, checked by the
  name of the class its object has. Otherwise the plugin's writable data is searched for a pointer to an object of
  the class `RETIREMENT_MANAGER`, which takes about half a second.
- **The game object's static**, whose count of saves loaded tells a load from a save, the same way: where other builds
  keep it, else by a search for a pointer to the one object of the class `game_plugin::GAME_UI`. Two statics point at
  it on Game Pass 0.9.2409.0 (0x5670EC8 and 0x5680140); either leads to it, and the profiles keep the second, which
  is where Steam build 26340721 keeps its own.

With those, a build that keeps the object layout of the last one (as both updates of November 2026 did) shows ages
and planned retirements as before. What stays different for such a build:
- **No writes by default.** The app says that this version of the game is new to it. It writes nothing until the user
  presses Edit anyway, which lasts until the app is closed or connects again.
- **Checks before any write** (`crates/fmlibre-core/src/health.rs`), on every build. Each check samples up to 2,000
  players, members of staff or clubs, and looks for what a layout that reads the wrong bytes cannot fake:
  - every player rates 20 in his natural position;
  - goalkeepers are better at goalkeeping than outfield players, strikers at finishing and centre-backs at tackling;
  - goalkeeping coaches, physios and scouts are better than others at what their job is about;
  - contracts point back at their players, and some were signed after the player joined;
  - teams list their players, and clubs' senior teams point back at them.

  A check that does not pass leaves what it covers read-only: its fields, or for the contracts, teams, staff and clubs,
  every change to the game's lists and records. The app lists such checks under the masthead.
- **No date read from the wrong place.** Even where a profile places the in-game date, it is only used when the
  contracts fit it, and the current injuries too when there are enough of them to tell. Otherwise the app shows no
  ages, rather than wrong ones, and a transfer leaves the dates of the contract as they were.

Each check was tried against a layout broken on purpose (a field group moved by a byte or a pointer's width), and each
such layout failed its check. A layout that changed is not found again automatically: its checks keep what they cover
read-only until `profiles/fm27/layout.toml` is fixed.

#### On the day of an update

1. Load a save in the updated game. If the probe finds values that read as two dates a day apart (the value the
   game keeps for the day before), it says how it chose between them: check that the date it took is the one the game
   shows, and that it read it where the other builds keep their date.
2. `fmlibre-probe profile --out profiles/fm27/<storefront>-<version>.toml` looks for everything as for a build
   without a profile, runs the checks with what it found, and writes the profile. It lists the values that read as a
   plausible date, and whether the guessed and the searched places of the retirement manager and of the game object
   agree.
3. Add the file to `BUILDS` in `crates/fmlibre-core/src/profile.rs`; a unit test fails until it is there.
4. Build the app (`npm run release`), and run the smoke tests on both storefronts (see
   [`tools/smoke`](../tools/smoke/README.md)).

To rehearse this on a build the editor knows, set `FMLIBRE_IGNORE_PROFILES=1` before starting the app or the probe:
every build is then one without a profile. On both builds of November 2026, the search finds exactly the places their
profiles name, and `fmlibre-probe profile` says so ("the same places").

### On macOS

macOS lets no app read another app's memory unless the other app allows debugging, and
Football Manager does not: it is signed with Apple's hardened runtime. Unless System
Integrity Protection is turned off, macOS lets no other app attach to it. What the game
does allow is loading extra libraries named in `DYLD_INSERT_LIBRARIES` (Steam's overlay uses
the same door), so FMLibreEditor comes with a small one, the bridge (`crates/fmlibre-bridge`).

Steam on macOS runs a launch option as a program, with the game among its arguments, so the
launch option names a small launcher, `fmlibre-launch`, that comes with the bridge. The
launcher puts the bridge in `DYLD_INSERT_LIBRARIES` (in front of the libraries Steam names
there) and then turns into the game, so Steam keeps following the process it started. The
bridge hooks nothing, patches nothing and reads none of the game's data. It only answers the editor of the
same user with the game's task port, macOS's handle to a process's memory. From there the
editor works as it does on Windows: it reads with `mach_vm_read_overwrite`, writes with
`mach_vm_write` into the game's heap only, and makes the same four checks before every write.

The connect panel of the app sets the bridge up (**Set up the bridge**) or takes it out
again. Setting up copies the bridge and the launcher to
`~/Library/Application Support/FMLibreEditor/` and puts the launcher in front of FM27's
launch options in Steam, which only works while Steam is closed; Steam keeps the launch
options to itself while it runs. With Steam open, set the launch option yourself: right-click
Football Manager 27 in Steam, then **Properties › General › Launch Options**, and enter

```text
'/Users/<you>/Library/Application Support/FMLibreEditor/fmlibre-launch' %command%
```

The panel shows the line with your own folder in it. Launch options you already have stay,
behind the launcher; another tool's launcher among them is started in turn.

> **Before you delete these files by hand,** take the launch option out: Steam cannot start
> the game through a launcher that is not there. **Remove the bridge** in the app does both,
> in the right order. Without the bridge library, the launcher starts the game as it is.

## Repository layout

| Path | Contents |
|---|---|
| `crates/fmlibre-mem` | Process access on Windows and macOS: processes, modules, memory regions, PE and Mach-O headers, guarded writes |
| `crates/fmlibre-bridge` | macOS: the library the game loads to hand its memory to the editor, and the launcher Steam starts the game through |
| `crates/fmlibre-core` | Football Manager logic: game detection, calibration, decoders, editable fields |
| `crates/fmlibre-probe` | Command-line probe |
| `profiles/` | Object layouts per edition and addresses per game build |
| `app/` | Tauri 2 desktop app (React + TypeScript) |
| `tools/smoke` | Smoke tests that drive the built app against a running game |
| `docs/` | Install guide, roadmap and reverse-engineering notes (`recon/`) |
| `docs/design/` | The interface's design system (`DESIGN.md`) and product notes (`PRODUCT.md`) |

## Building

Requirements: Windows 10/11, Rust stable (via [rustup](https://rustup.rs)),
Visual Studio Build Tools with the C++ workload, and Node.js 20+ for the app.

```powershell
cargo build --release -p fmlibre-probe
cd app; npm install; npm run tauri dev     # run the desktop app
npm run release                            # build target\release\FMLibreEditor.exe
```

`npm run release` builds a stand-alone `FMLibreEditor.exe` without an installer. It
needs the WebView2 runtime, which Windows 10 and 11 already have.

On macOS: Xcode's command line tools, Rust stable with the Intel target as well
(`rustup target add x86_64-apple-darwin`, for the bridge to load in Intel builds of the
game), and Node.js 20+.

```sh
cargo build --release -p fmlibre-probe -p fmlibre-bridge
cd app; npm install; npm run tauri dev     # run the desktop app
npm run release:mac                        # build FMLibreEditor.app, universal, with the bridge
```

`npm run release:mac` writes the app to
`target/universal-apple-darwin/release/bundle/macos/FMLibreEditor.app`, signed ad hoc: it
has no Developer ID and is not notarized. macOS opens a copy downloaded from the internet
only once it is allowed in **System Settings › Privacy & Security** (**Open Anyway**).

`npm run dev` in `app/` serves the interface in a plain browser with made-up sample
players, for working on the UI without the game.

The app reads graphics packs from
`Documents\Sports Interactive\Football Manager 27\graphics` on Windows and from
`~/Library/Application Support/Sports Interactive/Football Manager 27/graphics` on macOS.
If FM keeps its user data somewhere else, set the environment variable `FMLIBRE_GRAPHICS`
to that graphics folder before starting the app.

The app remembers what was frozen in each save in `frozen.json` in its data folder
(`%APPDATA%\io.github.tozmoz.fmlibreeditor` on Windows,
`~/Library/Application Support/io.github.tozmoz.fmlibreeditor` on macOS). A save is told
apart by the storefront and the UIDs of its human managers. To test without touching that
file, set `FMLIBRE_DATA` to another folder before starting the app.

The same file keeps the names the editor gave stadiums. The game keeps no stadium names in
its saves and gives each stadium the name in its database whenever it loads one, so the app
gives the new names again: on connecting, on a reload, and from its hold, which every 2 s
notices when the game has loaded a save (the clubs' array has moved), checks it is the same
save before writing, and reads the clubs again (see `Connection::hold_stadiums`).

Exports go to `Documents\FMLibreEditor\Exports` (`~/Documents/FMLibreEditor/Exports` on
macOS); `FMLIBRE_EXPORTS` names another folder. The columns and the JSON keys are in
`crates/fmlibre-core/src/export.rs`.

### Releasing

1. **Bump the version** in three places:
   - `version` in the root `Cargo.toml` (`[workspace.package]`);
   - `app/package.json`;
   - `app/src-tauri/tauri.conf.json`.

   Commit the bump.
2. **Tag it and push the tag:** `git tag v0.1.0` and `git push origin v0.1.0`.
3. **The `Release` workflow** (`.github/workflows/release.yml`) runs the checks and builds,
   on GitHub's Windows and macOS machines:
   - `FMLibreEditor-Setup.exe`, a per-user NSIS installer in English, Turkish, Spanish, German,
     French, Italian, Japanese, Korean and Russian;
   - `FMLibreEditor-portable.zip`;
   - `FMLibreEditor-macOS.zip`, the universal app with the bridge and its launcher;
   - `FMLibreEditor-macOS.app.tar.gz`, the same app, which installed macOS apps update from.

   It opens a **draft** release with these files, `latest.json` and
   `docs/release-notes.md` as its text.
4. **Write what is new in the draft and publish it.** From then on, installed Windows copies
   and macOS apps of a version with the updater (any after 0.4.1) offer **Update** in their
   notice.

The download links in the README point at the latest published release. People outside the
repository can use them once it is public.

#### Updates from inside the app

A copy the Windows installer put in place, and the macOS app, update themselves with Tauri's
updater plugin: it reads `latest.json` from the latest published release (the endpoint in
`app/src-tauri/tauri.conf.json`), downloads the file it names for the system, and checks its
signature against the public key in the same file.

- **Windows:** the installer runs in passive mode; the app closes and the installer opens
  the new version.
- **macOS:** the app in `FMLibreEditor-macOS.app.tar.gz` takes the place of the running
  one's bundle (macOS asks for an administrator's password where the user may not change
  it), and the app starts again (`restart_app`). At startup an app run from its bundle puts
  its bridge and launcher in place of the installed ones where they differ
  (`bridge_setup::refresh`), so the game loads the new bridge the next time it starts.

Portable copies, a macOS app that macOS runs from where it was downloaded (App
Translocation) and development builds open the release's page instead (`can_self_update`).

The workflow signs the installer and the macOS archive with the private key in the
repository's secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`,
and writes `latest.json` from the signatures. The maintainer keeps a copy of the key and its
password outside the repository: a release signed with another key is refused by every
installed copy, which would then have to be updated by hand once. The macOS archive is made
after the app is notarized, so its build makes no updater files itself
(`tauri.bridge.conf.json`); a local `npm run release` or `npm run release:mac` needs no
key.

## Using the probe

Start FM27, load a save, then run:

```powershell
fmlibre-probe info                                   # process, storefront, modules, game_plugin.dll layout
fmlibre-probe calibrate                              # identify the build; locate players, staff, clubs, the date, the saves loaded
fmlibre-probe health                                 # the checks the editor makes before it writes, and what each found
fmlibre-probe diagnostics                            # what the app's Copy diagnostics copies: no names or paths
fmlibre-probe profile                                # a build profile for this build, looked for as for a new build
fmlibre-probe players "arda guler"                   # search players (accents ignored), best first
fmlibre-probe players --position st --max-age 20 --min-pa 170 --sort pa   # wonderkid strikers
fmlibre-probe players --max-age 21 --export young.csv   # every match to a file, as the app's Export writes it (.json: JSON; --semicolon)
fmlibre-probe player 7458500                         # everything read for one player
fmlibre-probe staff arteta                           # search staff; staff-member <id> for details; --export FILE as players
fmlibre-probe clubs tottenham                        # search clubs; club <uid> for details; --export FILE as players
fmlibre-probe fields player                          # what the editor can change (also: staff)
fmlibre-probe get player 7458500                     # those fields' values for one player
fmlibre-probe set player 7458500 attribute.finishing 18 --shown   # change one: this writes to the game
fmlibre-probe move 13200568 1139 --restore           # move a player to a club and back: this writes too
fmlibre-probe room                                   # the clubs whose senior squad list is full, best known first
fmlibre-probe room 597                               # how full one is, and whom a move there can release to make room
fmlibre-probe plan 28106491 597 --release 2000031611 # whether a move can be made, as the app's dialog asks; no writes
fmlibre-probe move 28106491 597 --release 2000031611 --restore   # move him there in that player's place, and back
fmlibre-probe swap 13200568 72048035 --restore       # two players swap clubs and back: this writes too
fmlibre-probe release 91100466 --restore             # release a player from his club and back: this writes too
fmlibre-probe staff-move 4000571 1139 --restore      # move a member of staff to a club and back: this writes too
fmlibre-probe staff-move 4102655 676 --job 88 --restore   # the same, as another job (a code, see staff-job)
fmlibre-probe staff-job 4000571 14 --restore         # give a member of staff another job and back: this writes too
fmlibre-probe staff-sign 9318 728 2 --restore        # sign one with no club, as a coach, and back: this writes too
fmlibre-probe staff-places                           # where clubs keep their staff, job by job; no writes
fmlibre-probe staff-places --club-offset 0x148       # what one place of every club holds: its director of football
fmlibre-probe contract-classes                       # full and basic contracts of players and staff, counted
fmlibre-probe staff-at 0x28eb75773a0 --len 0x100     # name the staff a stretch of memory points at, e.g. after refs
fmlibre-probe injuries 728                           # the current injuries of a club's players
fmlibre-probe heal 37055843 --heal --restore         # heal a player and list his injuries again: this writes too
fmlibre-probe bans                                   # every player with a ban; bans <uid> for one player's
fmlibre-probe bans 29120248 --lift --restore         # lift a player's bans and list them again: this writes too
fmlibre-probe ties 2000138835                        # secondary nationalities and homegrown status, numbered
fmlibre-probe tie-set 2000138835 0 --nation 765 --restore   # point tie 0 at England and back: this writes too
fmlibre-probe teams 680                              # a club's teams: kinds, captains, players' fitness and morale
fmlibre-probe lineup                                 # the eleven that fits each formation best, for the next match
fmlibre-probe lineup --full-strength --formation 3-5-2   # one formation's, with the whole squad fully fit
fmlibre-probe cohesion 680 --raw                     # each senior player's cohesion with the club, and his other entries
fmlibre-probe familiarity 2188                       # each senior player's record of familiarity, area by area (macOS)
fmlibre-probe training-history 2188                  # the areas each player's history of training adds up to (macOS)
fmlibre-probe training-history 2188 --max --grow --restore   # Max tactics' history, and back: this writes too
fmlibre-probe concerns --all                         # every reason to be unhappy, whom it is about, and the groups
fmlibre-probe captain 680 43425040 --restore         # make a player captain (--vice: vice-captain) and back
fmlibre-probe prizes                                 # the prize money competitions pay, by final position and per match
fmlibre-probe prizes 130286 --win 1234567 --restore  # change what a Süper Lig win pays and back: this writes too
fmlibre-probe scan                                   # find arrays of game objects in game_plugin.dll
fmlibre-probe refs 0x1a5a5396990 --span 0x3c8        # every pointer into an object (holders, lists, squads too)
fmlibre-probe dump game_plugin.dll+0x1000 --len 0x100
fmlibre-probe element game_plugin.dll+0x5681dc0 0    # follow an array and dump element 0
fmlibre-probe column game_plugin.dll+0x5681dc0 0x294 --find 7458500   # find a player by UID
fmlibre-probe find "18 July 2026"                    # search memory for text (UTF-8 and UTF-16)
fmlibre-probe find "c7 80 ea 07" --as hex --module game_plugin.dll
```

Addresses and lengths are hexadecimal. Add `--json report.json` to `info` or `scan`
to save the results. `calibrate --scan` ignores the build profile and finds the
arrays, the in-game date, the retirement manager and the game object the way it would on an unknown build.

Only `set`, `move`, `swap`, `release`, `staff-move`, `staff-job`, `staff-sign`, `heal --heal`,
`bans --lift`, `tie-set`, `tie-add`, `tie-remove`, `captain`, `cohesion --set`, `familiarity --set`,
`training-history --max` and `prizes` with an amount to change write to the game. Unlike the app, the probe writes to a build without a profile too, as far as the checks allow, so
that a new build can be mapped.
- `set` changes one field after the checks above. Values are as stored:
  attributes run 0–100, or 1–20 with `--shown`.
- `move` moves a player to a club's senior team; `release` leaves him a free agent.
- With `--restore`, each one puts the old values back straight away, to test
  without changing the save. `set`, `move`, `release`, `heal`, `bans`, the `tie`
  commands, `captain`, `cohesion`, `familiarity`, `training-history` and `prizes` also take `--hold <seconds>` to
  wait first, so the
  change can be looked at in the game. The Dynamics page shows a team's cohesion as the game last
  worked it out, and works it out again only once the game moves on (Continue).

If Windows denies access, run the probe from an administrator terminal.

On macOS, `fmlibre-probe bridge` shows whether the game loads the bridge;
`fmlibre-probe bridge setup` installs the bridge and the launcher built next to the probe
and sets the launch option (quit Steam first), and `fmlibre-probe bridge remove` takes them
out again.
Then start FM27 from Steam: the other commands work as on Windows, with `game_plugin` in
place of `game_plugin.dll` in addresses.

