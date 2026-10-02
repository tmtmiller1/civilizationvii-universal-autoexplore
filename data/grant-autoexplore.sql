-- Universal Auto Explore
-- ---------------------------------------------------------------------------
-- Grant the auto-explore action to every EXPLORE-CAPABLE unit in the game.
--
-- The game enables auto-explore on units carrying the UNIT_CLASS_AUTOEXPLORE
-- type tag. We tag units set-based (rather than a per-unit XML list) so we
-- cover base game, every DLC civ/leader pack, independent-power units, and any
-- units added by future patches -- with zero per-unit maintenance, correct for
-- every age and mod combination.
--
-- SCOPE: two grants. The first covers combat and recon units by FormationClass (recon, land combat, naval) and
-- skips city-founders. The second, at the end of the file, covers non-combat units for the Options screen's
-- Civilian group. Aircraft get neither.
--
-- INSERT OR IGNORE: units that already carry the tag (Scouts, most warships,
-- and a handful of uniques) hit the (Tag, Type) primary key and are silently
-- skipped -- no duplicate-row load error.
--
-- SANDBOX exclusion: UNIT_SANDBOX / UNIT_AUDIO_SANDBOX_* are engine test units
-- that never appear in normal play; tagging them is pointless noise.

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
-- their unit panel. 1.0.3 removed these units over a reported crash; soak runs on 2026-10-01 with every unit type
-- tagged and 40+ non-combat units auto-exploring each turn (two seeds, 60 turns, plus a reloaded save) did not crash.
INSERT OR IGNORE INTO TypeTags (Type, Tag)
SELECT u.UnitType, 'UNIT_CLASS_AUTOEXPLORE'
FROM   Units u
WHERE  u.CoreClass IN ('CORE_CLASS_CIVILIAN', 'CORE_CLASS_SUPPORT')
  AND  u.Domain IN ('DOMAIN_LAND', 'DOMAIN_SEA')
  AND  u.UnitType NOT LIKE '%SANDBOX%';
