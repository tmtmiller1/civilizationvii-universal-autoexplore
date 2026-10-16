// lens-keep.test.mjs - Universal Auto Explore: the map lens on selection.
//
// A stand-in handler copies the branch order of the base game's setUnitLens (interface-mode-unit-selected.js, 1.5.0)
// and a stand-in LensManager records each lens it's asked for. Unit types are real ones from the compiled database.
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMarkedSet, installLensKeep, withDiscoveryKept, MARKER_TAG, DISCOVERY_LENS, DEFAULT_LENS,
} from "../ui/uae-lens-keep.js";

const UNITS = {
  UNIT_SCOUT: { FormationClass: "FORMATION_CLASS_RECON" },
  UNIT_WARRIOR: { FormationClass: "FORMATION_CLASS_LAND_COMBAT" },
  UNIT_MISSIONARY: { FormationClass: "FORMATION_CLASS_CIVILIAN" },
  UNIT_GALLEY: { FormationClass: "FORMATION_CLASS_NAVAL" },
  UNIT_FOUNDER: { FormationClass: "FORMATION_CLASS_CIVILIAN", FoundCity: true },
};
const lookup = (type) => UNITS[type];

/** TypeTags with the game's tag on the Scout and the mod's grant (and marker) on the rest. */
const TYPE_TAGS = [
  { Tag: "UNIT_CLASS_AUTOEXPLORE", Type: "UNIT_SCOUT" },
  ...["UNIT_WARRIOR", "UNIT_MISSIONARY", "UNIT_GALLEY", "UNIT_FOUNDER"].flatMap((Type) => [
    { Tag: "UNIT_CLASS_AUTOEXPLORE", Type },
    { Tag: MARKER_TAG, Type },
  ]),
  { Tag: "UNIT_CLASS_MELEE", Type: "UNIT_WARRIOR" },
];
const EXPLORE = new Set(TYPE_TAGS.filter((t) => t.Tag === "UNIT_CLASS_AUTOEXPLORE").map((t) => t.Type));

function lensManager() {
  const lm = { active: DEFAULT_LENS, calls: [] };
  lm.setActiveLens = function (lens) {
    this.calls.push(lens);
    this.active = lens;
  };
  return lm;
}

/** A handler shaped like the game's: setUnitLens on the prototype, unit ids are unit types here. */
function handlerFor(lm) {
  class UnitSelected {
    setUnitLens(unitID) {
      const def = UNITS[unitID];
      if (def.FoundCity) lm.setActiveLens("fxs-founder-lens");
      else if (EXPLORE.has(unitID)) lm.setActiveLens(DISCOVERY_LENS);
      else lm.setActiveLens(DEFAULT_LENS);
    }
  }
  return new UnitSelected();
}

function setup(ageType = "AGE_ANTIQUITY") {
  const marked = buildMarkedSet(TYPE_TAGS, lookup, ageType);
  const lm = lensManager();
  const handler = handlerFor(lm);
  const warnings = [];
  const ok = installLensKeep(handler, lm, (id) => marked.has(id), (m) => warnings.push(m));
  return { marked, lm, handler, warnings, ok };
}

test("marked set: only the marker tag, Exploration warships left out", () => {
  assert.deepEqual([...buildMarkedSet(TYPE_TAGS, lookup, "AGE_ANTIQUITY")].sort(),
    ["UNIT_FOUNDER", "UNIT_GALLEY", "UNIT_MISSIONARY", "UNIT_WARRIOR"]);
  assert.deepEqual([...buildMarkedSet(TYPE_TAGS, lookup, "AGE_EXPLORATION")].sort(),
    ["UNIT_FOUNDER", "UNIT_MISSIONARY", "UNIT_WARRIOR"]);
  assert.equal(buildMarkedSet([], lookup, "AGE_MODERN").size, 0);
});

test("a marked unit keeps the default lens, set once", () => {
  const { lm, handler, ok, warnings } = setup();
  assert.equal(ok, true);
  assert.deepEqual(warnings, []);
  for (const unit of ["UNIT_WARRIOR", "UNIT_MISSIONARY", "UNIT_GALLEY"]) {
    lm.calls = [];
    handler.setUnitLens(unit);
    assert.deepEqual(lm.calls, [DEFAULT_LENS], unit);
  }
});

test("the game's own explore unit still opens the Discovery lens", () => {
  const { lm, handler } = setup();
  handler.setUnitLens("UNIT_SCOUT");
  assert.deepEqual(lm.calls, [DISCOVERY_LENS]);
});

test("a marked unit with a lens of its own keeps that lens", () => {
  const { lm, handler } = setup();
  handler.setUnitLens("UNIT_FOUNDER");
  assert.deepEqual(lm.calls, ["fxs-founder-lens"]);
});

test("setActiveLens is put back after each call, also when the method throws", () => {
  const { lm, handler } = setup();
  const original = lm.setActiveLens;
  handler.setUnitLens("UNIT_WARRIOR");
  assert.equal(lm.setActiveLens, original);
  assert.equal(Object.hasOwn(lm, "setActiveLens"), true);
  assert.throws(() => withDiscoveryKept(lm, () => {
    throw new Error("boom");
  }), /boom/);
  assert.equal(lm.setActiveLens, original);
  // A Discovery lens chosen outside the call, from the mini-map for example, goes through.
  lm.calls = [];
  lm.setActiveLens(DISCOVERY_LENS);
  assert.deepEqual(lm.calls, [DISCOVERY_LENS]);
});

test("a prototype method (a class LensManager) is restored by deleting the stand-in", () => {
  class LM {
    constructor() {
      this.calls = [];
    }
    setActiveLens(lens) {
      this.calls.push(lens);
    }
  }
  const lm = new LM();
  withDiscoveryKept(lm, () => lm.setActiveLens(DISCOVERY_LENS));
  assert.deepEqual(lm.calls, [DEFAULT_LENS]);
  assert.equal(Object.hasOwn(lm, "setActiveLens"), false);
});

test("a prototype patch made after the wrapper (Map Trix) still runs, and its own lens goes through", () => {
  const { lm, handler } = setup();
  const proto = Object.getPrototypeOf(handler);
  const base = proto.setUnitLens;
  proto.setUnitLens = function (unitID) {
    if (unitID === "UNIT_MISSIONARY") {
      lm.setActiveLens("bz-religion-lens");
      return undefined;
    }
    return base.call(this, unitID);
  };
  handler.setUnitLens("UNIT_MISSIONARY");
  handler.setUnitLens("UNIT_WARRIOR");
  handler.setUnitLens("UNIT_SCOUT");
  assert.deepEqual(lm.calls, ["bz-religion-lens", DEFAULT_LENS, DISCOVERY_LENS]);
});

test("an instance patch made before the wrapper is kept and called", () => {
  const lm = lensManager();
  const handler = handlerFor(lm);
  const seen = [];
  const proto = Object.getPrototypeOf(handler);
  handler.setUnitLens = function (unitID) {
    seen.push(unitID);
    return proto.setUnitLens.call(this, unitID);
  };
  const marked = buildMarkedSet(TYPE_TAGS, lookup, "AGE_ANTIQUITY");
  installLensKeep(handler, lm, (id) => marked.has(id), () => {});
  handler.setUnitLens("UNIT_WARRIOR");
  assert.deepEqual(seen, ["UNIT_WARRIOR"]);
  assert.deepEqual(lm.calls, [DEFAULT_LENS]);
});

test("a check that throws leaves the game's lens as it was", () => {
  const lm = lensManager();
  const handler = handlerFor(lm);
  installLensKeep(handler, lm, () => {
    throw new Error("no unit");
  }, () => {});
  handler.setUnitLens("UNIT_WARRIOR");
  assert.deepEqual(lm.calls, [DISCOVERY_LENS]);
});

test("method missing: nothing is changed and one warning is logged", () => {
  const lm = lensManager();
  const warnings = [];
  const handler = {};
  assert.equal(installLensKeep(handler, lm, () => true, (m) => warnings.push(m)), false);
  assert.equal(Object.hasOwn(handler, "setUnitLens"), false);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /setUnitLens/);

  const noHandler = [];
  assert.equal(installLensKeep(null, lm, () => true, (m) => noHandler.push(m)), false);
  assert.equal(installLensKeep({ setUnitLens() {} }, {}, () => true, (m) => noHandler.push(m)), false);
  assert.equal(noHandler.length, 2);
});
