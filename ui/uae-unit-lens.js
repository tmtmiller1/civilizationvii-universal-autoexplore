// uae-unit-lens.js
//
// Selecting a unit this mod gave auto-explore leaves the map on the lens the game would pick without the mod, while
// Scouts and the game's own explorers still open the Discovery lens. The logic is in uae-lens-keep.js.
//
// The base unit-selected script is imported first so its handler exists, and the wrapper goes on after
// engine.whenReady, as Map Trix's patch does. A handler another mod registers later with addHandler runs without it.

import "/base-standard/ui/interface-modes/interface-mode-unit-selected.js";
import { InterfaceMode } from "/core/ui/interface-modes/interface-modes.js";
import LensManager from "/core/ui/lenses/lens-manager.js";
import { buildMarkedSet, installLensKeep } from "/universal-auto-explore/ui/uae-lens-keep.js";

const warn = (/** @type {string} */ message) => console.warn(`[UniversalAutoExplore] ${message}`);

/** @returns {Set<string>} */
function markedTypes() {
  try {
    const ageType = GameInfo.Ages.lookup(Game.age)?.AgeType;
    return buildMarkedSet(GameInfo.TypeTags, (type) => GameInfo.Units.lookup(type), ageType);
  } catch (e) {
    warn(`could not read the marked units: ${e}`);
    return new Set();
  }
}

const marked = markedTypes();

/** @param {*} unitID */
function isMarkedUnit(unitID) {
  const unit = Units.get(unitID);
  const row = unit ? GameInfo.Units.lookup(unit.type) : null;
  return !!row && marked.has(row.UnitType);
}

engine.whenReady.then(() => {
  try {
    const handler = InterfaceMode.getInterfaceModeHandler?.("INTERFACEMODE_UNIT_SELECTED");
    installLensKeep(handler, LensManager, isMarkedUnit, warn);
  } catch (e) {
    warn(`could not keep the map lens: ${e}`);
  }
});
