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
-- SCOPE (why we filter by FormationClass):
--   The base-game auto-explore AI is only built for recon/combat land + naval
--   units (Scouts and warships). Tagging units it was never designed to drive
--   -- Settlers/Migrants/Merchants/Founders (CIVILIAN), Army/Fleet Commanders
--   (COMMAND), and aircraft (AIR) -- makes the native explore-pathing worker
--   dereference a null on those unit types and hard-crash the game (SIGSEGV,
--   deterministic, mid-AI-turn). So we restrict the grant to the three
--   explore-capable formation classes and skip city-founders defensively.
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
