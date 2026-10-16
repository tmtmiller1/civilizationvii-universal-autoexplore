// unit-options.test.mjs - Universal Auto Explore: the Options groups and the per-unit switches.
//
// Rows are copied from the compiled gameplay database (Exploration age, base game plus DLC). The settings tests run
// against an in-memory localStorage that counts reads. Most run without a GameConfiguration, as the main menu does;
// the ones about the save's copy install a stand-in, and a second copy of the settings module, imported under its own
// URL, plays the part of a script context with its own kept values.
import test from "node:test";
import assert from "node:assert/strict";
import { classifyUnit, groupUnitsByClass, UNIT_CLASSES, CLASSES_OFF_BY_DEFAULT } from "../ui/uae-unit-classes.js";

const row = (UnitType, CoreClass, Domain, Name = `LOC_${UnitType}_NAME`) => ({ UnitType, CoreClass, Domain, Name });

const ROWS = [
  row("UNIT_SCOUT", "CORE_CLASS_RECON", "DOMAIN_LAND"),
  row("UNIT_CHASQUI", "CORE_CLASS_RECON", "DOMAIN_LAND"),
  row("UNIT_SWORDSMAN", "CORE_CLASS_MILITARY", "DOMAIN_LAND"),
  row("UNIT_TERCIO", "CORE_CLASS_MILITARY", "DOMAIN_LAND", "LOC_UNIT_TERCIO_NAME"),
  row("UNIT_TERCIO_2", "CORE_CLASS_MILITARY", "DOMAIN_LAND", "LOC_UNIT_TERCIO_NAME"),
  row("UNIT_COG", "CORE_CLASS_MILITARY", "DOMAIN_SEA"),
  row("UNIT_SANDBOX", "CORE_CLASS_MILITARY", "DOMAIN_LAND"),
  row("UNIT_SETTLER", "CORE_CLASS_SUPPORT", "DOMAIN_LAND"),
  row("UNIT_MIGRANT", "CORE_CLASS_CIVILIAN", "DOMAIN_LAND"),
  row("UNIT_ARMY_COMMANDER", "CORE_CLASS_SUPPORT", "DOMAIN_LAND"),
  row("UNIT_FLEET_COMMANDER", "CORE_CLASS_SUPPORT", "DOMAIN_SEA"),
  row("UNIT_SQUADRON_COMMANDER", "CORE_CLASS_SUPPORT", "DOMAIN_AIR"),
  row("UNIT_BIPLANE", "CORE_CLASS_MILITARY", "DOMAIN_AIR"),
  row("UNIT_TRADE_SHIP", "CORE_CLASS_CIVILIAN", "DOMAIN_SEA"),
];

test("classes: Scouts by CoreClass, military by domain, non-combat as civilian, aircraft unmanaged", () => {
  const got = Object.fromEntries(ROWS.map((r) => [r.UnitType, classifyUnit(r)]));
  assert.deepEqual(got, {
    UNIT_SCOUT: "scouts", UNIT_CHASQUI: "scouts", UNIT_SWORDSMAN: "land", UNIT_TERCIO: "land", UNIT_TERCIO_2: "land",
    UNIT_COG: "naval", UNIT_SANDBOX: null, UNIT_SETTLER: "civilian", UNIT_MIGRANT: "civilian",
    UNIT_ARMY_COMMANDER: "civilian", UNIT_FLEET_COMMANDER: "civilian", UNIT_SQUADRON_COMMANDER: null,
    UNIT_BIPLANE: null, UNIT_TRADE_SHIP: "civilian",
  });
  assert.equal(classifyUnit(null), null);
  assert.equal(classifyUnit({}), null);
});

test("classes: one row per unit name, tiers of a unique unit share a row, sorted by display name", () => {
  const display = (tag) => tag.replace(/^LOC_UNIT_|_NAME$/g, "").toLowerCase();
  const grouped = groupUnitsByClass(ROWS, display);
  assert.deepEqual(Object.keys(grouped), [...UNIT_CLASSES]);
  assert.deepEqual(grouped.scouts.map((u) => u.label), ["chasqui", "scout"]);
  assert.deepEqual(grouped.land.map((u) => [u.label, u.types]), [
    ["swordsman", ["UNIT_SWORDSMAN"]],
    ["tercio", ["UNIT_TERCIO", "UNIT_TERCIO_2"]],
  ]);
  assert.deepEqual(grouped.naval.map((u) => u.types), [["UNIT_COG"]]);
});

test("classes: an empty table (the main menu) gives empty lists", () => {
  assert.deepEqual(groupUnitsByClass([], String), { scouts: [], land: [], naval: [], civilian: [] });
});

/** getItem calls on the installed localStorage since it was installed. */
let storageReads = 0;

/** An in-memory localStorage, installed for the settings tests. */
function installStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  storageReads = 0;
  globalThis.localStorage = {
    getItem: (k) => {
      storageReads += 1;
      return data.has(k) ? data.get(k) : null;
    },
    setItem: (k, v) => data.set(k, String(v)),
  };
  return data;
}

/** The settings module on a fresh store, with its kept values read from that store (one read). */
async function settings(initial) {
  const data = installStorage(initial);
  const s = await import("../ui/uae-settings.js");
  s.refreshSettings();
  return { s, data };
}

/** A GameConfiguration stand-in: what editGame() writes, getGame() reads, as in a game. Removed after the test. */
function installGameConfiguration(t) {
  const values = new Map();
  globalThis.Configuration = {
    getGame: () => ({ getValue: (k) => (values.has(k) ? values.get(k) : null) }),
    editGame: () => ({ setValue: (k, v) => values.set(k, String(v)) }),
  };
  t.after(() => delete globalThis.Configuration);
  return values;
}

test("settings: every group but Civilian starts on, which is the mod without options", async () => {
  const { s } = await settings();
  assert.deepEqual(UNIT_CLASSES.filter((cls) => !s.isClassEnabled(cls)), [...CLASSES_OFF_BY_DEFAULT]);
  assert.deepEqual([...CLASSES_OFF_BY_DEFAULT], ["civilian"]);
  assert.equal(s.isExploreAllowed("civilian", "UNIT_SETTLER"), false);
  assert.equal(s.isUnitEnabled("UNIT_SWORDSMAN"), true);
  assert.equal(s.isExploreAllowed("land", "UNIT_SWORDSMAN"), true);
});

test("settings: a group off removes every unit in it; a unit off removes only that unit", async () => {
  const { s } = await settings();
  s.setUnitEnabled("UNIT_SWORDSMAN", false);
  assert.equal(s.isExploreAllowed("land", "UNIT_SWORDSMAN"), false);
  assert.equal(s.isExploreAllowed("land", "UNIT_TERCIO"), true);
  s.setClassEnabled("land", false);
  assert.equal(s.isExploreAllowed("land", "UNIT_TERCIO"), false);
  assert.equal(s.isExploreAllowed("naval", "UNIT_COG"), true);
  s.setClassEnabled("land", true);
  s.setUnitEnabled("UNIT_SWORDSMAN", true);
  assert.equal(s.isExploreAllowed("land", "UNIT_SWORDSMAN"), true);
});

test("settings: turning Civilian on offers the action, and a unit can still be turned off", async () => {
  const { s } = await settings();
  s.setClassEnabled("civilian", true);
  assert.equal(s.isExploreAllowed("civilian", "UNIT_SETTLER"), true);
  s.setUnitEnabled("UNIT_SETTLER", false);
  assert.equal(s.isExploreAllowed("civilian", "UNIT_SETTLER"), false);
  assert.equal(s.isExploreAllowed("civilian", "UNIT_MIGRANT"), true);
});

test("settings: a unit outside every group is never touched", async () => {
  const { s } = await settings();
  s.setUnitEnabled("UNIT_BIPLANE", false);
  assert.equal(s.isExploreAllowed(null, "UNIT_BIPLANE"), true);
});

test("settings: one read of the shared store serves every check until something changes", async () => {
  const { s } = await settings({ modSettings: JSON.stringify({ "universal-auto-explore": { class_land: 0 } }) });
  for (let i = 0; i < 50; i += 1) {
    assert.equal(s.isExploreAllowed("land", "UNIT_SWORDSMAN"), false);
    assert.equal(s.isExploreAllowed("naval", "UNIT_COG"), true);
    assert.equal(s.isExploreAllowed("civilian", "UNIT_SETTLER"), false);
    assert.equal(s.isUnitEnabled("UNIT_COG"), true);
  }
  assert.equal(storageReads, 1);
});

test("settings: a change made here applies at the next check without another read", async () => {
  const { s } = await settings();
  assert.equal(s.isExploreAllowed("land", "UNIT_SWORDSMAN"), true);
  s.setUnitEnabled("UNIT_SWORDSMAN", false);
  s.setClassEnabled("civilian", true);
  const afterWrites = storageReads;
  assert.equal(s.isExploreAllowed("land", "UNIT_SWORDSMAN"), false);
  assert.equal(s.isExploreAllowed("land", "UNIT_TERCIO"), true);
  assert.equal(s.isExploreAllowed("civilian", "UNIT_SETTLER"), true);
  assert.equal(storageReads, afterWrites);
});

test("settings: in a game, a change from another script context arrives through the save's copy", async (t) => {
  const saveCopy = installGameConfiguration(t);
  const { s } = await settings();
  const options = await import("../ui/uae-settings.js?options-screen-context");
  assert.equal(s.isExploreAllowed("naval", "UNIT_COG"), true);
  options.setClassEnabled("naval", false);
  assert.match(saveCopy.get("ModOptions_universal-auto-explore"), /"class_naval":0/);
  const before = storageReads;
  assert.equal(s.isExploreAllowed("naval", "UNIT_COG"), false);
  assert.equal(storageReads, before + 1, "one read when the save's copy changed");
  for (let i = 0; i < 20; i += 1) s.isExploreAllowed("naval", "UNIT_COG");
  assert.equal(storageReads, before + 1, "and none after that");
});

test("settings: the save's copy wins over the shared store, as the save's options do", async (t) => {
  const saveCopy = installGameConfiguration(t);
  saveCopy.set("ModOptions_universal-auto-explore", JSON.stringify({ class_land: 1 }));
  const { s } = await settings({ modSettings: JSON.stringify({ "universal-auto-explore": { class_land: 0 } }) });
  assert.equal(s.isExploreAllowed("land", "UNIT_SWORDSMAN"), true);
});

test("settings: with no save's copy to watch, a change from elsewhere waits for refreshSettings", async () => {
  const { s } = await settings();
  const other = await import("../ui/uae-settings.js?main-menu-context");
  assert.equal(s.isExploreAllowed("scouts", "UNIT_SCOUT"), true);
  other.setClassEnabled("scouts", false);
  assert.equal(s.isExploreAllowed("scouts", "UNIT_SCOUT"), true);
  s.refreshSettings();
  assert.equal(s.isExploreAllowed("scouts", "UNIT_SCOUT"), false);
});

test("settings: a write sends the change event, and another copy in the same window reads again", async (t) => {
  globalThis.window = new EventTarget();
  t.after(() => delete globalThis.window);
  installStorage();
  const a = await import("../ui/uae-settings.js?window-a");
  const b = await import("../ui/uae-settings.js?window-b");
  const heard = [];
  window.addEventListener(a.SETTINGS_CHANGED_EVENT, (e) => heard.push([e.detail.optionID, e.detail.value]));
  assert.equal(a.isExploreAllowed("land", "UNIT_SWORDSMAN"), true);
  assert.equal(b.isExploreAllowed("land", "UNIT_SWORDSMAN"), true);
  a.setUnitEnabled("UNIT_SWORDSMAN", false);
  assert.deepEqual(heard, [["unit_UNIT_SWORDSMAN", 0]]);
  const before = storageReads;
  assert.equal(b.isExploreAllowed("land", "UNIT_SWORDSMAN"), false);
  assert.equal(storageReads, before + 1);
  assert.equal(a.isExploreAllowed("land", "UNIT_SWORDSMAN"), false);
  assert.equal(storageReads, before + 1, "the copy that wrote keeps its values");
});

test("settings: writes keep other mods' slices and refuse to overwrite a value that is not a settings root", async () => {
  const { s, data } = await settings({ modSettings: JSON.stringify({ "other-mod": { x: 7 } }) });
  s.setClassEnabled("naval", false);
  assert.deepEqual(JSON.parse(data.get("modSettings")), {
    "other-mod": { x: 7 },
    "universal-auto-explore": { class_naval: 0 },
  });
  // Coherent can hand back another key's value; the store must not copy it into modSettings.
  const foreign = JSON.stringify({ frames: [1, 2, 3] });
  data.set("modSettings", foreign);
  s.setClassEnabled("naval", true);
  assert.equal(data.get("modSettings"), foreign);
});
