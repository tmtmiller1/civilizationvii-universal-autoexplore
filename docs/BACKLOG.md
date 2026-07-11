# Backlog

Open items not yet addressed. Findings from the 2026-07-10 corpus bug-hunt audit unless
noted. The SQL audited correct against the shipped 1.4.1 schema (column→value mapping,
`(Tag,Type)` PK dedupe, LoadOrder, `AlwaysMet`). Two low-severity notes.

## [Low · Plausible] `INSERT OR IGNORE` does not suppress the FK-constraint violation

**Site:** the `TypeTags` INSERT in `data/grant-autoexplore.sql`; schema
`TypeTags.Tag` has an enforced FK → `Tags(Tag)` (`01_GameplaySchema.sql:3935`)
**Symptom:** SQLite's `OR IGNORE` suppresses uniqueness/PK conflicts but **not** FK
violations. If this ever runs against an age/DLC database that lacks the
`UNIT_CLASS_AUTOEXPLORE` Tag row, the whole file errors (not silently skipped).
**Failure scenario:** safe in practice — base defines the tag in every age (Scouts exist
throughout) — but the mod's comment implies `OR IGNORE` covers all conflicts, which is
untrue for the FK.
**Fix:** guard the tag's existence (or `INSERT OR IGNORE` the `Tags` row first) if the mod
is ever expected to load against a DB that might not define it.

**DECISION: not implemented — the guard is riskier than the (unreachable) bug it fixes.**
Verified the real 1.4.1 `Tags` schema
(`civilization_vii_1.4.1_game_files/.../01_GameplaySchema.sql:3694`):
```sql
CREATE TABLE 'Tags' ( 'Tag' TEXT NOT NULL, 'Category' TEXT NOT NULL,
  'Hash' INTEGER NOT NULL UNIQUE DEFAULT 0, PRIMARY KEY("Tag"),
  FOREIGN KEY ("Category") REFERENCES "TagCategories"("Category") ... );
```
So a guard `INSERT INTO Tags` needs a `Category` that ITSELF satisfies an FK to
`TagCategories` — i.e. the *exact* category the base uses for `UNIT_CLASS_AUTOEXPLORE`. That
value lives in packed game **data** (`.car`/`.dep`), which is not in the available files dump
(only the schema is), so it can't be verified here. A wrong category would fail the
`TagCategories` FK and **break loading** — a real, reachable regression traded for a bug that
is unreachable in every shipped age (base always defines the tag). Net-negative; left as-is.
**Re-open only if** the tag's category can be confirmed from packed data, or the mod is ever
intended to ship against a DB known to lack the tag. (Original speculative design below used a
guessed category `'AI'` — do NOT use it unverified.)

~~**Design:** prepend a self-sufficient tag row … `INSERT OR IGNORE INTO Tags (Tag, Category)
VALUES ('UNIT_CLASS_AUTOEXPLORE', 'AI');`~~ — superseded; the `'AI'` category is a guess and
would break loading if wrong. Low priority — base defines the tag in every shipped
age. **Verify:** the mod loads without a DB error; Scouts and other units still receive the
auto-explore command.

## [Low · Plausible] Grants auto-explore to every `KIND_UNIT`, including non-combat units

**Site:** the `SELECT` over `Types` in `data/grant-autoexplore.sql`
**Symptom:** the command is granted to all `KIND_UNIT` — settlers, migrants, merchants,
army commanders, naval, air, religious units — not just military scouts.
**Failure scenario:** not a correctness defect (the civilian/commander grants only add an
optional command the player must click; no automatic AI behavior change), but a foot-gun:
auto-exploring a lone Settler or a packed Army Commander.
**Fix:** exclude non-combat/support units from the grant only if that UX is undesired; no
unit strictly needs exclusion for correctness.

**Design (keep + document — recommended):** leave the broad grant as-is; the mod's purpose is
"universal" auto-explore and the civilian/commander grants only add an *optional*
player-clicked command (no automatic AI behavior change). Document the intent in a SQL
comment so the breadth is clearly deliberate rather than accidental. **Optional opt-out
variant** if the foot-gun UX is later undesired: narrow the `SELECT` with a `WHERE` that
excludes support/civilian kinds, e.g.
`... FROM Types WHERE Kind = 'KIND_UNIT' AND Type NOT IN (SELECT UnitType FROM Unit_... /* civilian/support classes */)`
— the exact exclusion set (settlers, migrants, merchants, army commanders, religious, air)
would be sourced from the `Units`/`Unit_...` tables. Keep this as a documented alternative,
not the default. **Verify:** default build still tags all `KIND_UNIT`; the intent comment is
present.
