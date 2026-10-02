# Changelog

All notable changes to the **Universal Auto Explore** mod for Civilization VII.
Loosely follows [Keep a Changelog](https://keepachangelog.com/) and Semantic
Versioning. The Steam Workshop change note for each release is generated from the
matching section below by `release.sh`.

## [1.2.0] - 2026-10-01

Options for which units can auto-explore, and civilian units back.

### Added
- A **Universal Auto Explore** block in Options > Add-ons with a checkbox for
  each group of units that can auto-explore: Scouts, land military units and
  naval units. Turning a group off removes the Automate Exploration action from
  its units.
- Under each group, a **Choose ...** checkbox opens the list of its units, one
  checkbox per unit, to turn the action off for single units. The lists appear
  when Options is opened from a game.
- A **Civilian Units** group: Settlers, Migrants, Merchants, trade caravans and
  ships, Missionaries, Great People, Commanders and other units that do not
  fight can be given the action again, as in 1.0.0-1.0.2. The data patch tags
  these units; the group starts off, and while it is off the action stays out of
  their unit panel. Aircraft are still left out.
- Every group but Civilian Units starts on, so the mod behaves as before until a
  setting is changed. Changes apply the next time a unit is selected, and Cancel
  undoes them.
- The Civilopedia page's "Not Included" section explains the Civilian Units
  option.
- The Options text in all eleven languages.

### Changed
- 1.0.3 removed civilian units and Commanders over a reported crash. Crash-soak
  runs with every unit type tagged and dozens of civilian units and Commanders
  auto-exploring each turn (two map seeds, 60 turns, and a reloaded save) did
  not crash, so they are offered again behind the Civilian Units option.

## [1.1.0] - 2026-10-01

A Civilopedia page and ten translations.

### Added
- A Civilopedia page, **Automate Exploration**, under Game Concepts > Combat: which
  units can explore automatically, which are left out, and how to use the action.
- The mod's name, description and Civilopedia page in ten languages besides
  English: German, Spanish, French, Italian, Japanese, Korean, Polish,
  Portuguese (Brazil), Russian and Simplified Chinese, machine-translated with
  the game's own terms.
  `text/README.md` explains how to correct or add one.

### Changed
- The README describes the 1.0.3 unit scope and shows the current SQL.
- The description now matches what 1.0.3 does: the Automate Exploration action
  goes to military units on land and at sea, while civilian units, Commanders
  and aircraft keep their usual actions. It no longer names a game version.

## [1.0.3] - 2026-07-17

Crash fix. Restores stability for games with commanders, settlers, or many
independent powers (city-states) on the map.

### Fixed
- The grant no longer tags non-explorer units. Previous versions tagged every
  unit in the game with `UNIT_CLASS_AUTOEXPLORE`, including Settlers, Migrants,
  Merchants, Army/Fleet Commanders, and aircraft. The base game's auto-explore
  pathing AI cannot drive those unit types and dereferences a null pointer while
  processing their moves, hard-crashing the game (a deterministic segfault that
  surfaced mid-AI-turn, most often several turns in and worst with high
  city-state counts). The grant is now scoped to the explore-capable formation
  classes only — recon, land-combat, and naval — so every military and scouting
  unit still auto-explores while the crash-prone units are left alone.

### Changed
- The grant now selects from `Units` filtered by `FormationClass`
  (`RECON`, `LAND_COMBAT`, `NAVAL`) with a `FoundCity = 0` guard, instead of
  tagging the entire `KIND_UNIT` set from `Types`.
- `scripts/validate-sql.mjs` updated to lock in the new safe contract and to
  actively reject re-adding the civilian/command/air formation classes.

## [1.0.2] - 2026-07-06

Developer tooling and quality-gate release. **No gameplay changes** — the shipped
mod (the auto-explore SQL patch and localized text) is byte-for-byte identical to
1.0.1, so existing saves and setups are unaffected.

### Added
- No gameplay changes in this release: it only hardens the mod's developer
  quality gates, so players do not need to do anything.
- SQL contract test harness (`scripts/validate-sql.mjs`, run via
  `npm run test:sql`) that asserts the grant patch keeps its safety-critical
  shape — `INSERT OR IGNORE INTO TypeTags`, the `UNIT_CLASS_AUTOEXPLORE`
  projection, the `KIND_UNIT` filter, and the `SANDBOX` exclusion — so a future
  edit cannot silently drop coverage or reintroduce duplicate-row load errors.
- `package.json` exposing `lint`, `test:sql`, and a combined `verify` script as
  the single pre-release quality gate.
- Dev-only ESLint flat config (`eslint.config.js`) that enforces complexity,
  function-size, and line-length limits on any UI JavaScript added later.

### Changed
- `release.sh` now excludes the new developer tooling (`package.json`,
  `eslint.config.js`, `node_modules`, lockfiles) from the packaged mod, so the
  Workshop upload stays data-only and keeps passing the zip allow-list audit.

## [1.0.1] - 2026-07-02

### Changed
- Switched the game-scope database action criterion from age-gated to
  `AlwaysMet` so the auto-explore tag patch is re-applied on loaded saves as
  well as new games.
- Updated docs to explicitly describe save compatibility behavior.

## [1.0.0] - 2026-07-02

Initial release.

### Added
- Grants the game's auto-explore action to every unit, so any unit — not just
  Scouts — can be sent off to reveal the map on its own.
- Applied with a single set-based SQL patch that tags every `KIND_UNIT` in the
  active age's database, so coverage is automatic for the base game, all DLC
  civ/leader packs, independent-power units, captured units, and units added by
  future patches — with no per-unit maintenance.
- `INSERT OR IGNORE` skips units that already carry the tag (Scouts, most
  warships, and a handful of uniques), and engine test/sandbox units are
  excluded.
- Built and verified against Civilization VII **1.4.1**.
