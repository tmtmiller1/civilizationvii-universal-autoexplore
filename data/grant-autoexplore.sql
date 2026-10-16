-- Universal Auto Explore
--
-- Grants the auto-explore action by tagging units UNIT_CLASS_AUTOEXPLORE, which is what the game checks. Tagging
-- is set-based rather than a per-unit list, so it covers the base game, every DLC civ/leader pack,
-- independent-power units and whatever a later patch adds, in every age and mod combination, with nothing to
-- maintain.
--
-- Two grants. The first covers combat and recon units by FormationClass (recon, land combat, naval) and skips
-- city-founders. The second, at the end of the file, covers non-combat units for the Options screen's Civilian
-- group. Aircraft get neither.
--
-- INSERT OR IGNORE: units that already carry the tag (Scouts, most warships and a handful of uniques) collide on
-- the (Tag, Type) primary key and are skipped, so there is no duplicate-row load error.
--
-- UNIT_SANDBOX / UNIT_AUDIO_SANDBOX_* are engine test units that never appear in normal play, so they are left
-- out.
--
-- Before each grant, a marker statement gives UNIT_CLASS_UAE_GRANTED to the units that grant is about to tag, the
-- ones that don't carry UNIT_CLASS_AUTOEXPLORE yet. ui/uae-unit-lens.js reads the marker so those units keep the map
-- lens the game would pick for them, while the game's own explorers still open the Discovery lens. The marker's Tags
-- row goes in first: TypeTags.Tag has a foreign key to Tags, and one bad row there stops every mod loading. Every row
-- selects through its parent table, so a missing parent skips the row instead of failing the load. No game UI lists
-- UNIT_CLASS tags, so the marker doesn't show up as text anywhere.

INSERT OR IGNORE INTO Tags (Tag, Category)
SELECT 'UNIT_CLASS_UAE_GRANTED', c.Category
FROM   TagCategories c
WHERE  c.Category = 'UNIT_CLASS';

INSERT OR IGNORE INTO TypeTags (Type, Tag)
SELECT u.UnitType, t.Tag
FROM   Units u
JOIN   Tags t ON t.Tag = 'UNIT_CLASS_UAE_GRANTED'
WHERE  u.FormationClass IN (
           'FORMATION_CLASS_RECON',
           'FORMATION_CLASS_LAND_COMBAT',
           'FORMATION_CLASS_NAVAL'
       )
  AND  u.FoundCity = 0
  AND  u.UnitType NOT LIKE '%SANDBOX%'
  AND  NOT EXISTS (SELECT 1 FROM TypeTags x WHERE x.Type = u.UnitType AND x.Tag = 'UNIT_CLASS_AUTOEXPLORE');

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

-- Non-combat units: Settlers, Migrants, Merchants, trade caravans and ships, Missionaries, Great People, Commanders
-- and the like, on land and at sea, as in 1.0.0-1.0.2. They carry the tag so the Options screen's Civilian group can
-- offer them the action; the group starts off, and while it is off ui/uae-unit-actions.js keeps the action out of
-- their unit panel. 1.0.3 had removed these units over a reported crash; crash-soak runs on 2026-10-01 with every
-- unit type tagged and dozens of non-combat units auto-exploring each turn did not reproduce it.
INSERT OR IGNORE INTO TypeTags (Type, Tag)
SELECT u.UnitType, t.Tag
FROM   Units u
JOIN   Tags t ON t.Tag = 'UNIT_CLASS_UAE_GRANTED'
WHERE  u.CoreClass IN ('CORE_CLASS_CIVILIAN', 'CORE_CLASS_SUPPORT')
  AND  u.Domain IN ('DOMAIN_LAND', 'DOMAIN_SEA')
  AND  u.UnitType NOT LIKE '%SANDBOX%'
  AND  NOT EXISTS (SELECT 1 FROM TypeTags x WHERE x.Type = u.UnitType AND x.Tag = 'UNIT_CLASS_AUTOEXPLORE');

INSERT OR IGNORE INTO TypeTags (Type, Tag)
SELECT u.UnitType, 'UNIT_CLASS_AUTOEXPLORE'
FROM   Units u
WHERE  u.CoreClass IN ('CORE_CLASS_CIVILIAN', 'CORE_CLASS_SUPPORT')
  AND  u.Domain IN ('DOMAIN_LAND', 'DOMAIN_SEA')
  AND  u.UnitType NOT LIKE '%SANDBOX%';
