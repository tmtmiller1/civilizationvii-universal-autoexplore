# Changelog

All notable changes to the **Universal Auto Explore** mod for Civilization VII.
Loosely follows [Keep a Changelog](https://keepachangelog.com/) and Semantic
Versioning. The Steam Workshop change note for each release is generated from the
matching section below by `release.sh`.

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
