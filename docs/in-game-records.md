# In-game records

What was watched in a running game, run by run. Each entry says the setup and what was seen.

## 2026-10-16, watch run 2 block 1 L2: usual set, Antiquity, seed 4242

Game 1.5.0, windowed 1600x1000, all 16 Tower mods from their `Mods/` copies with each working tree deployed.

- Settings read once. A wrapper on `localStorage.getItem` counted "modSettings" reads by calling file. Three unit
  selections: 0 reads by any mod. A refresh through `uae-settings.js` `refreshSettings` read once, so the counter does
  catch UAE's reads. Each local turn start: 1 read. In Options, with the land-class box off, the Warrior's unit panel
  dropped `UNITOPERATION_AUTOMATE_EXPLORE` at the next selection; with it back on, the operation returned.
- A Warrior on Automate Exploration kept the order and moved on turns 6-8 (68,6 to 69,8 to 68,6), beside a Scout
  control that did the same. An earlier Warrior stopped after walking next to a Discovery, where `canStart` reads
  "There is a Discovery nearby!", the base game's rule. The vanilla side is in the V5 entry below.

## 2026-10-16, watch run 2 block 1 V5: UAE alone, Antiquity, seed 4242

Game 1.5.0, windowed 1600x1000, every other user mod off, UAE's `Mods/` copy with its working tree deployed. Run
`2026-10-16T18-31-48`.

- Lenses on selection: Founder `fxs-founder-lens`, Warrior `fxs-default-lens`, Scout `fxs-discovery-lens`, each back
  to `fxs-default-lens` on deselect.
- A Warrior and a Scout ordered to Automate Exploration at 65,5 and 66,5 kept the order (activity unchanged) and moved
  on turns 2-4: Warrior 68,6 to 69,8 to 68,6, Scout 67,6 to 68,7 to 67,7. So the vanilla side of "keeps exploring" is
  watched.
- Odd, not judged: on both sides the Warrior stepped back and forth between 68,6 and 69,8.
