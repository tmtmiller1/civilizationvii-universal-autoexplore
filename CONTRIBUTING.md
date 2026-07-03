# Contributing

Thanks for your interest. Universal Auto Explore is a small, data-only
Civilization VII mod. This doc covers the layout, the one check to run before you
submit, and the few conventions it follows.

## Data-only, no build step

The whole mod is one SQL patch plus localized text — there is **no JavaScript, no
transpile, and no build step**. What ships is exactly the files in the repo. Civ
VII applies the `data/*.sql` and `text/**/ModuleText.xml` files directly at load
time via the `<UpdateDatabase>` / `<LocalizedText>` actions in the modinfo.

Please keep it that way: prefer a set-based SQL change over hand-enumerating unit
types, and don't add a UI layer or a build pipeline for something the database can
express directly.

## Before you submit

There is no test suite, but the shipped XML/SQL must be valid:

- Every `.xml` / `.modinfo` file must be well-formed. `./release.sh` runs this
  check as part of packaging; you can also run it directly:
  ```sh
  python3 -c 'import sys,xml.dom.minidom as m; m.parse(sys.argv[1])' <file>
  ```
- The SQL must be idempotent and non-destructive. Use `INSERT OR IGNORE` (never a
  bare `INSERT` that can collide on a primary key), and never `DELETE`/`UPDATE`
  data another mod may own.

## Conventions

- **Engine-owned identifiers stay verbatim.** `UNIT_CLASS_AUTOEXPLORE`, the
  `Types`/`TypeTags` table names, `KIND_UNIT`, and `AGE_*` are the game's tokens —
  do not rename them. Only mod-owned identifiers (mod id, action-group id,
  criteria id, LOC keys) are ours to name.
- **Late, additive load.** The tag patch runs at a high `LoadOrder` under an
  `AlwaysMet` criterion so it applies on both new games and loaded saves, after
  all unit types (base, age, and DLC) are in the database, and only ever adds
  the capability.
- **Localization.** User-facing strings are LOC keys under
  `text/<locale>/ModuleText.xml` (`en_us` is the base/fallback).
- **Comments.** Explain *why* (engine quirks, load-order reasoning), not *what*.

## Project layout

```
universal-auto-explore.modinfo   mod manifest (one late, AlwaysMet UpdateDatabase action)
data/grant-autoexplore.sql       the single set-based tag patch
text/en_us/ModuleText.xml        display name + description
docs/                            Steam descriptions + workshop preview (not shipped)
images/                          mod icon (not shipped)
release.sh                       builds the Workshop zip + steamcmd manifest
```

## Releasing

`./release.sh` produces the upload zip and the steamcmd `workshop_item.vdf`. It
audits the zip against an allow-list so dev/docs files can't ship by accident. See
the "Publishing to Steam Workshop" section of the [README](README.md).

## License

MIT. See [LICENSE](LICENSE). By contributing you agree your changes are licensed
under the same terms.
