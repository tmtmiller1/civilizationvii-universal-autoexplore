// uae-unit-actions.js
//
// Removes Automate Exploration from the unit panel for any group or unit the player turned off in Options.
// The data patch still grants the action; this only decides whether the panel offers it, so a change applies the
// next time a unit is selected, with no reload. The keyboard shortcut reads the same action list, so it follows.
//
// It wraps the panel instance's getUnitActions instead of replacing unit-actions.js, so it keeps working
// alongside a mod that ships its own copy of that file.

import { classifyUnit } from "/universal-auto-explore/ui/uae-unit-classes.js";
import { isExploreAllowed } from "/universal-auto-explore/ui/uae-settings.js";

const EXPLORE = "UNITOPERATION_AUTOMATE_EXPLORE";

/**
 * @param {*} panel The unit-actions component.
 * @param {*} unit The selected unit.
 */
function dropExploreIfOff(panel, unit) {
  if (!Array.isArray(panel.actions) || !panel.actions.some((a) => a?.type === EXPLORE)) return;
  const row = GameInfo.Units.lookup(unit.type);
  if (!row || isExploreAllowed(classifyUnit(row), row.UnitType)) return;
  panel.actions = panel.actions.filter((a) => a?.type !== EXPLORE);
}

class UaeUnitActionsDecorator {
  /** @param {*} component The unit-actions panel. */
  constructor(component) {
    const original = component.getUnitActions;
    if (typeof original !== "function") {
      console.warn("[UniversalAutoExplore] unit-actions has no getUnitActions; the unit options will not apply.");
      return;
    }
    component.getUnitActions = function (/** @type {*} */ unit) {
      original.call(this, unit);
      try {
        dropExploreIfOff(this, unit);
      } catch (e) {
        console.warn("[UniversalAutoExplore] could not apply the unit options:", e);
      }
    };
  }

  beforeAttach() {}

  afterAttach() {}

  beforeDetach() {}

  afterDetach() {}

  onAttributeChanged() {}
}

Controls.decorate("unit-actions", (/** @type {*} */ c) => new UaeUnitActionsDecorator(c));
