# Universal Auto Explore for Civilization VII

Grants the game's built-in **Automate Exploration** action to every military
unit on land and at sea, not just Scouts, so any of them can be sent off to
reveal the map on its own. It doesn't change gameplay balance.

## At a glance (for players)

The Automate Exploration command Civilization VII gives your Scouts and some
ships, unlocked on every land and naval military unit: infantry, ranged,
cavalry, siege, every ship, and unique units.

- Any of these units can be told to explore and fill in the fog on its own.
- Settlers, Migrants, Merchants and other civilians, and Commanders, get it only
  when you turn on **Civilian Units** in Options. Aircraft never get it. Scouts
  keep it as before.
- It unlocks a command the game already has. If you can auto-explore a Scout,
  you can use this.
- **Options > Add-ons > Universal Auto Explore** turns the action on or off for
  Scouts, land military units, naval units and civilian units, and for any
  single unit in those groups. Every group but Civilian Units starts on.
- Coverage includes the base game, all DLC, independent-power units, and units
  added by future patches, with no mod update.
- A Civilopedia page, **Automate Exploration** (Game Concepts, under Combat),
  lists which units can explore and how to use the action.
- Balance, movement, combat and costs stay as the game has them, base-game
  files are left alone, and it's safe to add to an ongoing game or save.

At a glance (for modders):

- **Mod id:** `universal-auto-explore`
- **Author:** Tower
- **Version:** 1.2.3
- **Requires:** `base-standard` (the base game). No DLC required.

---

## Options

Under **Options > Add-ons**, the **Universal Auto Explore** block has a checkbox
for each group of units:

- **Scouts**: Scouts and other recon units, such as the Chasqui.
- **Land Military Units**: infantry, ranged, cavalry and siege, including
  unique units.
- **Naval Units**: every warship.
- **Civilian Units**: every unit that does not fight: Settlers, Migrants,
  Merchants, trade caravans and ships, Missionaries, Great People, Commanders
  and the like. Off until you turn it on.

Below each group, **Choose ...** opens a list of the units in it, one checkbox
per unit. Turning a group off removes the Automate Exploration action from every
unit in it, whatever their own checkboxes say; turning a unit off removes it from
that unit only. Every group but Civilian Units starts on, which is how the mod
behaves without these options.

- Changes apply the next time you select a unit; no reload is needed. A unit
  that is already exploring keeps going until it stops on its own.
- The unit lists show the units of the current age, so open Options from a game
  to see them. The main-menu Options screen shows the four group checkboxes.
- **Cancel** puts back the settings the screen opened with.
- Settings are saved for the game you are in and for new games.
- The options only hide the action. Which units can auto-explore at all is set
  by the data patch below, which leaves aircraft out, so they are not listed.

## The map lens when you select a unit

Selecting a unit leaves the map on the lens the game would pick without the
mod. A Warrior, a Missionary or a Galley keeps the default lens. Scouts and the
game's own explorers and warships still open the Discovery lens, the Founder and
Settlers get their settling lens, and Merchants get the trade lens.
Auto-explore still works on every unit that has it.

The base game opens the Discovery lens for every unit tagged
`UNIT_CLASS_AUTOEXPLORE`
(`base-standard/ui/interface-modes/interface-mode-unit-selected.js`), the same
tag that offers the action. So the data patch also marks each unit it tags with
`UNIT_CLASS_UAE_GRANTED`, and `ui/uae-unit-lens.js` turns the Discovery lens
into the default lens for those units while the game picks a lens on
selection. In the Exploration Age the game opens the Discovery lens for every
warship anyway, so warships keep doing that. Other mods that pick a lens on
selection, such as Map Trix's commander and religion lenses, still run first.
If a game update renames the method this hooks, the mod logs one warning and
these units open the Discovery lens again; auto-explore keeps working.
The design is in [docs/lens-design.md](docs/lens-design.md).

Status: built and tested offline, not yet watched in game. Before this change,
a 1.5.0 game showed a Warrior, a Missionary and a Trebuchet switching to the
Discovery lens with the mod on, alone or with other mods, and keeping the
default lens with it off.

## How it works

The game enables auto-explore on units carrying the `UNIT_CLASS_AUTOEXPLORE`
type tag (by default only Scouts, a handful of uniques, and most warships have
it). This mod adds that tag to every land combat, recon and naval unit, and to
every non-combat unit on land and at sea for the Civilian Units option.

Instead of hand-listing hundreds of unit types, it applies the tag with two
set-based SQL statements in
[data/grant-autoexplore.sql](data/grant-autoexplore.sql):

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

INSERT OR IGNORE INTO TypeTags (Type, Tag)
SELECT u.UnitType, 'UNIT_CLASS_AUTOEXPLORE'
FROM   Units u
WHERE  u.CoreClass IN ('CORE_CLASS_CIVILIAN', 'CORE_CLASS_SUPPORT')
  AND  u.Domain IN ('DOMAIN_LAND', 'DOMAIN_SEA')
  AND  u.UnitType NOT LIKE '%SANDBOX%';
```

Why this shape:

- It tags whatever units of those classes exist in the current age's database:
  base game, every DLC civ/leader pack, independent-power units, and any units
  a future patch adds. There is nothing to update per release.
- Non-combat units are tagged but hidden by default. The second statement
  tags Settlers, Migrants, Merchants, Great People, Commanders and other
  non-combat units. The Civilian Units option starts off, and while it is off
  `ui/uae-unit-actions.js` keeps the action out of their unit panel. Aircraft
  are never tagged; `scripts/validate-sql.mjs` fails if `DOMAIN_AIR` appears.
- `INSERT OR IGNORE` skips units that already carry the tag (they collide on
  the `TypeTags (Tag, Type)` primary key), so there is no duplicate-row load
  error and no exclusion list to maintain.
- It runs on new games and loaded saves. The action group uses `AlwaysMet`, so
  the patch executes whenever game scope initializes, including save loads. A
  high `LoadOrder` (9999) puts it after all unit types have been inserted.
- The `SANDBOX` filter drops the engine test units (`UNIT_SANDBOX`,
  `UNIT_AUDIO_SANDBOX_*`), which never appear in normal play.

Before each grant, a marker statement gives `UNIT_CLASS_UAE_GRANTED` to the
units that grant is about to tag and that don't have the tag yet, for the map
lens above. The marker's `Tags` row goes in first, and every row selects
through its parent table, so a unit missing from a player's game is skipped.
No game screen lists unit tags, so the marker doesn't show up anywhere.

`UNIT_CLASS_AUTOEXPLORE`, the `Units`/`TypeTags` table names, the
`FORMATION_CLASS_*` values, and `AGE_*` are engine-owned identifiers and are
left unchanged. Renaming them would break the effect. The mod id, file names,
action-group id, text keys and author are this mod's own.

## Layout

```
universal_auto-explore/
  universal-auto-explore.modinfo   # mod manifest
  data/grant-autoexplore.sql       # the set-based tag patch
  data/uae-civilopedia.xml         # Civilopedia page: Game Concepts > Combat > Automate Exploration
  ui/uae-options.js                # the Options rows (groups and per-unit lists)
  ui/uae-unit-actions.js           # hides the action in the unit panel for groups/units turned off
  ui/uae-unit-lens.js              # keeps the default lens for units the mod tagged
  ui/uae-lens-keep.js              # the lens logic, loaded by uae-unit-lens.js
  ui/uae-settings.js               # saved settings (shared modSettings key + per-save copy)
  ui/uae-unit-classes.js           # which group a unit belongs to
  ui/uae-mod-options.js            # registers the shared "Mods" Options category
  text/en_us/ModuleText.xml        # name, description and Civilopedia text (source of truth)
  text/<lang>/ModuleText.xml       # the ten translations; text/README.md explains them
  tests/                           # translation, Civilopedia, options and lens checks (npm run verify)
  README.md  README.pdf            # this document
  CHANGELOG.md                     # release history (drives the Steam change note)
  CONTRIBUTING.md  LICENSE         # contributor guide + MIT license
  release.sh                       # build the Workshop package
  steam_workshop_id.txt            # publishedfileid, written on first publish
  images/
    universal-auto-explore-icon.svg  # mod icon
  docs/
    steam-workshop-description.txt       # Workshop page text (BBCode)
    steam-workshop-description.md        # full Steam store copy (BBCode)
    steam-workshop-description-short.md  # short Steam store copy (BBCode)
    workshop-preview.svg  workshop-preview.png  # Steam preview card
    BACKLOG.md                           # audit findings and what was decided
    dig-site-design.md                   # design for sending Explorers to dig sites (not built)
    lens-design.md                       # the Discovery-lens switch and its fix
  scripts/
    build_readme_pdf.sh            # regenerate README.pdf
```

Only the modinfo, `data/`, `text/`, `ui/`, README, CHANGELOG, and LICENSE ship
in the Workshop zip; `docs/`, `images/`, `scripts/`, and the release tooling are
repo-only (excluded by `release.sh`).

## Translations

The mod's name, description, Civilopedia page and Options text ship in English
and the game's ten other languages: German, Spanish, French, Italian, Japanese,
Korean, Polish, Portuguese (Brazil), Russian and Simplified Chinese. They use
the game's own words for its terms, such as the Automate Exploration action;
corrections from native speakers are welcome. To
fix or add a language, see [`text/README.md`](text/README.md).

## Publishing to Steam Workshop

`release.sh` builds and audits the package. It does not upload; that needs your
Steam login.

1. Bump `<Version>` in the modinfo and add a matching `## [x.y.z]` section to
   `CHANGELOG.md`.
2. Run `./release.sh`. It writes `dist/`:
   - `universal-auto-explore-vX.Y.Z.zip`: the mod, modinfo at the zip root
     (also fine for manual install / CivMods).
   - `dist/universal_auto-explore/`: the upload content folder.
   - `preview.png`: 1024×1024 card rendered from `docs/workshop-preview.svg`
     (needs `rsvg-convert`; `brew install librsvg`).
   - `workshop_item.vdf`: the steamcmd manifest (appid `1295660`).
3. Upload with the command the script prints:
   ```
   ~/steamcmd/steamcmd.sh +login <yourSteamLogin> \
       +workshop_build_item <abs-path>/dist/workshop_item.vdf +quit
   ```
4. The first upload creates the item and prints a `publishedfileid`. Save it:
   `echo <publishedfileid> > steam_workshop_id.txt`. Later runs then upload in
   update mode and generate the Steam change note from the current
   `CHANGELOG.md` section.

## Notes

- Tested on Civilization VII **1.5.0**: the crash soak of 2026-10-01, and 1.2.1
  watched in game alone and with the other Tower mods. Because the effect is
  set-based, it doesn't need re-checking against each patch's unit roster.

## Civilopedia History Corrections

This mod also carries Civilopedia History Corrections, a text patch for
[Civilopedia Expanded: Independents](https://steamcommunity.com/sharedfiles/filedetails/?id=3815309882). With that mod
on, six East Asian history pages (Goguryeo, the Oirat, two Ryukyu pages, Nanzhao and Balhae) give each side where
historians in different countries disagree, and a few factual errors are fixed. With it off, the game's pages stay as
they are. The text is in `history-corrections/`, in English, Simplified Chinese and Traditional Chinese. Every Tower mod
that carries it writes the same text, so running several of them together is fine.
