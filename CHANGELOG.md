# Changelog

All notable changes to the **Universal Auto Explore** mod for Civilization VII.
Loosely follows [Keep a Changelog](https://keepachangelog.com/) and Semantic
Versioning. The Steam Workshop change note for each release is generated from the
matching section below by `release.sh`.

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
