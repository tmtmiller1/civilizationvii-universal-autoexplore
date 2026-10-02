// unit-options.test.mjs - Universal Auto Explore: the Options groups and the per-unit switches.
//
// Rows are copied from the compiled gameplay database (Exploration age, base game plus DLC). The settings tests run
// against an in-memory localStorage; there is no GameConfiguration outside the game, so they cover the shared store.
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

/** An in-memory localStorage, installed for the settings tests. */
function installStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
  return data;
}

test("settings: every group but Civilian starts on, which is the mod without options", async () => {
  installStorage();
  const s = await import("../ui/uae-settings.js");
  assert.deepEqual(UNIT_CLASSES.filter((cls) => !s.isClassEnabled(cls)), [...CLASSES_OFF_BY_DEFAULT]);
  assert.deepEqual([...CLASSES_OFF_BY_DEFAULT], ["civilian"]);
  assert.equal(s.isExploreAllowed("civilian", "UNIT_SETTLER"), false);
  assert.equal(s.isUnitEnabled("UNIT_SWORDSMAN"), true);
  assert.equal(s.isExploreAllowed("land", "UNIT_SWORDSMAN"), true);
});

test("settings: a group off removes every unit in it; a unit off removes only that unit", async () => {
  installStorage();
  const s = await import("../ui/uae-settings.js");
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
  installStorage();
  const s = await import("../ui/uae-settings.js");
  s.setClassEnabled("civilian", true);
  assert.equal(s.isExploreAllowed("civilian", "UNIT_SETTLER"), true);
  s.setUnitEnabled("UNIT_SETTLER", false);
  assert.equal(s.isExploreAllowed("civilian", "UNIT_SETTLER"), false);
  assert.equal(s.isExploreAllowed("civilian", "UNIT_MIGRANT"), true);
});

test("settings: a unit outside every group is never touched", async () => {
  installStorage();
  const s = await import("../ui/uae-settings.js");
  s.setUnitEnabled("UNIT_BIPLANE", false);
  assert.equal(s.isExploreAllowed(null, "UNIT_BIPLANE"), true);
});

test("settings: writes keep other mods' slices and refuse to overwrite a value that is not a settings root", async () => {
  const data = installStorage({ modSettings: JSON.stringify({ "other-mod": { x: 7 } }) });
  const s = await import("../ui/uae-settings.js");
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
