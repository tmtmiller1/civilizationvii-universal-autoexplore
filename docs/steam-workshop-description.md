[h1]Universal Auto Explore[/h1]

[b]Built for Civilization VII 1.4.1[/b]
Universal Auto Explore grants the game's built-in auto-explore action to every unit, not only Scouts. It is a small, data-only mod with a single purpose.

It exists for two reasons. Earlier auto-explore mods were not updated for 1.4.1, and they granted the action by listing unit types by hand — an approach that misses new, DLC, and unique units and needs maintenance after every patch. This mod applies the action with one set-based database rule that tags every unit at load time, so coverage is complete and does not require per-patch updates unless something more structural changes.

[b]What it does:[/b]
[list]
[*]Adds the standard auto-explore action to every unit, so any unit can be directed to reveal terrain on its own until it runs out of map or receives new orders.
[*]Leaves units that already have the action (Scouts, most warships, and some unique units) unchanged.
[*]Adds no panels, buttons, or screens.
[/list]

[b]Coverage:[/b]
[list]
[*]The base game across all three ages: Antiquity, Exploration, and Modern.
[*]All owned DLC civilization and leader packs.
[*]Independent-power units and units acquired through capture.
[*]Units introduced by later patches, without a mod update.
[/list]

[b]How it works:[/b]
[list]
[*]A single SQL statement tags every unit type present in the active age's database, rather than enumerating units individually.
[*]The statement is additive and idempotent (INSERT OR IGNORE): it never conflicts with units that already have the action, and never removes or overwrites existing data.
[*]It runs late in load order, after base, age, and DLC units are defined, which is why coverage is complete regardless of which content is enabled.
[/list]

[b]What it does not do:[/b]
[list]
[*]It does not change gameplay balance.
[*]It does not alter movement, combat, or unit costs.
[*]It does not replace base-game files.
[/list]

[b]Compatibility:[/b]
[list]
[*]Data-only and additive; safe to add to an in-progress game.
[*]No base-game file replacement.
[*]Requires only the base game. No DLC is required, and all DLC is supported.
[/list]

[b]Installation:[/b]
[list=1]
[*]Subscribe to the mod, or place the [b]universal_auto-explore[/b] folder in the Civilization VII Mods directory.
[*]Enable Universal Auto Explore under Additional Content.
[*]Start or load a game.
[/list]

[b]Source:[/b] https://github.com/tmtmiller1/civilizationvii-universal-autoexplore

[b]Credits:[/b]
[list]
[*]Tower — Civilization VII implementation.
[/list]
