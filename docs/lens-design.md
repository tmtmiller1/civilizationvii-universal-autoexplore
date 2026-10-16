# Selecting a unit switches the map to the Discovery lens

Status: design A is built (`data/grant-autoexplore.sql`, `ui/uae-unit-lens.js`, `ui/uae-lens-keep.js`) and tested
offline; not yet watched in game. The disproof is done: in the lab game of 2026-10-15 (1.5.0, seed 4242,
`working_screenshots/lab-probes-2026-10-15b/NOTES.md`, probe 4a and launch 8) a Warrior, a Missionary and a
Trebuchet switched to the Discovery lens with the mod on, with the usual set and with the mod alone, and the Warrior
and Missionary kept the default lens with it off.

As built, the marker statements add one detail to step 1 below: the `Tags` row selects through `TagCategories`, and
each marker row joins `Tags`, so a missing parent skips the row. The wrapper's logic sits in `ui/uae-lens-keep.js`,
which imports nothing, so `tests/lens-keep.test.mjs` runs it against a stand-in handler and `LensManager`. It also
keeps a `setUnitLens` another mod put on the handler instance before it, and calls that instead of the prototype's.
No game screen lists `UNIT_CLASS` tags (the only tag names the UI shows are the constructible ones in
`base-standard/ui/utilities/utilities-tags.js`, from a fixed list), so the marker stays in the `UNIT_CLASS` category
and no `TagCategories` row was needed. Steps 1 to 3 of "Still owed" are done; 4 and 5 become the lab checks on the
built code.

## What was watched

Lab game of 2026-10-15 (`working_screenshots/lab-probes-2026-10-15/NOTES.md`, probe 3a): Civilization VII 1.5.0, seed
4242, Antiquity, the usual set of 16 Tower mods with every other user mod off and all DLC on. A Warrior was placed with
`tower-bench place unit UNIT_WARRIOR 66 13` and selected with `UI.Player.selectUnit`, the call a click makes.

- Before the selection the lens was `fxs-default-lens`. After it, `fxs-discovery-lens`, in
  `INTERFACEMODE_UNIT_SELECTED`. Three times out of three.
- The Warrior's tags include `UNIT_CLASS_AUTOEXPLORE`, and its panel offers Automate Exploration.
- The Founder carries the same tag and got `fxs-founder-lens`.
- Capture: `working_screenshots/lab-probes-2026-10-15/uae-usualset-antiquity-warrior-selected-discovery-lens.png`.

Not run: the mod off (the actual control), a vanilla game, and any non-combat unit such as a Missionary.

## Why it happens, from the 1.5.0 files

`base-standard/ui/interface-modes/interface-mode-unit-selected.js` (under
`civilization_vii_1.5.0_game_files/Resources/Base/modules/`):

- At load (`:7-19`) it builds `autoExploreUnits` from every `TypeTags` row tagged `UNIT_CLASS_AUTOEXPLORE`, plus,
  in the Exploration Age only, every `FORMATION_CLASS_NAVAL` unit. The list is a module constant and isn't exported.
- `setUnitLens` (`:105-134`) picks the lens on each selection, first match wins: a unit that founds cities gets the
  founder or settler lens, a trade unit the trade lens, an artifact unit in the Modern Age the continent lens, a unit
  in `autoExploreUnits` the Discovery lens, and everything else the default lens.

Without the mod 35 types carry the tag across the base game and DLC: the Scout, Chasqui, Sherpa, Jaguar Slayer and
Tehina, most Exploration and Modern warships, and some unique ships. The Antiquity warships (Galley, Quadrireme, Dhow,
Kalia) and the Submarine don't. The mod's two SQL statements add the tag to every land and naval combat and recon
unit and every non-combat unit on land or at sea; in the 15:07 Antiquity compile of that game 118 types carry it. So
with the mod on, the Discovery lens should open for land military units, the warships the game leaves untagged, and
non-combat units that don't found cities, make trade routes or dig up artifacts (Migrants, Missionaries, Great
People, Commanders, trade ships). In the Exploration Age every warship opens it anyway, mod or not.

The Options screen can't help. It hides the action in the unit panel, but the tag comes from the gameplay database,
which is built before any setting can be read, so a unit the player turned off still switches the lens.

Map Trix (bz) reads the same tag. `ui/mini-map/bz-panel-mini-map.js` builds its `reconUnits` set from
`UNIT_CLASS_AUTOEXPLORE` and patches `setUnitLens` on the handler's prototype to open its commander lens. With this
mod on, Map Trix counts every tagged land military unit as recon, so its "Military Units" commander-lens setting
stops covering them and "Military and Recon Units" covers them as recon. A fix in this mod's UI doesn't reach Map
Trix's set. Map Trix wasn't loaded in the lab game.

## Ways to keep auto-explore without the lens switch

The engine offers `UNITOPERATION_AUTOMATE_EXPLORE` to units with the tag; that's how the mod has worked since
1.0.0. The operation's data row (`base-standard/data/unit-operations.xml:88`) carries only display fields (name,
icon, hotkey, priority), so the check can't come from there. The tag has to stay, and the fix has to change what the
lens code does with it.

### A. Mark the units the mod tagged, and keep their lens as the game would pick it (recommended)

1. Data. Before the two grants, the SQL gives a mod-owned tag such as `UNIT_CLASS_UAE_GRANTED` to each unit a grant
   is about to tag, the ones that lack `UNIT_CLASS_AUTOEXPLORE` at that point: one marker statement per grant, with
   the grant's own `WHERE` plus a `NOT EXISTS` on the tag. The new tag needs a `Tags` row first
   (`INSERT OR IGNORE INTO Tags (Tag, Category) VALUES ('UNIT_CLASS_UAE_GRANTED', 'UNIT_CLASS')`; the `OnTagInsert`
   trigger fills `Hash`). `TypeTags.Tag` has a foreign key to `Tags`, so the order matters: a marker row ahead of its
   `Tags` row fails the whole load. Every row selects through `Units`, so a missing DLC unit skips its row.
2. UI. A new `ui/uae-unit-lens.js`, listed in the game scope, builds the set of marked types from `GameInfo.TypeTags`
   once at load, leaving out warships in the Exploration Age, which the game sends to the Discovery lens whatever
   their tags. After `engine.whenReady` it takes the handler with
   `InterfaceMode.getInterfaceModeHandler("INTERFACEMODE_UNIT_SELECTED")` and puts its own `setUnitLens` on that
   instance. For an unmarked unit it calls the prototype's `setUnitLens` as is. For a marked unit it calls the same
   method with `LensManager.setActiveLens` swapped, for that one call, for a version that turns
   `fxs-discovery-lens` into `fxs-default-lens`, and puts the original back in a `finally`.
   - The prototype method is looked up at call time, so Map Trix's prototype patch still runs first and keeps its
     commander and religion lenses, whichever mod loads first.
   - The lens is set once, so the map goes straight to the default lens without a frame of the Discovery layer.
   - Scouts, warships the game already tags, Settlers, Merchants and Modern artifact units keep their lens, because
     they're either unmarked or matched before the Discovery branch.
   - Wrapping `LensManager.setActiveLens` for good would be shorter, but Map Trix lets the player pick the Discovery
     lens from the mini-map (`FXS_USER_CONFIG_LENSES`), and a permanent wrap would take that away.

What it costs:

- About 50 lines of UI, three SQL statements, a `validate-sql.mjs` check that the `Tags` row comes before the
  marker rows, and Node tests for the marked-set builder and the swapped call (a fake handler and `LensManager`).
- At run time a selection costs one `Set` lookup. The set is built once from the database, and the settings store
  isn't read.
- A new `UNIT_CLASS` tag may show up wherever the game lists unit tags. The lab has to check the unit's Civilopedia page
  and its info panel for a raw `UNIT_CLASS_UAE_GRANTED`. A tag category of the mod's own avoids that, at the price of
  a `TagCategories` row.
- If a patch renames `setUnitLens` or `getInterfaceModeHandler`, the wrapper can't find its target, logs one line and
  leaves the lens switch as it is now. If another mod replaces the handler with `addHandler` after this ran, the new
  handler runs without the wrapper, with the same result.
- Translations: only if it gets an option (D).

### B. Copy `setUnitLens` without the mod's units

Replace the handler's `setUnitLens` with a copy of the base method that uses the marked set from A to leave those
units out. It sets the lens once, like A. It needs A's data marker all the same, it copies base-game code that a
patch can change, and it skips Map Trix's prototype patch whenever this mod's copy runs instead. Worse than A on
every count.

### C. Switch back after the game switches

Call the original `setUnitLens`, and if the unit is marked and the lens is now `fxs-discovery-lens`, set
`fxs-default-lens`. Simplest UI code, but the lens is set twice per selection, which may show the Discovery layer for
a frame and costs a second lens rebuild. Also needs A's marker.

### D. Let the player choose

A, plus a checkbox in the mod's Options block, "Open the Discovery lens for units that can auto-explore", starting
off so the game behaves as it does without the mod. Some players may like the Discovery lens on every explorer. Costs
one Options row, one settings key (read through the kept values in `uae-settings.js`) and the text in eleven
languages. The owner decides whether it's worth it and which way it starts.

### E. Leave it and say so

The README describes the switch now. This costs nothing to keep, and the Discovery lens is a working lens, just not
the one the game picks for that unit without the mod. This is where things stand until the disproof is done.

A data-only fix isn't possible: the tag has to stay (it's the engine's check), and the database is built before any
player setting can be read, so it can't follow the Options screen.

## Still owed, cheapest first

1. **The mod off.** Same seed and set, Universal Auto Explore switched off: place a Warrior, select it with
   `UI.Player.selectUnit`, read `LensManager.getActiveLens()`. Expected `fxs-default-lens`. If it reads
   `fxs-discovery-lens` with the mod off, the mod isn't the cause and this design can be dropped.
2. **Vanilla.** Every other user mod off, Universal Auto Explore on: the same Warrior reads `fxs-discovery-lens`
   (another mod isn't part of it). Then everything off: `fxs-default-lens`.
3. **Which units.** Mod on, one each: a Missionary or Migrant, an Army Commander, a Galley in Antiquity, a Settler
   (expected settler lens), a Scout (expected Discovery, as without the mod).
4. **Before building A.** One script in a lab game installs A's wrapper on the live handler with a hand-made marked
   set holding `UNIT_WARRIOR`, then selects the Warrior (expected default lens), a Scout (Discovery) and the Founder
   (founder lens). That shows the instance wrap reaches the selection before any data change.
5. **With Map Trix.** Once its Workshop folder is switched back on (owner): the commander-lens settings with and
   without this mod, before and after A.
