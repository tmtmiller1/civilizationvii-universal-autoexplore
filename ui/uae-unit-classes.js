// uae-unit-classes.js
//
// Sorts units into the groups the Options screen offers. The groups follow the game's own columns, not
// FormationClass: the Scout is FORMATION_CLASS_CIVILIAN in the base game, so CoreClass is what tells it apart.
// "civilian" is every unit that does not fight: Settlers, Migrants, Merchants, Missionaries, Great People,
// Commanders and the like. Aircraft are in no group and are never touched by the options.
// No imports, so the Node tests can load it directly.

/** The groups, in the order the Options screen lists them. */
export const UNIT_CLASSES = Object.freeze(["scouts", "land", "naval", "civilian"]);

/** Groups that start off, so a new install behaves as the mod did before the options. */
export const CLASSES_OFF_BY_DEFAULT = Object.freeze(["civilian"]);

const NON_COMBAT = ["CORE_CLASS_CIVILIAN", "CORE_CLASS_SUPPORT"];
const SURFACE = ["DOMAIN_LAND", "DOMAIN_SEA"];

/**
 * The group a unit belongs to, or null when the options do not manage it.
 * @param {{UnitType?: string, CoreClass?: string, Domain?: string}|null|undefined} row A Units row.
 * @returns {string|null} One of UNIT_CLASSES, or null.
 */
export function classifyUnit(row) {
  if (!row || typeof row.UnitType !== "string" || row.UnitType.includes("SANDBOX")) return null;
  if (row.CoreClass === "CORE_CLASS_RECON") return "scouts";
  if (NON_COMBAT.includes(row.CoreClass)) return SURFACE.includes(row.Domain) ? "civilian" : null;
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
 * @returns {Record<string, Array<{name: string, label: string, types: string[]}>>} Rows per group, sorted.
 */
export function groupUnitsByClass(rows, display) {
  /** @type {Record<string, Map<string, {name: string, label: string, types: string[]}>>} */
  const byClass = {};
  for (const key of UNIT_CLASSES) byClass[key] = new Map();
  for (const row of rows) {
    const key = classifyUnit(row);
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
