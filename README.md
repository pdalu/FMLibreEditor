# FMLibreEditor

A free, open-source live editor for **Football Manager 27**. Edit players, staff and clubs
while the game runs.

Works on **Windows** (Xbox / Game Pass and Steam) and **macOS** (Steam).

[![Latest release](https://img.shields.io/github/v/release/tozmoz/FMLibreEditor?label=release)](https://github.com/tozmoz/FMLibreEditor/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/tozmoz/FMLibreEditor/total)](https://github.com/tozmoz/FMLibreEditor/releases)
[![License: GPL-3.0](https://img.shields.io/github/license/tozmoz/FMLibreEditor)](LICENSE)

**Open source, and open to your help:** fixes, translations, testing on your copy of the game or
findings about FM27's data are all welcome. See [Contributing](#contributing).

![The player list and a player's profile](docs/images/players.png)

## Download

- **Windows 10 or 11:**
  [FMLibreEditor-Setup.exe](https://github.com/tozmoz/FMLibreEditor/releases/latest/download/FMLibreEditor-Setup.exe)
  or the [portable zip](https://github.com/tozmoz/FMLibreEditor/releases/latest/download/FMLibreEditor-portable.zip)
- **macOS:**
  [FMLibreEditor-macOS.zip](https://github.com/tozmoz/FMLibreEditor/releases/latest/download/FMLibreEditor-macOS.zip)

How to install and use it: [docs/INSTALL.md](docs/INSTALL.md).

## What it does

- Browse, search and filter every player, member of staff and club.
- Edit attributes, abilities, positions, personality, traits, contracts with their bonuses and
  clauses, reputation, finances, stadiums and more.
- Heal injuries, lift bans, remove unhappiness, prevent retirement, raise morale and fitness,
  max out attributes, set captains, for one player or a whole team.
- Freeze a player's attributes, energy and match sharpness, a whole team's from its squad
  tab, or a club's money: while the app runs, they do not go down, and the app freezes them
  again when you connect to that save another time.
- Rename a stadium. The game takes stadium names from its database each time it loads a save,
  so the app gives the new name back whenever it does, while the app is open.
- Transfer, swap or release players, sign free agents, and move staff between clubs in their
  own job or another (doctors, analysts and directors of football too), or sign staff who have
  no club.
- Mass edit many at once, with a preview; undo any change.
- Scout your squad: how every player suits each of the game's 79 roles and what he should train, the best
  eleven and second eleven of your tactic worked out exactly, how your squad fills other formations, and transfer
  advice that says how much a signing would lift your best eleven.
- Export the player list, with its search and filters, to CSV or JSON for a spreadsheet or
  your own tools: attributes, positions, personality, contract and more, with the in-game date.
- Checks how it reads the game before it writes, and stays read-only on a version of FM27 it
  has not been checked with yet.
- English, Turkish and Spanish; logos, flags and faces from your graphics packs.
- Updates itself on Windows and macOS: one click downloads and installs a new version.

The game shows a change once you press **Continue** in FM.

![Editing a player: a change waits, highlighted, until you apply it](docs/images/edit.png)

> **Status: beta.** Use it with offline, single-player saves, and back up your save
> before editing.

## Contributing

FMLibreEditor is built in the open, and you do not need to know reverse engineering to help.
A first pull request can be small: a typo, a clearer sentence, one translated screen.

- **Pick up an issue:** the ones labelled
  [help wanted](https://github.com/tozmoz/FMLibreEditor/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)
  are open for anyone. Comment on one to take it, so nobody else starts the same work. Have an
  idea of your own? Open an issue or ask in
  [Discussions](https://github.com/tozmoz/FMLibreEditor/discussions).
- **Work on the interface without the game:** `npm run dev` in `app/` opens it in a browser with
  made-up players (React + TypeScript).
- **Translate:** the app speaks English, Turkish and Spanish; another language is one file,
  see [CONTRIBUTING.md](CONTRIBUTING.md#translating).
- **Test:** try a release on your storefront (Game Pass, Steam, macOS) and
  [report](https://github.com/tozmoz/FMLibreEditor/issues/new/choose) what does not work.
- **Research:** found where FM27 keeps something? Share it in an issue; the notes in
  [docs/recon](docs/recon) show what is known already.

[CONTRIBUTING.md](CONTRIBUTING.md) explains how to start, and
[docs/DEVELOPING.md](docs/DEVELOPING.md) how the editor works, how to build it and the
command-line probe. Questions are welcome in
[Discussions](https://github.com/tozmoz/FMLibreEditor/discussions). Please follow the
[code of conduct](CODE_OF_CONDUCT.md).

Thanks to everyone who has contributed code, findings and testing; see the
[contributors](https://github.com/tozmoz/FMLibreEditor/graphs/contributors) and the issues where
much of FM27's data was worked out.

FMLibreEditor is not affiliated with or endorsed by Sports Interactive or SEGA. Memory-layout
leads come from GPL-3.0 project:
[fm-editor](https://github.com/barak14/fm-editor) by barak14

## License

GPL-3.0-or-later. See [LICENSE](LICENSE). The app's typeface,
[Archivo](https://github.com/Omnibus-Type/Archivo) by Omnibus-Type, is bundled under the SIL
Open Font License 1.1 ([app/licenses/Archivo-OFL.txt](app/licenses/Archivo-OFL.txt)).
