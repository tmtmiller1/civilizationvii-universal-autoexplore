# Contributing

Thanks for your interest. Universal Auto Explore is a small Civilization VII
mod: two SQL statements, a Civilopedia page, localized text and a few UI
scripts for the Options rows. This doc covers the layout, the checks to run
before you submit, and the conventions it follows.

## No build step

What ships is exactly the files in the repo. The game applies `data/*.sql` and
`data/*.xml` through the modinfo's `<UpdateDatabase>` action, loads
`text/**/ModuleText.xml` through `<UpdateText>`, and runs the `ui/*.js` modules
as written. There is no transpile or bundling.

Prefer a set-based SQL change over hand-listing unit types, and keep the UI to
what the database cannot express (the Options rows and the unit-panel filter).

## Before you submit

`npm run verify` runs ESLint on `ui/`, the SQL contract check
(`scripts/validate-sql.mjs`) and the Node tests under `tests/` (translations,
the Civilopedia page, the Options groups and settings). `./release.sh` runs the
same gate before packaging.

- Every `.xml` / `.modinfo` file must be well-formed. `./release.sh` checks this
  while packaging; you can also run it directly:
  ```sh
  python3 -c 'import sys,xml.dom.minidom as m; m.parse(sys.argv[1])' <file>
  ```
- The SQL must be idempotent and non-destructive. Use `INSERT OR IGNORE` rather
  than a bare `INSERT` that can collide on a primary key, and never `DELETE` or
  `UPDATE` data another mod may own.

## Conventions

- Engine-owned identifiers stay as they are. `UNIT_CLASS_AUTOEXPLORE`, the
  `Units`/`TypeTags` table names and the `FORMATION_CLASS_*` and `CORE_CLASS_*`
  values are the game's tokens. Only mod-owned identifiers (mod id, action-group
  id, criteria id, LOC keys) are ours to name.
- Late, additive load. The tag patch runs at a high `LoadOrder` under an
  `AlwaysMet` criterion, so it applies on both new games and loaded saves, after
  all unit types (base, age and DLC) are in the database, and only ever adds
  the tag.
- Localization. Player-facing strings are LOC keys under
  `text/<locale>/ModuleText.xml`; `en_us` is the source and the fallback, and
  `text/README.md` covers the translations.
- Comments explain why (engine quirks, load-order reasoning), not what.

## Project layout

```
universal-auto-explore.modinfo   mod manifest (one late, AlwaysMet UpdateDatabase action)
data/grant-autoexplore.sql       the set-based tag patch
data/uae-civilopedia.xml         Civilopedia page
ui/                              Options rows, unit-panel filter, saved settings
text/<lang>/ModuleText.xml       display name, description, Civilopedia and Options text
tests/                           Node tests (npm test)
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
