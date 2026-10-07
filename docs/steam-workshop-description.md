[h1]Universal Auto Explore[/h1]

[b]Built for Civilization VII 1.4.1[/b]
Universal Auto Explore gives the game's built-in Automate Exploration action to every military unit on land and at sea, not only Scouts. Civilian units and Commanders can have it too, behind an option that starts off. It is a small mod with a single purpose.

It exists for two reasons. Earlier auto-explore mods were not updated for 1.4.1, and they granted the action by listing unit types by hand, which misses new, DLC and unique units and needs a fix after every patch. This mod applies the action with set-based database rules that tag every unit at load time, so coverage is complete and a patch that adds units needs no mod update.

[b]What it does:[/b]
[list]
[*]Adds the standard auto-explore action to every military unit, so any of them can be sent to reveal terrain on its own until it runs out of map or gets new orders.
[*]Leaves units that already have the action (Scouts, most warships and some unique units) unchanged.
[*]Adds a block under Options > Add-ons to turn the action off for a group of units or a single unit. Nothing else on screen changes.
[/list]

[b]Coverage:[/b]
[list]
[*]The base game across all three ages: Antiquity, Exploration and Modern.
[*]All owned DLC civilization and leader packs.
[*]Independent-power units and units acquired through capture.
[*]Units introduced by later patches, without a mod update.
[/list]

[b]How it works:[/b]
[list]
[*]Set-based SQL tags every unit type of the right classes in the active age's database, instead of naming units one by one.
[*]The statements are additive and idempotent (INSERT OR IGNORE). They never conflict with units that already have the action and never remove or overwrite existing data.
[*]They run late in load order, after base, age and DLC units are defined, which is why coverage is complete whatever content is enabled.
[/list]

[b]What it does not do:[/b]
[list]
[*]It does not change gameplay balance.
[*]It does not alter movement, combat or unit costs.
[*]It does not replace base-game files.
[/list]

[b]Compatibility:[/b]
[list]
[*]Additive, and safe to add to a game in progress.
[*]No base-game file replacement.
[*]Requires only the base game. No DLC is required, and all DLC is supported.
[/list]

[b]Installation:[/b]
[list=1]
[*]Subscribe to the mod, or place the [b]universal_auto-explore[/b] folder in the Civilization VII Mods directory.
[*]Enable Universal Auto Explore under Additional Content.
[*]Start or load a game.
[/list]

[h2]Source and documentation[/h2]
[list]
[*][b]Full documentation:[/b] [url=https://github.com/tmtmiller1/civilizationvii-universal-autoexplore/blob/main/README.md]how the mod works[/url]
[*][b]The same as a PDF:[/b] [url=https://github.com/tmtmiller1/civilizationvii-universal-autoexplore/blob/main/README.pdf]README.pdf, typeset with the screenshots[/url]
[/list]
[h2]For modders[/h2]
This mod is developed with [url=https://github.com/tmtmiller1/civilizationvii_tower-bench]Tower Bench[/url], a free, open-source test bench for Civilization VII mods. It connects to a running game from your browser or the command line: inspect and change the map with every write verified and undoable, diff the world between two turns, check that the deployed code is what the game runs, find which mod causes a crash, and see which copy of each mod is loaded.
[h2]Credits[/h2]
[list]
[*][b]Tower[/b], for design and Civilization VII implementation.
[/list]
[h2]Special Thanks[/h2]
[list]
[*][b]Potato McWhisky[/b], for teaching me to love again, Civilization-wise (Civ VI), after growing up as a Civilization II, IV, and V player. Making this mod is an act of faith that the community will eventually help make Civilization VII as good as the previous entries.
[/list]
