// uae-settings.js
//
// Which groups and units may use Automate Exploration. Every group but Civilian defaults to on, which is the mod's
// behavior before these options existed; units default to on, so only an explicit "off" (stored as 0) removes one.
//
// The Options screen and the unit panel run in separate script contexts, so nothing is cached here: every read
// goes to the store. No imports, so the Node tests can load it directly.

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

  /** @param {string} modID @returns {string} The GameConfiguration key for the mod's options. */
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

  /** @param {string} modID @returns {Record<string, *>|null} The mod's options in this save, if any. */
  _gcLoadAll(modID) {
    const g = this._gameRead();
    if (!g) return null;
    try {
      const raw = g.getValue(this._gcKey(modID));
      const o = typeof raw === "string" && raw.length ? JSON.parse(raw) : null;
      return o && typeof o === "object" && !Array.isArray(o) ? o : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * In-game only: merge one option into the save's copy.
   * @param {string} modID @param {string} optionID @param {*} value
   */
  _gcSave(modID, optionID, value) {
    let edit = null;
    try {
      edit = typeof Configuration !== "undefined" && typeof Configuration.editGame === "function"
        ? Configuration.editGame() : null;
    } catch (_) {
      return;
    }
    if (!edit || typeof edit.setValue !== "function") return;
    const all = this._gcLoadAll(modID) || {};
    all[optionID] = value;
    try {
      edit.setValue(this._gcKey(modID), JSON.stringify(all));
    } catch (_) {
      /* ignore */
    }
  }

  /** Write our own slice to both stores. @param {string} modID @param {string} optionID @param {*} value */
  save(modID, optionID, value) {
    try {
      const { root, safe } = this._readForWrite();
      if (safe) {
        (root[modID] ??= {})[optionID] = value;
        localStorage.setItem("modSettings", JSON.stringify(root));
      }
    } catch (_) {
      /* ignore */
    }
    this._gcSave(modID, optionID, value);
  }

  /** @param {string} modID @param {string} optionID @returns {*} The stored value, or null. */
  load(modID, optionID) {
    const all = this._gcLoadAll(modID);
    if (all && Object.prototype.hasOwnProperty.call(all, optionID)) return all[optionID];
    try {
      const raw = localStorage.getItem("modSettings");
      if (!raw) return null;
      return JSON.parse(raw)?.[modID]?.[optionID] ?? null;
    } catch (_) {
      return null;
    }
  }
}

const store = new ModOptionsStore();

export const MOD_ID = "universal-auto-explore";

// Mirrors CLASSES_OFF_BY_DEFAULT in uae-unit-classes.js; kept here so this file stays import-free.
const OFF_BY_DEFAULT = ["civilian"];

/** @param {string} cls A UNIT_CLASSES key. @returns {boolean} Whether the group may auto-explore. */
export function isClassEnabled(cls) {
  const v = store.load(MOD_ID, "class_" + cls);
  return v == null ? !OFF_BY_DEFAULT.includes(cls) : v !== 0;
}

/** @param {string} cls A UNIT_CLASSES key. @param {boolean} on */
export function setClassEnabled(cls, on) {
  store.save(MOD_ID, "class_" + cls, on ? 1 : 0);
}

/** @param {string} unitType e.g. UNIT_SWORDSMAN. @returns {boolean} Whether the unit may auto-explore. */
export function isUnitEnabled(unitType) {
  return store.load(MOD_ID, "unit_" + unitType) !== 0;
}

/** @param {string} unitType e.g. UNIT_SWORDSMAN. @param {boolean} on */
export function setUnitEnabled(unitType, on) {
  store.save(MOD_ID, "unit_" + unitType, on ? 1 : 0);
}

/**
 * Whether a unit keeps the Automate Exploration action. A unit outside every group is left alone.
 * @param {string|null} cls The unit's group (classifyUnit), or null.
 * @param {string} unitType The unit's type.
 * @returns {boolean} False only when its group or the unit itself is turned off.
 */
export function isExploreAllowed(cls, unitType) {
  if (!cls) return true;
  return isClassEnabled(cls) && isUnitEnabled(unitType);
}
