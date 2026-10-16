# Sending Explorers to the nearest dig site

Status: design only; the code isn't written. A lab probe comes next (listing dig sites from script and sending an
Explorer to one), and the owner decides after reading this whether to build it.

## What players asked for

On the Workshop's "top 3 mods you'd love to see" thread, one player asked for "automated exploration and automated
relic excavation" (#27.3) and another for "Explorer auto find closest dig/research" (#55.2). Both mean the Modern Age
Explorer: the game's dig sites hold Artifacts, not relics, and only the Explorer (and Great Britain's Antiquarian)
can dig them up. Today the player finds each site on the map and walks the Explorer there by hand, one site after
another.

## How the game does it in 1.5.0

All of this is read from the 1.5.0 files under `civilization_vii_1.5.0_game_files/Resources/`. Paths below are under
`Base/modules/` except the one starting `DLC/`.

- **The unit.** `UNIT_EXPLORER` (`age-modern/data/units.xml:197`) is a land civilian with 2 moves, no Zone of
  Control and `ExtractsArtifacts="true"`. The Natural History civic unlocks it
  (`age-modern/data/progression-trees-culture-common.xml:87`). Great Britain's `UNIT_ANTIQUARIAN`
  (`DLC/great-britain/modules/data/units.xml:18`) is the only other unit with `ExtractsArtifacts`. Both exist only
  in the Modern Age.
- **Finding sites.** An Explorer standing on your Museum or University can use Research Artifacts
  (`UNITOPERATION_RESEARCH_ARTIFACTS`), described as "Find Ruin sites containing Artifacts on this Continent". The
  two buildings carry `ArchaeologyResearch` (`age-modern/data/constructibles.xml:178`,
  `age-exploration/data/constructibles.xml:165`). Each continent can be researched twice: its Exploration Age ruins
  first, then its Antiquity ruins after the Hegemony civic. The player's culture object reports where a continent
  stands: `Culture.getContinentResearchStatus`, `getNumAgesAvailableToResearch` and `getContinentRuralRuinCount`.
- **The dig site.** A site is an `IMPROVEMENT_RUINS` constructible on a plot. In Antiquity and Exploration that
  same improvement is a Discovery the first unit to enter clears. The Modern Age changes it to
  `Archaeology="true"`, `Discovery="false"`, `CanBeHidden="false"` and `RemoveOnEntry="false"`
  (`age-modern/data/constructibles.xml:124,201`), so it stays put until it's dug.
- **Digging.** On the ruin's plot the Explorer gets Excavate Artifact (`UNITOPERATION_EXCAVATE`, "Excavate a Great
  Work that can be displayed in a Museum"). It isn't a targeted operation: the unit panel sends it for the plot the
  unit stands on (`base-standard/ui/unit-actions/unit-actions.js:1062-1081`). Natural wonders can also hold an
  Artifact. The player's `Stats.hasNaturalWonderArtifact(featureType)` says which ones do, and an Explorer on or
  next to the wonder can study it.
- **What the player already sees.** Selecting an Explorer in the Modern Age switches the map to the continent lens
  (`base-standard/ui/interface-modes/interface-mode-unit-selected.js:126-127`), ahead of the Discovery-lens branch
  this mod's tag feeds. That lens walks every revealed plot, finds the ruins with
  `MapConstructibles.getHiddenFilteredConstructibles`, and puts an Excavate icon on each one, plus icons on
  Museums, Universities and natural wonders with work left (`base-standard/ui/lenses/layer/continent-layer.js:194-263`).
  The hover tooltip reads "This Ruin can be Excavated by an Explorer to obtain an Artifact."

## Can this mod find the nearest site and send the Explorer?

Finding sites, yes. The mod can do what the continent lens does: walk the revealed plots, keep those with an
`IMPROVEMENT_RUINS` whose Constructibles row has `Archaeology` set (that's what limits it to Modern dig sites), and
add natural wonders where `hasNaturalWonderArtifact` is true. Keying on `ExtractsArtifacts` and `Archaeology`, not on
unit or building names, means a DLC unit like the Antiquarian works, and a game without that DLC skips it. The scan
runs once per button press, never per frame.

Sending the move, yes, but with an operation this mod doesn't use yet. Today the mod only tags units in the database
and filters the unit panel's action list (`ui/uae-unit-actions.js`). The game's own button sends Automate
Exploration, so the mod has never sent an order itself. The base game shows how: the trade-route chooser sorts
target plots by `GameplayMap.getPlotDistance`, skips any where `Units.getPathTo(unit.id, plot).plots` comes back
empty, and sends the first good one through `WorldInput.requestMoveOperation`
(`base-standard/ui/trade-route-chooser/trade-route-chooser.js:411-451`). That's the same path a right-click takes,
so the move is an ordinary multi-turn Move To that the player can see and cancel.

Digging on arrival isn't something the game queues behind a move. The Explorer arrives, stops, and waits for the
player to press Excavate, which the game already offers right there. Digging without a click would need the mod to
watch for arrival (`UnitMoveComplete` or the next `PlayerTurnActivated`) and send `UNITOPERATION_EXCAVATE` itself.

The button itself fits the decorator the mod already has: `uae-unit-actions.js` wraps the panel's
`getUnitActions` and edits `panel.actions`, so pushing one more action object with a name, icon, category and
callback is how it would appear. The panel needs a valid `UICategory`, or it logs an error and leaves the button
out (`unit-actions.js:1566`).

## What the player sees

**First version: one button.** An Explorer in the Modern Age gets a **Go to Nearest Dig Site** button next to its
other actions, with the game's Excavate icon. Pressing it picks the closest ruin or natural wonder Artifact the
Explorer can reach, by path rather than straight-line distance among the nearest few, and sends it there. The game
draws the route as it does for any move, and the Explorer carries on over later turns until it arrives. Then the
player presses the game's own Excavate Artifact, and presses Go to Nearest Dig Site again for the next one.

- When the Explorer is already standing on a site, the button is greyed out and the game's Excavate button does the
  job.
- When no site is reachable, the button is greyed out with a tooltip: "This Explorer can't reach any dig site.
  Research Artifacts at a Museum or University to find more." If one of the player's Museums or Universities still has
  research left for its continent, the tooltip names that city instead, since that's the next useful trip.
- **Option:** an **Explorers: Go to Nearest Dig Site** checkbox in the mod's Options block. It starts **on**: it's a
  button the player has to press, so it never moves a unit without a click, and it has nothing to do with the
  Civilian Units group, which only controls Automate Exploration.

**Later, if the owner wants it: keep digging.** A second button, **Dig Until Done**, would mark the Explorer, and
at the start of each of the player's turns the mod would excavate if the Explorer stands on a site, then send it to
the next one, until none is left or the player gives it another order. This is the part that matches "automated
excavation", and it costs much more:

- The mod would send orders without a click, on the local player's turn only, and it'd have to stop at once when
  the player takes the unit back.
- The mark has to survive a save and load. The mod's settings live in the shared store and a per-save copy in
  `GameConfiguration`. A per-unit list would go in the same place, keyed by unit id, and be dropped for units that
  no longer exist.
- In multiplayer each order is an ordinary request from that player, the same as a click, but it should still be
  watched in a network game before shipping.

The research trip (send the Explorer to a Museum or University with research left) could join either version as a
fallback when no ruin is reachable. It's left out of the first version because each continent needs it only twice.

## What it costs

- About 150 to 250 lines of UI script for the first version: the plot scan, the nearest-path pick, the button and
  its tooltip, one Options row and its text in eleven languages, and tests for the pure parts (picking the nearest
  site from a list, the greyed-out cases).
- The plot scan touches every revealed plot. That's what the continent lens already does each time it opens, but
  its cost on a Huge map should be timed in the probe. If it's slow, the mod can keep the list current from
  `ConstructibleAddedToMap` and `ConstructibleRemovedFromMap` (both carry `location` and `constructibleType`)
  instead of scanning on each press.
- `Units.getPathTo` is a pathfinding call per candidate, so it runs for the nearest few by straight-line distance,
  not for every site on the map.
- It changes what the mod is: from tagging units and hiding a button to giving orders. The README and Workshop text
  would need a line about it.

## The probe

Run in a Modern Age lab game with an Explorer, before any code:

1. List every revealed `IMPROVEMENT_RUINS` from script with its plot, the Constructibles row's `Archaeology` value,
   and the plot owner. Time the scan.
2. List natural wonders where `hasNaturalWonderArtifact` is true.
3. For the nearest few, read `Units.getPathTo(explorer, plot)`: plot count and turns.
4. Send the Explorer to one with `WorldInput.requestMoveOperation` and watch it move, carry over to the next turn,
   and arrive.
5. On arrival, read `Game.UnitOperations.canStart(explorer, "UNITOPERATION_EXCAVATE", {X, Y}, false)`, and try a
   site inside another civilization's borders to see whether the game allows the dig there.
6. Push one test action into the unit panel through the existing decorator and check it draws and its callback
   fires.

Each step either backs this design or changes it; the build waits for those answers and the owner's go-ahead.
