// uae-lens-keep.js
//
// Keeps the map lens the game would pick for the units this mod tagged. The base game opens the Discovery lens for
// every unit tagged UNIT_CLASS_AUTOEXPLORE (interface-mode-unit-selected.js, setUnitLens), and the tag is also what
// offers the auto-explore action, so it has to stay. The data patch marks the units it tags with
// UNIT_CLASS_UAE_GRANTED, and for those units the handler's setUnitLens runs with LensManager.setActiveLens turning
// the Discovery lens into the default lens, for that one call only. Every other lens the method or another mod picks
// goes through unchanged.
// No imports, so the Node tests can load it directly; ui/uae-unit-lens.js hands it the game's objects.

export const MARKER_TAG = "UNIT_CLASS_UAE_GRANTED";
export const DISCOVERY_LENS = "fxs-discovery-lens";
export const DEFAULT_LENS = "fxs-default-lens";

/**
 * The unit types whose lens this mod keeps: the ones the data patch marked, less the warships the game sends to the
 * Discovery lens in the Exploration Age whatever their tags.
 * @param {Iterable<{Tag: string, Type: string}>} typeTags TypeTags rows.
 * @param {(type: string) => ({FormationClass?: string}|null|undefined)} lookupUnit A Units row by type.
 * @param {string|undefined} ageType The current AgeType.
 * @returns {Set<string>} Marked unit types.
 */
export function buildMarkedSet(typeTags, lookupUnit, ageType) {
  const marked = new Set();
  const exploration = ageType === "AGE_EXPLORATION";
  for (const row of typeTags) {
    if (row?.Tag !== MARKER_TAG) continue;
    if (exploration && lookupUnit(row.Type)?.FormationClass === "FORMATION_CLASS_NAVAL") continue;
    marked.add(row.Type);
  }
  return marked;
}

/**
 * Runs fn with lensManager.setActiveLens turning the Discovery lens into the default lens, and puts the method back
 * afterwards, as an own property or by deleting the stand-in, whichever it was.
 * @param {*} lensManager The LensManager singleton.
 * @param {() => *} fn The call to make.
 * @returns {*} What fn returned.
 */
export function withDiscoveryKept(lensManager, fn) {
  const hadOwn = Object.prototype.hasOwnProperty.call(lensManager, "setActiveLens");
  const set = lensManager.setActiveLens;
  lensManager.setActiveLens = function (/** @type {string} */ lens, /** @type {*[]} */ ...rest) {
    return set.call(this, lens === DISCOVERY_LENS ? DEFAULT_LENS : lens, ...rest);
  };
  try {
    return fn();
  } finally {
    if (hadOwn) lensManager.setActiveLens = set;
    else delete lensManager.setActiveLens;
  }
}

/**
 * Puts a setUnitLens on the handler instance. The method it calls is looked up at call time: an earlier instance
 * patch if one was there, otherwise the prototype's, so a mod that patches the prototype (Map Trix does) still runs
 * first, whichever loads first.
 * @param {*} handler The INTERFACEMODE_UNIT_SELECTED handler.
 * @param {*} lensManager The LensManager singleton.
 * @param {(unitID: *) => boolean} isMarkedUnit Whether the selected unit's lens is kept.
 * @param {(message: string) => void} warn Called once when the wrapper can't be put on.
 * @returns {boolean} Whether the wrapper is on.
 */
export function installLensKeep(handler, lensManager, isMarkedUnit, warn) {
  if (!handler || typeof lensManager?.setActiveLens !== "function") {
    warn("no unit-selected handler or LensManager; the map lens will switch as before.");
    return false;
  }
  const earlier = Object.prototype.hasOwnProperty.call(handler, "setUnitLens") ? handler.setUnitLens : null;
  const inner = () => earlier ?? Object.getPrototypeOf(handler)?.setUnitLens;
  if (typeof inner() !== "function") {
    warn("the unit-selected handler has no setUnitLens; the map lens will switch as before.");
    return false;
  }
  handler.setUnitLens = function (/** @type {*} */ unitID, /** @type {*[]} */ ...rest) {
    const original = inner();
    if (typeof original !== "function") return undefined;
    let marked = false;
    try {
      marked = isMarkedUnit(unitID);
    } catch (_e) {
      marked = false;
    }
    if (!marked) return original.call(this, unitID, ...rest);
    return withDiscoveryKept(lensManager, () => original.call(this, unitID, ...rest));
  };
  return true;
}
