# FM27: the staff of a club's youth and reserve teams

Notes for #243: the Manager job only covers the senior team, and the staff of the under-21s, under-18s and the like
cannot be set. Read on the Mac Steam build 26620374 (Apple silicon), on a save of 28 September 2026 (34,941 staff,
28,141 clubs, the game in Italian), with the probe only: nothing was written to the game. The counts come from a
throwaway read-only walk over every staff contract and every club's teams (not in the repository), beside
`staff-places --team-offset 0x80` and `staff-refs`.

## In short

A youth or reserve team has no list of staff of its own. A member of staff belongs to a team through **his contract's
team** (`[contract] team`, `+0x10`); only the manager is also held by the team itself (`[team] manager`, `+0x80`).
Jobs are the same codes as at the senior team: a U21 manager has job 16 like the first team's, an under-18 assistant
coach has job 20. So the editor's job code write already does what is needed for every job but the manager's; what is
missing is choosing the team.

```text
club +0x18 teams ─> [senior, U21 / U20 / U18 ...]            (list of team pointers, senior first)
team +0x28 kind, +0x30 club, +0x80 manager ─> staff object   (youth team: the manager only)
staff +0x170 ─> contract   +0x10 team      the team he works for (the youth team)
                           +0x18 senior    the club's senior team, always
                           +0x26 job       the same codes as at the senior team
club +0x78 coaching list ─> holds the youth managers, coaches, assistants, goalkeeping and fitness coaches, analysts
club +0x60 medical list  ─> holds the youth physios, doctors, sports scientists
```

## Which teams a club has

A club's `teams` list starts with the senior team (kind 0). The others, by club, on this save (28,141 clubs, men's and
women's):

| Kind | Name in the game | Club teams | With staff | With a manager's job |
| --- | --- | --- | --- | --- |
| 10 | U21 | 4,211 | 108 | 93 |
| 18 | U20 | 5,959 | 102 | 99 |
| 11 | U19 | 12,337 | 225 | 182 |
| 12 | U18 | 7,848 | 188 | 177 |
| 3 | B team | 451 | 18 | 13 |
| 16 | other reserve team | 617 | 40 | 30 |
| 9 | U23 | 393 | 1 | 1 |
| 1, 13, 14, 15, 17, 21, 36, 37 | not named | ~4,700 | 4 | 1 |

(Kinds and names as in `fm27-national-teams.md`; the names of 11, 16 and the rest were not checked on a club's screen.)
Typical sets are `[0]` (6,447 clubs), `[0, 11]` (5,365), `[0, 18, 12]` (4,962), `[0, 1, 11]`, `[0, 10, 11]` and
`[0, 10, 12]`. So "the U21 and the U18" are what the issue calls two of several: a club has the youth teams its
country's league system has (a club in Italy has an under-20 and an under-18, one in England an
under-21 and an under-18), and the editor must offer the club's own, by kind.

Most of these teams are empty shells: they exist for every club but only those of the leagues the game really plays
have players (0.3 on average) and staff: 108 of 4,211 U21 teams, about 1 in 40.

## Their staff

The 108 U21 teams with any staff have 549 people, the 102 U20 teams 657, the 188 U18 teams 1,313 and the 225 U19 teams
1,201: about 5.1, 6.4, 7.0 and 5.3 per team, from 1 to 26. A well staffed team has a manager, a coach or two, an
assistant coach, a physio or two, a fitness coach, a goalkeeping coach, a sports scientist and an analyst or two, now
and then a doctor. By job, over the U21 teams of the save:

| Job | Code | People | Teams having it |
| --- | --- | --- | --- |
| Manager | 16 | 93 | 93 |
| Coach | 2 | 57 | 43 |
| Assistant Coach | 20 | 47 | 44 |
| Goalkeeping Coach | 34 | 63 | 57 |
| Fitness Coach | 26 | 65 | 49 |
| Physio | 12 | 91 | 67 |
| Sports Scientist | 48 | 46 | 34 |
| Performance Analyst | 60 | 75 | 52 |
| Doctor | 46 | 6 | 6 |

The U20, U19 and U18 teams are alike, with more coaches (344 at 156 U18 teams) and doctors (79 at 49 U20 teams). The
player-coach codes (3, 21, 35, 17) appear a handful of times, as at the senior team. None of the other jobs (heads of a
department, scouts, directors, the board) has a contract with a youth team: they are all the club's, with the senior
team.

What the 4,057 contracts of the save with a team other than the senior team (of 20,302 staff contracts) have in common:

- **`+0x10` team** is the youth team, in every one of them, basic contracts included (doctors).
- **`+0x18` senior team** is the club's first team, in all 4,057, which is also what a first-team contract holds at
  `+0x10`.
- **`+0x26` job** is a job of the same codes (see `fm27-staff.md`); wage and dates are the contract's own.
- The club's department lists hold them as they hold the first team's. The 612 people in the manager's place of a
  youth or reserve team are all in the club's coaching list; the first team's managers are mostly in none (2,898 of
  3,506 jobs of 16 are in no list, 599 in the coaching list). So a youth manager is a coach of the club too.
- Nothing else points at a youth coach. `staff-refs` over an U18 assistant coach, an U18 coach and a U21 manager of
  one club and the first team's assistant coach (the human manager does not run it), and over four youth staff of the
  human manager's club: the contract (`+0x08`), the game's array of staff, and the same records of people as for anyone
  (relations, a transfer offer, a record, news). The manager is also held by his team's `+0x80`, and by nothing else.
  A U21 team dumped (`0xB8` bytes) holds people only at manager `+0x80`, captain `+0x88` and vice-captain `+0x90`
  (`+0xA0` is a pointer that was not followed).

## The manager's place

`[team] manager` (`+0x80`) holds the manager's object (not his person block), null for none. At club teams, by kind:

| Kind | Teams with staff | Manager at `+0x80` | His contract is with that team |
| --- | --- | --- | --- |
| 10 U21 | 108 | 96, 93 of them managers | 93 |
| 18 U20 | 102 | 99 | 99 |
| 12 U18 | 188 | 177 | 177 |
| 11 U19 | 225 | 186 | 182 |

The other holders of a youth team's place are heads of youth development (their contract is with the senior team) and a
few directors. Teams that have staff and no manager do occur: 15 U21, 12 U18 and 3 U20 ones. The game leaves a place
empty, as it does a senior team's between two managers (`fm27-staff.md`). None of the teams whose place is filled has
two contracts of job 16.

## What the editor does today

`Session::plan_staff_job` (`crates/fmlibre-core/src/staff_move.rs`) gives a member of staff another job at his club.
Read against the layout above (not run on youth staff, which would write):

- **A job other than manager for a youth team's staff** (coach to assistant coach, physio to sports scientist):
  changes the job byte and the department list, leaves the contract's team alone. So he stays at his youth team in
  the new job. `staff_holder` accepts him: the contract's team belongs to the club, and its `senior_team` check holds.
- **A youth team's manager given another job**: he leaves the team's `+0x80` (`leave_manager`, which finds any team of the
  club), keeps his contract team, and is a youth coach in the new job. Safe as it stands.
- **Anyone given Manager**: `Post::Manager` is the senior team's place (`join_post`), which must be empty
  (`ManagerTaken` otherwise), and the contract's team is written to the senior team. A youth coach so becomes the first
  team's manager. There is no way to make anyone a youth team's manager, or to move a coach to another team of the
  club.
- A move to another club and a signing put the person at the new club's **senior** team (`staff_contract_patches`):
  a youth manager moved loses his team. A release clears the place.

## A way to write a job at a youth team

An addition to the plan, not a new write: a **team** (an index into the club's `teams`, 1 and up, or the senior team)
beside the job, in the same `Patches` and undo.

1. The team `T` is one of the club's `teams` (`members' club == T +0x30`), found by the list the Squad tab already reads
   (`ClubTeam`: index, kind). Same club as the contract's, so men's and women's cannot mix.
2. The contract: `team` (`+0x10`) := `T`, `senior_team` (`+0x18`) untouched, `job` (`+0x26`) as chosen; the dates and
   wage not touched, and the contract's class does not matter (basic or full carry `+0x10` and `+0x26`).
3. The department: as now for the job (`STAFF_JOBS`); a youth manager joins the coaching list, which the first team's
   Manager does not.
4. The manager's place: if the job is Manager and the team is not the senior team, `T +0x80` must be null, and is set to
   his object; refused as `ManagerTaken` (naming him) if not; if he holds another team's place, that one is cleared in
   the same change. For any other job he leaves a place he holds, as now.
5. Refused as now: the human manager, the board, a director of football, player-coaches (`staff.role`).
6. Done and undone as one `StaffChange`, as a job is. After it, `staff-places --team-offset 0x80`, `teams` and
   `staff-member` read it back.

What the same plan needs in the app: a team select beside the job select, offering the club's teams by kind (the
Squad tab's names), not offered for a job that is the club's (director of football, scout, chief doctor and the like)
and where the club has no youth team with staff.

## Checked in the game

On the Mac Steam build 26797085 (Apple silicon; a build with no profile yet, every `health` check passed), on the same
save of 28 September 2026, the game's own screens were read before, during and after one write:

- **Before.** A club's All staff page (Squadra / Incarico columns) lists each person with the team of his contract
  ("Prima squadra", "Squadra U21", "Squadra U18") and his job: "Allenatore" (16), "Allenatore in seconda" (20),
  "Collaboratore Tecnico" (2), "Allenatore dei portieri" (34), "Preparatore atletico" (26), "Analista delle
  performance" (60), "Preparatore recupero infortunati" (48), "Fisioterapista" (12). A youth team's manager is
  "Allenatore", the same word as the first team's; the team is the column beside it. The chosen U18 team had eight
  staff and no "Allenatore" row: the game shows an empty place as no row at all. The coach's profile read
  "Collaboratore Tecnico - Under 18".
- **The write** (`fmlibre-probe youth-manager`, a test command, not for the app): two writes, the U18 team's `+0x80`
  from null to the coach's object and his contract's job from 2 to 16; his contract's team was the U18 team already.
  `staff-places --team-offset 0x80` read 178 U18 managers under contract with their team, one more than before.
- **Before Continue**, the All staff page, opened again, listed him as "Allenatore" of "Squadra U18", in one row.
- **A day on** (29 September), the page and memory still had him as the team's manager under the same contract; the
  game neither took him out nor put anyone else in.
- **The undo** put both writes back: Coach again, the team's place empty, 177 U18 managers. The page still showed him as
  "Allenatore" until Continue, and "Collaboratore Tecnico" after it. So the game may keep what that page shows for a
  while and build it again on Continue; whether opening another page and coming back, as after the write, is enough
  was not told apart. An editor feature should say the change shows for sure after Continue.
- **Three days on** (2 October), the team still had no manager: the game had not appointed one.

Still open after it: whether the game appoints a youth manager over a longer time, what the coach's profile and the
inbox said meanwhile, and a save and load with the change in place.

## Not known, and how to check

- **Moving someone to another team of the club** (a contract's team written, not only a job): the write above did not
  need it, as the coach worked for that team already. The Squadra column follows the contract's team, so it should
  show, but it was not tried.
- **Whether a youth team can go without a manager.** The game leaves some without (30 teams in this save), but does not
  tell what its match day or the human manager's advice does with one the editor emptied.
- **The human manager's club.** The game lets a human manager give his staff responsibilities. No object of that kind was
  found pointing at the four youth staff of his club that `staff-refs` read, but the screens were not looked at.
- **Federation teams** (`fm27-national-teams.md`): their staff sit in the container's lists (`+0x60`, `+0x78`, `+0x90`) and
  their manager's contract is not read by the editor yet, so this note does not apply to them.

## How to check a write, when one is made

On a save with a club that has a U21 team with staff and no manager, with the probe's `set`-style undo in hand:
make a coach of the club the U21 team's manager (`+0x80` and contract team), read `staff-places --team-offset 0x80` (the
count at kind 10 goes up by one), open the team's Staff page in the game, play a day, save under another name and load
it (every object at a new address), and read it again; then undo.
