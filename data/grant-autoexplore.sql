-- Universal Auto Explore
-- ---------------------------------------------------------------------------
-- Grant the auto-explore action to every unit in the game.
--
-- The game enables auto-explore on units carrying the UNIT_CLASS_AUTOEXPLORE
-- type tag. Rather than enumerate hundreds of unit types by hand (which goes
-- stale every patch and misses DLC), we tag the entire KIND_UNIT set directly.
--
-- Why this is set-based instead of a per-unit XML list:
--   * Covers base game, every DLC civ/leader pack, independent-power units, and
--     any units added by future patches -- with zero per-unit maintenance.
--   * Runs against whatever units are actually loaded in the current age's
--     database, so it is correct for every age and mod combination.
--
-- INSERT OR IGNORE: units that already carry the tag (Scouts, most warships,
-- and a handful of uniques) hit the (Tag, Type) primary key and are silently
-- skipped -- no duplicate-row load error.
--
-- SANDBOX exclusion: UNIT_SANDBOX / UNIT_AUDIO_SANDBOX_* are engine test units
-- that never appear in normal play; tagging them is pointless noise.

INSERT OR IGNORE INTO TypeTags (Type, Tag)
SELECT Type, 'UNIT_CLASS_AUTOEXPLORE'
FROM   Types
WHERE  Kind = 'KIND_UNIT'
  AND  Type NOT LIKE '%SANDBOX%';
