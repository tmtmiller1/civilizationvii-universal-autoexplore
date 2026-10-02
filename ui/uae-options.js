// uae-options.js
//
// The mod's block in Options > Add-ons: one checkbox per unit group (Scouts, land military, naval, civilian),
// each followed by a "Choose ..." checkbox that opens the list of units in that group, one checkbox per unit.
// Every group but Civilian starts on, which matches the mod without these options. Changes are saved as they are
// made and apply the next time a unit is selected (see uae-unit-actions.js); Cancel puts back what was there on
// opening.
//
// The unit lists need the game's Units table, so the main-menu Options screen shows only the group checkboxes.

import { CategoryType, OptionType, Options } from "/core/ui/options/model-options.js";
import "/universal-auto-explore/ui/uae-mod-options.js";
import { UNIT_CLASSES, groupUnitsByClass } from "/universal-auto-explore/ui/uae-unit-classes.js";
import {
  isClassEnabled, isUnitEnabled, setClassEnabled, setUnitEnabled
} from "/universal-auto-explore/ui/uae-settings.js";

// Becomes the header key LOC_OPTIONS_GROUP_UNIVERSALAUTOEXPLORE, so it stays one hyphen-free token.
const GROUP = "universalautoexplore";

/** Text per group: the group checkbox, its tooltip, and the checkbox that opens its unit list. */
const LABELS = {
  scouts: ["LOC_UAE_OPTION_SCOUTS", "LOC_UAE_OPTION_SCOUTS_DESCRIPTION", "LOC_UAE_OPTION_SCOUTS_CHOOSE"],
  land: ["LOC_UAE_OPTION_LAND", "LOC_UAE_OPTION_LAND_DESCRIPTION", "LOC_UAE_OPTION_LAND_CHOOSE"],
  naval: ["LOC_UAE_OPTION_NAVAL", "LOC_UAE_OPTION_NAVAL_DESCRIPTION", "LOC_UAE_OPTION_NAVAL_CHOOSE"],
  civilian: ["LOC_UAE_OPTION_CIVILIAN", "LOC_UAE_OPTION_CIVILIAN_DESCRIPTION", "LOC_UAE_OPTION_CIVILIAN_CHOOSE"]
};

/** Whether each group's unit list is open; kept while the Options model lives. */
const listOpen = { scouts: false, land: false, naval: false, civilian: false };

/**
 * The Units rows of the current game, grouped. Empty in the main menu, where there is no game database.
 * @returns {Record<string, Array<{name: string, label: string, types: string[]}>>}
 */
function unitsByClass() {
  try {
    if (typeof GameInfo === "undefined" || !GameInfo.Units) return groupUnitsByClass([], String);
    return groupUnitsByClass(GameInfo.Units, (tag) => {
      try {
        return Locale.compose(tag);
      } catch (_) {
        return tag;
      }
    });
  } catch (e) {
    console.warn("[UniversalAutoExplore] could not read the Units table:", e);
    return groupUnitsByClass([], String);
  }
}

/**
 * Indent a row under its group once the Options screen has drawn it. The screen assigns forceRender when it draws
 * the row, so a setter on it is the hook; the row joins the document a frame or two later.
 * @param {*} info The option. @param {string} indent CSS length.
 * @returns {*} The option.
 */
function indentWhenDrawn(info, indent) {
  let fn = info.forceRender;
  Object.defineProperty(info, "forceRender", {
    configurable: true,
    get: () => fn,
    set: (v) => {
      fn = v;
      indentRow(info.id, indent, 5);
    }
  });
  return info;
}

/** @param {string} id Option id. @param {string} indent CSS length. @param {number} tries Frames left to wait. */
function indentRow(id, indent, tries) {
  requestAnimationFrame(() => {
    const label = document.querySelector(`[optionID="${id}"]`)?.parentElement?.firstElementChild;
    if (label?.style) label.style.paddingLeft = indent;
    else if (tries > 0) indentRow(id, indent, tries - 1);
  });
}

/** @param {Array<*>} infos @param {(info: *) => void} change Apply a change to each, then redraw it. */
function updateRows(infos, change) {
  for (const info of infos) {
    change(info);
    info.forceRender?.();
  }
}

/**
 * The base checkbox: shows the stored value on opening and puts it back on Cancel.
 * @param {string} id @param {string} label @param {string} description
 * @param {() => boolean} read @param {(on: boolean) => void} write
 * @returns {*} The option, not yet added.
 */
function checkbox(id, label, description, read, write) {
  return {
    category: CategoryType.Mods,
    group: GROUP,
    type: OptionType.Checkbox,
    id,
    label,
    description,
    initListener: (/** @type {*} */ info) => {
      info.currentValue = read();
      info.valueOnOpen = info.currentValue;
    },
    updateListener: (/** @type {*} */ info, /** @type {*} */ value) => {
      info.currentValue = !!value;
      write(!!value);
    },
    restoreListener: (/** @type {*} */ info) => write(!!info.valueOnOpen)
  };
}

/**
 * One checkbox per unit name in a group. Hidden until the group's list is open, greyed out while the group is off.
 * @param {string} cls @param {Array<{name: string, types: string[]}>} units @returns {Array<*>} The options.
 */
function unitRows(cls, units) {
  return units.map((unit) => {
    const info = checkbox(
      `uae-unit-${unit.types[0].toLowerCase()}`, unit.name, "LOC_UAE_OPTION_UNIT_DESCRIPTION",
      () => unit.types.every(isUnitEnabled),
      (on) => unit.types.forEach((t) => setUnitEnabled(t, on))
    );
    const init = info.initListener;
    info.initListener = (/** @type {*} */ i) => {
      init(i);
      i.isHidden = !listOpen[cls];
      i.isDisabled = !isClassEnabled(cls);
    };
    return indentWhenDrawn(info, "4rem");
  });
}

/** @param {string} cls A UNIT_CLASSES key. @param {Array<*>} units Its unit list. */
function registerClass(cls, units) {
  const [label, description, chooseLabel] = LABELS[cls];
  const rows = unitRows(cls, units);
  Options.addOption(checkbox(`uae-class-${cls}`, label, description, () => isClassEnabled(cls), (on) => {
    setClassEnabled(cls, on);
    updateRows(rows, (row) => { row.isDisabled = !on; });
  }));
  if (!rows.length) return;
  const choose = checkbox(`uae-choose-${cls}`, chooseLabel, "LOC_UAE_OPTION_CHOOSE_DESCRIPTION", () => listOpen[cls],
    (on) => {
      listOpen[cls] = on;
      updateRows(rows, (row) => { row.isHidden = !on; });
    });
  Options.addOption(indentWhenDrawn(choose, "2rem"));
  for (const row of rows) Options.addOption(row);
}

Options.addInitCallback(() => {
  const units = unitsByClass();
  for (const cls of UNIT_CLASSES) registerClass(cls, units[cls]);
});
