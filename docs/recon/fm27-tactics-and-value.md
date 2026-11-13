# FM27: tactics and transfer value

Research for a scouting tab that suggests players for the human manager's tactic. Read on the Windows Steam build
26340721 (save of 15 August 2027, human club AC Monza, UID 1149), against what the game's screens showed.

## Transfer value

A player's transfer value is the `i32` at **`player +0x234`**, in pounds, next to the asking price (`+0x238`, `-1`
when not set). The game shows it in euros, at about 1.166 euros a pound, and as a range when the club's scouts do not
know the player fully: the range starts at the stored value.

| Player | Stored | Game |
| --- | --- | --- |
| Erling Haaland | 226,496,256 | €264M – €287M |
| Arda Güler | 148,461,582 | €173M – €213M |
| Rafael Pinto Pedrosa | 21,647,602 | €25M – €30M |
| Gustavo Varela | 7,428,563 | €8.6M – €11M |
| Ricardo Mangas | 3,562,563 | €2.5M – €5.4M |
| Andrea Colpani | 4,416,109 | €4.1M |
| Dany Mota | 3,367,850 | €3.1M |
| Semuel Pizzignacco | 6,355 | €2.5K – €12K |
| Lionel Messi | 300,000,000 | "Not for Sale" |

300,000,000 marks a player who is not for sale (Messi; Saka and Mbappé read it too). Colpani's and Mota's single
values sit below the conversion (0.80 of it): how the game rounds a fully known value is not worked out.

`-1` is a player the game has never valued (#117): in two of RootTourist's saves only players with no club and no
contract hold it, all of 15 to 18 (453 of 32,794 players, and 38 of 125,533), and the game shows such a player's value
as £0 (Lora Ngoma, 15, a free agent). Other free agents mostly hold 0. heval99's save has 4,257 of them among 169,023
players, 16.2 years old on average; the Game Pass save of 12 January 2028 has 429 among 10,798, 16.4 on average, the
three looked up without a club. The editor takes a negative value as not known. When a transfer is agreed the game
sets the value to what the buyer pays (see `fm27-transfer-offers.md`).

**On the Mac** (Steam build 26340721, Apple silicon) the value sits 8 bytes earlier, at **`player +0x22C`**, like the
player's other own fields, right before the asking price (`+0x230`). On the Arsenal save of 4 July 2027, 1,017 players
read 300,000,000 (Lamine Yamal, Alexia Putellas), Phil Foden 144,244,816, Cole Palmer 154,739,659 and Florian Wirtz
122,385,266. 335 players read `-1`, nearly all from that summer's youth intake (16 on average): the game has not
valued them yet.

## Where a club's tactic is

The match engine's selections (`simatch::PREPARED_TACTICS_CREATOR_ARRAY`, see `fm27-transfers.md`) keep a list at
`+0x08` whose entry points at the **tactic block**. When the manager leaves the tactics screen after a change, the
game writes the block, or builds a new one and points the selection at it; until then the tactics screen works on
its own copy, which it frees afterwards. Monza's two selections each pointed at an up-to-date block; a block an
older selection had pointed at stayed in memory with the old roles.

The same block layout holds every club's tactic: the game's ready-made "Positive 4-3-3 DM Wide - Control Possession"
was in memory 39 times with Monza's exact eleven slots.

| Offset | Field |
| --- | --- |
| `+0x000` | 11 records of 16 bytes, one per slot, and a 12th at `+0xB0`: they follow the style template, not the roles (team and player instruction settings, not decoded) |
| `+0x0E0` | 10 bytes of flags that change with the template |
| `+0x100` | `u32` style tag, as text backwards: `CONT` (Control Possession), `TIKI` (Tiki-Taka), `DIRE` (Direct) |
| `+0x148` | 11 in-possession slot entries, `0x48` bytes each (their role masks at `+0x158`, `+0x1A0`, …) |
| `+0x468` | 11 out-of-possession slot entries, `0x48` bytes each (role masks from `+0x478`) |
| `+0x798` | bytes `00 01 … 0a` after `1b`: a one-to-one slot table, probably in-possession to out-of-possession |
| `+0x7D0` | a second copy of the records and entries (its slot entries changed with the first) |

A slot entry: `+0x00` and `+0x08` zero, **`+0x10` `u64` role mask**, `+0x18` a `u64` mask that changes with the
template (not the position), `+0x20` a list `(begin, end, capacity)` of 24-byte items that changes with the role (its
instruction options), `+0x38` `1`. The last slot's entry stops after its role mask. The slots are in the order of
the selection's person ids and of the game's tactic table (goalkeeper first).

### Role masks

Every role mask holds two bits: one of bits 21, 22 and 23, and one other that names the role. The in-possession and
out-of-possession roles are numbered apart. Read on Monza's tactic in three rounds (4-3-3 twice, then 5-2-2-1); the
names are the game's English abbreviations.

In possession (bit / bit 21–23):

| Bit | Role | Bit | Role | Bit | Role | Bit | Role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 / 21 | CB | 11 / 23 | CFD | 27 / 23 | IF | 46 / 22 | BBP |
| 2 / 22 | FB | 12 / 22 | BGK | 29 / 21 | NCB | 48 / 22 | WCM |
| 3 / 22 | WB | 14 / 21 | ACB | 35 / 21 | HB | 52 / 21 | IFB |
| 4 / 21 | DM | 16 / 22 | BBM | 38 / 23 | AWB | 53 / 21 | NGK |
| 7 / 22 | W | 17 / 23 | AP | 43 / 22 | PW | 54 / 23 | OCB |
| 9 / 23 | AM | 19 / 23 | P | 44 / 21 | IWB | 55 / 22 | PWB |
| 10 / 23 | DLF | 24 / 21 | BCB | 45 / 23 | WFD | 56 / 23 | CHM |

Out of possession:

| Bit | Role | Bit | Role | Bit | Role | Bit | Role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 / 23 | SK | 9 / 21 | FB | 16 / 21 | DDM | 32 / 23 | OAM |
| 2 / 21 | LHK | 10 / 22 | PFB | 17 / 22 | PDM | 38 / 22 | W |
| 3 / 21 | CB | 11 / 21 | HFB | 20 / 22 | CM | 39 / 21 | TW |
| 4 / 21 | SCB | 12 / 21 | WB | 27 / 23 | PCM | 40 / 23 | IOW |
| 5 / 21 | CCB | 14 / 21 | HWB | 28 / 21 | SCM | 42 / 22 | CFD |
| 6 / 21 | WCB | 15 / 21 | DM | | | 43 / 21 | TCF |
| | | | | | | 44 / 23 | OCF |

The out-of-possession roles run in pitch order (goalkeepers, centre-backs, full-backs, wing-backs, defensive
midfielders, midfielders, attacking midfielders, wingers, forwards), which leaves the gaps for the roles not seen
yet. A role seen in two slots or moved between slots kept its mask (PFB, PCM, TW, OAM, CB).

**On Game Pass** (0.9.2409.0, save of 17 September 2026, human club Manchester United) the block reads the same:
three selections pointed at copies of one Gegenpress block (`GEGE`), whose eleven slots came out as BGK / SK, WB / FB,
BCB / CB, CB / CB, FB / FB, AM / ?, DM / DM, ? / PDM, ? / ?, IF / ?, CFD / CFD with Lammens, Dalot, Yoro, Martínez,
Shaw, Güler, Tielemans, Baleba, Mbeumo, Rashford and Šeško in them. Four masks there are not named yet:
in possession `0x408000` (bit 15 / 22) and `0x2000000400000` (bit 49 / 22), out of possession `0x40400000`
(bit 30 / 22) and `0x800400000` (bit 35 / 22, in two slots).

**On the Mac** (Steam build 26340721, Apple silicon, the Arsenal save of 4 July 2027) the block is laid out alike up
to the style tag (`+0x100`, `VERT` here), but the slot entries sit 8 bytes later: the in-possession role masks from
`+0x160`, the out-of-possession ones from `+0x480`, `0x48` apart. Each of the manager's three selections pointed at
two blocks of `0x800` bytes, one after the other (`+0x104` read `03 04` in the first and `03 05` in the second). The
second matched the eleven of the selection: BGK Raya, NCB Konsa, BCB Saliba and Gabriel, CFD Haaland, DM Guimarães,
PW Saka, AM Ødegaard, W Musiala, DLF Kane. The first held other roles (IWB, IFB, AP, WFD). A selection lists one
block for each tactic its manager keeps, and the byte after the list is the index of the one he plays (see
`[tactics]` in the layouts): the two blocks were two tactics. The byte was not read on that save.

On the Benevento save of 14 September 2026 (Steam build 26385295, Apple silicon) every selection with a sound list
pointed at one block: the manager's own (`VERT`, `+0x104` `03 04`) and those of three clubs the game runs, Carrarese,
Hellas Verona and Sampdoria (style `NULL`, `+0x104` `02 04` or `02 03`, team instructions `0x4000000000000000 0`,
which read as no instruction set in any area). The Mac layout places the block from that save, and the probe's
`scout --tactics` and `opponent` read it; the Scouting tab does not.

A human manager's selection is the one inside his team's tactics (`[tactics]`: the list of blocks at `tactics` is the
selection's own list, so the selection starts `tactics - 0x08` into the team's tactics). Its 26 slots are the one
eleven and bench he has picked, whatever tactic he plays. On that save the manager kept one tactic for the senior
team; where the game puts each player when he changes to another of his tactics is not seen yet.

### The pairing of the two phases

The out-of-possession slots are not in the order of the in-possession ones. Eleven bytes at `+0x7B4` on the Mac,
after a `1B` at `+0x7B3` (the table the Windows block has at `+0x798`), give for each in-possession slot the
out-of-possession slot of the same place:

| Club | Bytes |
| --- | --- |
| Benevento | `0 1 2 3 4 5 7 8 6 9 10` |
| Carrarese | `0 1 2 3 4 6 7 5 8 9 10` |
| Hellas Verona | `0 1 2 3 4 6 5 9 7 8 10` |
| Sampdoria | `0 1 2 3 4 6 5 8 7 9 10` |

Read through it, Carrarese's left wing-back (AWB with the ball) is an HWB without it and its defensive midfielder a
PDM; read slot for slot, the wing-back would defend as a PDM and a central midfielder as an HWB. Benevento's two
central midfielders both come out as CM and its two wingers with one mask. The other way round (the byte as the
in-possession slot of an out-of-possession one) gives Benevento a winger defending as a CM. Not checked against the
tactics screen.

Masks seen on that save and not named yet, with the players who held them. In possession: `0x200001` (bit 0 / 21, two
goalkeepers), `0x400020` (bit 5 / 22, central midfielders of three clubs), `0x408000` (bit 15 / 22, two defensive
midfielders), `0x840000` (bit 18 / 23, a striker), `0x2000000400000` (bit 49 / 22, an attacking midfielder),
`0x8000000200000` (bit 51 / 21, one of three centre-backs) and `0x200000000400000` (bit 57 / 22, a central
midfielder). Out of possession: `0x400001` (bit 0 / 22, two goalkeepers), `0x402000` (bit 13 / 22, a wing-back,
between WB and HWB),
`0x240000` and `0x280000` (bits 18 and 19 / 21, defensive and central midfielders, between PDM and CM), `0x40400000`
(bit 30 / 22, a central midfielder), `0x80200000` (bit 31 / 21, a central midfielder) and `0x800400000` (bit 35 / 22,
three wingers and an attacking midfielder).

## The calendar

A match still to play is a `sicomps::FIXTURE`, `0x58` bytes, kept in arrays (22,005 of them on the Benevento save of
14 September 2026, Steam build 26385295, Apple silicon):

| Offset | Field |
| --- | --- |
| `+0x08`, `+0x10` | pointers to the home and the away team (a club's team object: its senior team or another of its teams) |
| `+0x18` | a pointer in a match already played, zero in the others |
| `+0x20`, `+0x28` | two pointers, the first the same in every match of a competition, the second the same in every home match of a team (not read further: probably the competition and the stadium) |
| `+0x3B` | `u8`, the matchday from 0 |
| `+0x48` | a date, the same in every match of a competition: the day it ends |
| `+0x4C` | the day of the match, `[u16 day of the year][u16 year]` |

Benevento's senior team had Carrarese away on 19 September 2026 (a Saturday) and Cesena at home on 10 October, then
the rest of the league season and a cup match on 15 December. Of the matchdays already played only the first was
still there. A match close in time is there more than once, the copies alike but for a byte at `+0x37` (and, in one
of Carrarese's six, at `+0x46`). The dates were not checked against the game's schedule screen, and the layout was
not looked for on Windows.

For Carrarese the match engine already held a selection (four copies, with a tactic block) five days before the
match; for Cesena, four weeks away, only objects without a sound list. Whether a club fields the eleven the game
holds for it beforehand is not checked.

### Not found yet

- **Positions** (D (R), DM, AM (L) …). They are not an array of codes in the block, in Monza's
  `TACTICS_CREATOR_ARRAY` objects or next to them (searched across 4-3-3 and 5-2-2-1). A role names the line it plays
  in, so a scouting tab can start from the role and the side of the player who holds the slot.
- The roles not yet seen, the meaning of bits 21–23 and of the second mask.

## How it was found

The probe gained `dump --out FILE` (raw bytes) and `pages OUT [--against OLD]`, which hashes every 4 KiB page of the
game's memory (5.4 GB in 2.5 s) and saves the pages that changed. Hashing every five seconds while the manager changed
one role back and forth (in-possession full-back to inverted full-back and back, leaving the screen each time) gave
the moments of the edits, and the ready-made tactic's copies gave the block layout. Each witness round then changed
the roles of one phase, left the screen and read the block.
