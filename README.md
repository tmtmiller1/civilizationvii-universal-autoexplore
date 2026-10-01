# Universal Auto Explore for Civilization VII

Grants the game's built-in **Automate Exploration** action to every military
unit on land and at sea, not just Scouts, so any of them can be sent off to
reveal the map on its own. It does not change gameplay balance.

## At a glance (for players)

The Automate Exploration command Civilization VII gives your Scouts and some
ships, unlocked on every land and naval military unit: infantry, ranged,
cavalry, siege, every ship, and unique units.

- Any of these units can be told to explore and fill in the fog on its own.
- Settlers, Migrants, Merchants and other civilians, Commanders, and aircraft
  do not get it. Scouts keep it as before.
- It unlocks a command the game already has, so there's no new UI. If you can
  auto-explore a Scout, you can use this.
- Coverage includes base game, all DLC, independent-power units, and units
  added by future patches, automatically.
- A Civilopedia page, **Automate Exploration** (Game Concepts, under Combat),
  lists which units can explore and how to use the action.
- It does not touch balance, movement, combat, costs, or base-game files, and is
  safe to add to an ongoing game or save.

At a glance (for modders):

- **Mod id:** `universal-auto-explore`
- **Author:** Tower
- **Version:** 1.1.0
- **Requires:** `base-standard` (i.e. the base game). No DLC required.

---

## How it works

The game enables auto-explore on units carrying the `UNIT_CLASS_AUTOEXPLORE`
type tag (by default only Scouts, a handful of uniques, and most warships have
it). This mod adds that tag to every land combat, recon and naval unit.

Instead of hand-listing hundreds of unit types, it applies the tag with a single
set-based SQL patch — [data/grant-autoexplore.sql](data/grant-autoexplore.sql):

```sql
INSERT OR IGNORE INTO TypeTags (Type, Tag)
SELECT u.UnitType, 'UNIT_CLASS_AUTOEXPLORE'
FROM   Units u
WHERE  u.FormationClass IN (
           'FORMATION_CLASS_RECON',
           'FORMATION_CLASS_LAND_COMBAT',
           'FORMATION_CLASS_NAVAL'
       )
  AND  u.FoundCity = 0
  AND  u.UnitType NOT LIKE '%SANDBOX%';
```

Why this shape:

- **Low-maintenance coverage.** It tags whatever units of those formation
  classes exist in the current age's database: base game, every DLC civ/leader
  pack, independent-power units, and any units a future patch adds. Nothing to
  update per release.
- **Scoped to units the explore AI can drive.** The game's explore pathing only
  handles recon, land combat and naval units. Civilians, Commanders and aircraft
  crash it, so their formation classes stay out, and `FoundCity = 0` keeps
  city-founders out as well. `scripts/validate-sql.mjs` fails if they come back.
- **`INSERT OR IGNORE`** skips units that already carry the tag (they collide on
  the `TypeTags (Tag, Type)` primary key), so there is no duplicate-row load
  error and no need to maintain an exclusion list.
- **Runs on new games and loaded saves.** The action group uses `AlwaysMet`, so
  the patch executes whenever game scope initializes, including save loads. A
  high `LoadOrder` (9999) ensures it runs after all unit types have been
  inserted.
- **`SANDBOX` filter** drops the engine test units (`UNIT_SANDBOX`,
  `UNIT_AUDIO_SANDBOX_*`), which never appear in normal play.

`UNIT_CLASS_AUTOEXPLORE`, the `Units`/`TypeTags` table names, the
`FORMATION_CLASS_*` values, and
`AGE_*` are engine-owned identifiers and are left unchanged. Renaming them would
break the effect. Everything author-owned (mod id, filename, action-group id,
localization tags, author) was renamed for this rebuild; no attribution to the
original creator remains.

## Layout

```
universal_auto-explore/
  universal-auto-explore.modinfo   # mod manifest
  data/grant-autoexplore.sql       # the single set-based tag patch
  data/uae-civilopedia.xml         # Civilopedia page: Game Concepts > Combat > Automate Exploration
  text/en_us/ModuleText.xml        # name, description and Civilopedia text (source of truth)
  text/<lang>/ModuleText.xml       # the ten translations; text/README.md explains them
  tests/                           # translation and Civilopedia page checks (npm run verify)
  README.md  README.pdf            # this document
  CHANGELOG.md                     # release history (drives the Steam change note)
  CONTRIBUTING.md  LICENSE         # contributor guide + MIT license
  release.sh                       # build the Workshop package
  steam_workshop_id.txt            # publishedfileid, written on first publish
  images/
    universal-auto-explore-icon.svg  # mod icon
  docs/
    steam-workshop-description.md        # full Steam store copy (BBCode)
    steam-workshop-description-short.md  # short Steam store copy (BBCode)
    workshop-preview.svg  workshop-preview.png  # Steam preview card
  scripts/
    build_readme_pdf.sh            # regenerate README.pdf
```

Only the modinfo, `data/`, `text/`, README, CHANGELOG, and LICENSE ship in the
Workshop zip; `docs/`, `images/`, `scripts/`, and the release tooling are
repo-only (excluded by `release.sh`).

Everything below `data/`, `text/`, plus the modinfo and README is what ships; the
rest is release tooling and is excluded from the packaged zip.

## Translations

The mod's name, description and Civilopedia page ship in English and the game's ten other
languages: German, Spanish, French, Italian, Japanese, Korean, Polish,
Portuguese (Brazil), Russian and Simplified Chinese. They are machine
translations that use the game's own words for its terms, such as the
Automate Exploration action; corrections from native speakers are welcome. To
fix or add a language, see [`text/README.md`](text/README.md).

## Publishing to Steam Workshop

`release.sh` builds a clean, audited package — it does **not** upload (that needs
your Steam login).

1. Bump `<Version>` in the modinfo and add a matching `## [x.y.z]` section to
   `CHANGELOG.md`.
2. Run `./release.sh`. It writes `dist/`:
   - `universal-auto-explore-vX.Y.Z.zip` — the mod, modinfo at the zip root
     (also fine for manual install / CivMods).
   - `dist/universal_auto-explore/` — the upload content folder.
   - `preview.png` — 1024×1024 card rendered from `docs/workshop-preview.svg`
     (needs `rsvg-convert`; `brew install librsvg`).
   - `workshop_item.vdf` — the steamcmd manifest (appid `1295660`).
3. Upload with the command the script prints:
   ```
   ~/steamcmd/steamcmd.sh +login <yourSteamLogin> \
       +workshop_build_item <abs-path>/dist/workshop_item.vdf +quit
   ```
4. The first upload creates the item and prints a `publishedfileid`. Save it:
   `echo <publishedfileid> > steam_workshop_id.txt`. Later runs then upload in
   **update** mode and generate the Steam change note from the current
   `CHANGELOG.md` section.

## Notes

- Rebuilt against Civilization VII **1.4.1**. Because the effect is set-based,
  it does not need to be re-verified against a specific unit roster each patch.
