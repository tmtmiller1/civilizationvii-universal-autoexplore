// uae-unit-classes.js
//
// Sorts units into the groups the Options screen offers. The groups follow the game's own columns, not
// FormationClass: the Scout is FORMATION_CLASS_CIVILIAN in the base game. Up to 1.5.0 its CoreClass was
// CORE_CLASS_RECON; from 1.5.1 the Scout, Tehina and Sherpa are CORE_CLASS_SUPPORT, so a non-combat unit carrying the
// game's UNIT_CLASS_RECON tag counts as a scout too. That tag comes from TypeTags, so a mod's own recon unit follows.
// "civilian" is every unit that does not fight: Settlers, Migrants, Merchants, Missionaries, Great People,
// Commanders and the like. Aircraft are in no group and are never touched by the options.
// No imports, so the Node tests can load it directly.

/** The groups, in the order the Options screen lists them. */
export const UNIT_CLASSES = Object.freeze(["scouts", "land", "naval", "civilian"]);

/** Groups that start off, so a new install behaves as the mod did before the options. */
export const CLASSES_OFF_BY_DEFAULT = Object.freeze(["civilian"]);

const NON_COMBAT = ["CORE_CLASS_CIVILIAN", "CORE_CLASS_SUPPORT"];
const SURFACE = ["DOMAIN_LAND", "DOMAIN_SEA"];
const RECON_TAG = "UNIT_CLASS_RECON";

/**
 * The unit types the game tags UNIT_CLASS_RECON.
 * @param {Iterable<{Type?: string, Tag?: string}>|null|undefined} typeTags TypeTags rows (GameInfo.TypeTags).
 * @returns {Set<string>}
 */
export function reconTypesFrom(typeTags) {
  const out = new Set();
  if (!typeTags) return out;
  for (const r of typeTags) {
    if (r && r.Tag === RECON_TAG && typeof r.Type === "string") out.add(r.Type);
  }
  return out;
}

/**
 * A non-combat unit's group: a recon-tagged one is a scout, any other surface unit a civilian, the rest unmanaged.
 * @param {{UnitType: string, Domain?: string}} row A Units row.
 * @param {Set<string>|undefined} reconTypes Types tagged UNIT_CLASS_RECON.
 * @returns {string|null}
 */
function nonCombatClass(row, reconTypes) {
  if (!SURFACE.includes(row.Domain ?? "")) return null;
  return reconTypes && reconTypes.has(row.UnitType) ? "scouts" : "civilian";
}

/**
 * The group a unit belongs to, or null when the options do not manage it.
 * @param {{UnitType?: string, CoreClass?: string, Domain?: string}|null|undefined} row A Units row.
 * @param {Set<string>} [reconTypes] Types tagged UNIT_CLASS_RECON (reconTypesFrom); a non-combat one is a scout.
 * @returns {string|null} One of UNIT_CLASSES, or null.
 */
export function classifyUnit(row, reconTypes) {
  if (!row || typeof row.UnitType !== "string" || row.UnitType.includes("SANDBOX")) return null;
  if (row.CoreClass === "CORE_CLASS_RECON") return "scouts";
  if (NON_COMBAT.includes(row.CoreClass)) return nonCombatClass(row, reconTypes);
  if (row.CoreClass !== "CORE_CLASS_MILITARY") return null;
  if (row.Domain === "DOMAIN_LAND") return "land";
  if (row.Domain === "DOMAIN_SEA") return "naval";
  return null;
}

/**
 * One Options row per unit name in each group. Unique units come in up to three tiers (UNIT_TERCIO,
 * UNIT_TERCIO_2, UNIT_TERCIO_3) that share a name, so a row covers every type with that name.
 * @param {Iterable<{UnitType: string, Name: string, CoreClass?: string, Domain?: string}>} rows Units rows.
 * @param {(tag: string) => string} display The player-facing name for a LOC tag, used to sort.
 * @param {Set<string>} [reconTypes] Types tagged UNIT_CLASS_RECON (reconTypesFrom).
 * @returns {Record<string, Array<{name: string, label: string, types: string[]}>>} Rows per group, sorted.
 */
export function groupUnitsByClass(rows, display, reconTypes) {
  /** @type {Record<string, Map<string, {name: string, label: string, types: string[]}>>} */
  const byClass = {};
  for (const key of UNIT_CLASSES) byClass[key] = new Map();
  for (const row of rows) {
    const key = classifyUnit(row, reconTypes);
    if (!key || !row.Name) continue;
    const entry = byClass[key].get(row.Name) ?? { name: row.Name, label: display(row.Name), types: [] };
    entry.types.push(row.UnitType);
    byClass[key].set(row.Name, entry);
  }
  /** @type {Record<string, Array<{name: string, label: string, types: string[]}>>} */
  const out = {};
  for (const key of UNIT_CLASSES) {
    out[key] = [...byClass[key].values()].sort((a, b) => a.label.localeCompare(b.label));
  }
  return out;
}
