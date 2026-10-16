// uae-settings.js
//
// Which groups and units may use Automate Exploration. Every group but Civilian defaults to on, which is the mod's
// behavior before these options existed; units default to on, so only an explicit "off" (stored as 0) removes one.
//
// The shared store holds every mod's data and runs to half a megabyte or more. One read plus parse took about 6 ms in
// a game on 2026-10-15, and the unit panel checks about three times per selection and per move. So the values are
// read once and kept, and read again only when they may have changed:
//   - A write from this module updates the kept values and sends SETTINGS_CHANGED_EVENT on the window. Another copy
//     of this module that shares the window (one loaded under a different URL) drops its values when it hears it.
//   - In a game every Options change also goes into the save's copy in GameConfiguration. That's engine state, the
//     same in every script context, so each check compares the copy's text with the text the values were read with,
//     and reads again when it differs. A change made on an Options screen that runs in another context reaches the
//     unit panel this way. The check is one getValue and a string compare.
//   - refreshSettings() reads again whatever the copy says; the unit panel calls it at the start of each local turn.
// No imports, so the Node tests can load it directly.

export const SETTINGS_CHANGED_EVENT = "universal-auto-explore-settings-changed";

/** @param {*} raw @returns {Record<string, *>|null} The text parsed as a plain object, or null. */
function parseObject(raw) {
  if (typeof raw !== "string" || !raw.length) return null;
  try {
    const o = JSON.parse(raw);
    return o && typeof o === "object" && !Array.isArray(o) ? o : null;
  } catch (_) {
    return null;
  }
}

// Per-mod slice of the shared "modSettings" localStorage key, mirrored in-game to GameConfiguration. The same
// store Emigration uses (ui/emigration-settings.js): Coherent's getItem() can return the first key in the store
// instead of the one asked for, so a write only goes ahead when the value read back looks like a settings root,
// and in-game reads prefer the per-save GameConfiguration copy.
class ModOptionsStore {
  /**
   * Read `modSettings` for a write without destroying another mod's slice.
   * @returns {{root: Record<string, *>, safe: boolean}} `safe:false` means do not write.
   */
  _readForWrite() {
    let raw = null;
    try {
      raw = localStorage.getItem("modSettings");
      if (!raw) raw = localStorage.getItem("modSettings"); // a first read can come back empty
    } catch (_) {
      return { root: {}, safe: false };
    }
    if (!raw) return { root: {}, safe: true };
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return { root: {}, safe: false };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { root: {}, safe: false };
    // A real settings root is { "<modId>": {...}, ... }; anything else is another key's value.
    const looksLikeSettingsRoot = Object.keys(parsed).every((k) => {
      const v = parsed[k];
      return !!v && typeof v === "object" && !Array.isArray(v);
    });
    return looksLikeSettingsRoot ? { root: parsed, safe: true } : { root: {}, safe: false };
  }

  /** @param {string} modID */
  _gcKey(modID) {
    return "ModOptions_" + modID;
  }

  /** @returns {*} The read-only GameConfiguration, or null in the shell. Never throws. */
  _gameRead() {
    try {
      const g = typeof Configuration !== "undefined" ? Configuration.getGame?.() : null;
      return g && typeof g.getValue === "function" ? g : null;
    } catch (_) {
      return null;
    }
  }

  /** @param {string} modID @returns {string|null} The save's copy of the mod's options as stored, or null. */
  _gcText(modID) {
    const g = this._gameRead();
    if (!g) return null;
    try {
      const raw = g.getValue(this._gcKey(modID));
      return typeof raw === "string" && raw.length ? raw : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * In-game only: merge one option into the save's copy.
   * @param {string} modID @param {string} optionID @param {*} value
   * @returns {boolean} Whether the copy was written.
   */
  _gcSave(modID, optionID, value) {
    let edit = null;
    try {
      edit = typeof Configuration !== "undefined" && typeof Configuration.editGame === "function"
        ? Configuration.editGame() : null;
    } catch (_) {
      return false;
    }
    if (!edit || typeof edit.setValue !== "function") return false;
    const all = parseObject(this._gcText(modID)) || {};
    all[optionID] = value;
    try {
      edit.setValue(this._gcKey(modID), JSON.stringify(all));
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Write our own slice to both stores.
   * @param {string} modID @param {string} optionID @param {*} value
   * @returns {boolean} Whether either store took the value.
   */
  save(modID, optionID, value) {
    let shared = false;
    try {
      const { root, safe } = this._readForWrite();
      if (safe) {
        (root[modID] ??= {})[optionID] = value;
        localStorage.setItem("modSettings", JSON.stringify(root));
        shared = true;
      }
    } catch (_) {
      /* ignore */
    }
    return this._gcSave(modID, optionID, value) || shared;
  }

  /**
   * Every option the mod has stored: its section of the shared store with the save's copy on top, since in a game
   * the save's value wins. One read of each.
   * @param {string} modID
   * @returns {{values: Record<string, *>, gcText: string|null}} The values and the save's copy they were read with.
   */
  loadAll(modID) {
    const gcText = this._gcText(modID);
    let section = null;
    try {
      section = parseObject(localStorage.getItem("modSettings"))?.[modID];
    } catch (_) {
      section = null;
    }
    const shared = section && typeof section === "object" && !Array.isArray(section) ? section : {};
    return { values: { ...shared, ...parseObject(gcText) }, gcText };
  }
}

const store = new ModOptionsStore();

export const MOD_ID = "universal-auto-explore";

// Mirrors CLASSES_OFF_BY_DEFAULT in uae-unit-classes.js; kept here so this file stays import-free.
const OFF_BY_DEFAULT = ["civilian"];

/** @type {{values: Record<string, *>, gcText: string|null}|null} The kept values, null until the first read. */
let kept = null;

/** Tells this copy's own change events apart from another copy's. */
const SOURCE = {};

/** @returns {Record<string, *>} The stored options, read from the stores only when they may have changed. */
function stored() {
  if (!kept || store._gcText(MOD_ID) !== kept.gcText) kept = store.loadAll(MOD_ID);
  return kept.values;
}

/** Read the stores again, for a change from a script context this one can't hear. */
export function refreshSettings() {
  kept = store.loadAll(MOD_ID);
}

/** Store one option, keep it, and tell the rest of the mod. @param {string} optionID @param {*} value */
function write(optionID, value) {
  if (!store.save(MOD_ID, optionID, value)) return;
  if (kept) {
    kept.values[optionID] = value;
    kept.gcText = store._gcText(MOD_ID);
  }
  try {
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: { optionID, value, source: SOURCE } }));
  } catch (_) {
    /* no window */
  }
}

try {
  window.addEventListener(SETTINGS_CHANGED_EVENT, (/** @type {*} */ event) => {
    if (event?.detail?.source !== SOURCE) kept = null;
  });
} catch (_) {
  /* no window, as in the Node tests */
}

/** @param {Record<string, *>} values @param {string} cls @returns {boolean} */
function classOn(values, cls) {
  const v = values["class_" + cls];
  return v == null ? !OFF_BY_DEFAULT.includes(cls) : v !== 0;
}

/** @param {string} cls A UNIT_CLASSES key. @returns {boolean} Whether the group may auto-explore. */
export function isClassEnabled(cls) {
  return classOn(stored(), cls);
}

/** @param {string} cls A UNIT_CLASSES key. @param {boolean} on */
export function setClassEnabled(cls, on) {
  write("class_" + cls, on ? 1 : 0);
}

/** @param {string} unitType e.g. UNIT_SWORDSMAN. @returns {boolean} Whether the unit may auto-explore. */
export function isUnitEnabled(unitType) {
  return stored()["unit_" + unitType] !== 0;
}

/** @param {string} unitType e.g. UNIT_SWORDSMAN. @param {boolean} on */
export function setUnitEnabled(unitType, on) {
  write("unit_" + unitType, on ? 1 : 0);
}

/**
 * Whether a unit keeps the Automate Exploration action. A unit outside every group is left alone.
 * @param {string|null} cls The unit's group (classifyUnit), or null.
 * @param {string} unitType The unit's type.
 * @returns {boolean} False only when its group or the unit itself is turned off.
 */
export function isExploreAllowed(cls, unitType) {
  if (!cls) return true;
  const values = stored();
  return classOn(values, cls) && values["unit_" + unitType] !== 0;
}
