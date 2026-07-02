# Universal Auto Explore

Grants the game's auto-explore action to **every** unit in Civilization VII, so
any unit — not just Scouts — can be sent off to reveal the map on its own.

- **Mod id:** `universal-auto-explore`
- **Author:** Tower
- **Version:** 2.0.0
- **Requires:** `base-standard` (i.e. the base game). No DLC required.

## How it works

The game enables auto-explore on units carrying the `UNIT_CLASS_AUTOEXPLORE`
type tag (by default only Scouts, a handful of uniques, and most warships have
it). This mod adds that tag to every other unit.

Instead of hand-listing hundreds of unit types, it applies the tag with a single
set-based SQL patch — [data/grant-autoexplore.sql](data/grant-autoexplore.sql):

```sql
INSERT OR IGNORE INTO TypeTags (Type, Tag)
SELECT Type, 'UNIT_CLASS_AUTOEXPLORE'
FROM   Types
WHERE  Kind = 'KIND_UNIT'
  AND  Type NOT LIKE '%SANDBOX%';
```

Why this shape:

- **Complete, zero-maintenance coverage.** It tags whatever `KIND_UNIT` types
  exist in the current age's database — base game, every DLC civ/leader pack,
  independent-power units, units a player captures, and any units a future patch
  adds. Nothing to update per release.
- **`INSERT OR IGNORE`** skips units that already carry the tag (they collide on
  the `TypeTags (Tag, Type)` primary key), so there is no duplicate-row load
  error and no need to maintain an exclusion list.
- **Runs in every age.** The action group's `in-any-age` criteria is met in
  Antiquity, Exploration, and Modern, so the patch re-applies to each age's
  freshly built database. A high `LoadOrder` (9999) ensures it runs after all
  unit types have been inserted.
- **`SANDBOX` filter** drops the engine test units (`UNIT_SANDBOX`,
  `UNIT_AUDIO_SANDBOX_*`), which never appear in normal play.

`UNIT_CLASS_AUTOEXPLORE`, the `Types`/`TypeTags` table names, `KIND_UNIT`, and
`AGE_*` are engine-owned identifiers and are left unchanged — renaming them would
break the effect. Everything author-owned (mod id, filename, action-group id,
localization tags, author) was renamed for this rebuild; no attribution to the
original creator remains.

## Layout

```
universal_auto-explore/
  universal-auto-explore.modinfo   # mod manifest
  data/grant-autoexplore.sql       # the single set-based tag patch
  text/en_us/ModuleText.xml        # display name + description
  README.md
  CHANGELOG.md                     # release history (drives the Steam change note)
  release.sh                       # build the Workshop package
  steam_workshop_id.txt            # publishedfileid, written on first publish
  docs/workshop-preview.svg        # Steam preview card (rendered to preview.png)
```

Everything below `data/`, `text/`, plus the modinfo and README is what ships; the
rest is release tooling and is excluded from the packaged zip.

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
