// dig3-game.js: when the game places Modern dig sites (IMPROVEMENT_RUINS), and the dig-site probe from
// docs/dig-site-design.md. A crash-soak game script: soak-lib.js goes in front of it (tools/crash-soak), run in a
// Modern Play Now lab game. Run w2f-dig3, 2026-10-17 (Modern seed 4242, usual set): 11 of 12 checks passed.

// dig3-game.js (scratchpad, watch run 2 follow-up item 5): when does the game place Modern dig sites, then the rest of
// universal_auto-explore/docs/dig-site-design.md "The probe". Run with soak-lib.js prepended (lab-soak.sh), Modern
// Play Now, usual set. OPTS (JSON): {"hegemony":true} also researches Antiquity ruins after Hegemony (default true),
// {"mastery":true} tries Natural History's mastery for natural-wonder artifacts (default true).
//
// Offline answer being tested (H): dig sites are placed only when an Explorer (any unit with ExtractsArtifacts) uses
// Research Artifacts on a plot holding a building with ArchaeologyResearch (University, Museum), after Natural History
// (Exploration ruins) or Hegemony (Antiquity ruins); one research per continent per age. Natural History alone, the
// map generator (Modern has GenerateDiscoveries=0) and turn count place none.
// Disproof: ruins on the map before the research (R0/R1), or still 0 after a research the game accepted (R3).
const NAME = "dig3";
const OPTS = (() => { try { return JSON.parse('__OPTS__' || "{}"); } catch (_) { return {}; } })();
const NOARGS = () => ({ X: -9999, Y: -9999, UnitAbilityType: -1 }); // what unit-actions.js sends for a plot-less op
let local = -1;

function ctName(t) { return safe(() => String(GameInfo.Constructibles.lookup(t).ConstructibleType), "?" + t); }
function isResearchBuilding(t) { return !!safe(() => GameInfo.Buildings.lookup(t).ArchaeologyResearch, false); }
function isDigSite(t) { return !!safe(() => GameInfo.Constructibles.lookup(t).Archaeology, false); }
function at(id) { const u = Units.get(id); return u ? { x: u.location.x, y: u.location.y, moves: u.Movement?.movementMovesRemaining } : null; }
function op(id, type, args) {
  const c = safe(() => Game.UnitOperations.canStart(id, type, args || NOARGS(), false), null);
  return c ? { ok: !!c.Success, why: (c.FailureReasons || []).map((r) => safe(() => Locale.compose(r), r)), charges: c.ChargesRemaining } : null;
}
function continentOf(l) { return safe(() => GameplayMap.getContinentType(l.x, l.y), -1); }
function contName(c) { return safe(() => String(GameInfo.Continents.lookup(c).ContinentType), String(c)); }
function culture() { return safe(() => Players.get(local).Culture, null); }
function status(cont) {
  const C = culture();
  return {
    cont: contName(cont),
    status: safe(() => { const s = C.getContinentResearchStatus(cont); return s ? Locale.compose(s) : s; }, "ERR"),
    agesAvail: safe(() => C.getNumAgesAvailableToResearch(cont), "ERR"),
    ruralRuinCount: safe(() => C.getContinentRuralRuinCount(cont), "ERR"),
  };
}
// Every dig site on the map, revealed or not; keyed on the Constructibles row's Archaeology flag, not the type name.
function scanSites() {
  const t0 = Date.now(); const out = []; let n = 0;
  const W = GameplayMap.getGridWidth(), H = GameplayMap.getGridHeight();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (const id of (MapConstructibles.getConstructibles(x, y) || [])) {
    n++;
    const c = safe(() => Constructibles.getByComponentID(id), null); if (!c) continue;
    if (!isDigSite(c.type)) continue;
    out.push({ x, y, type: ctName(c.type), owner: GameplayMap.getOwner(x, y), cont: contName(continentOf({ x, y })),
      revealed: safe(() => GameplayMap.getRevealedState(local, x, y), "?"),
      hiddenFiltered: (safe(() => MapConstructibles.getHiddenFilteredConstructibles(x, y), []) || []).length,
      feature: safe(() => GameInfo.Features.lookup(GameplayMap.getFeatureType(x, y))?.FeatureType ?? "none", "?") });
  }
  return { sites: out, constructibles: n, ms: Date.now() - t0 };
}
function prereqMap() {
  const m = new Map();
  for (const r of GameInfo.ProgressionTreePrereqs) { const k = String(r.Node); if (!m.has(k)) m.set(k, []); m.get(k).push(String(r.PrereqNode)); }
  return m;
}
function depth(node) { return safe(() => Game.ProgressionTrees.getNode(local, GameInfo.ProgressionTreeNodes.lookup(node).$index).depthUnlocked, "?"); }
async function civic(node) {
  const prereqs = prereqMap();
  const chain = (n, out = new Set()) => { if (out.has(n)) return out; out.add(n); for (const q of prereqs.get(n) || []) chain(q, out); return out; };
  const done = (n) => !!safe(() => Players.get(local).Culture.isNodeUnlocked(n), false);
  const need = chain(node);
  for (let k = 0; k < 30 && !done(node); k++) {
    const next = [...need].find((n) => !done(n) && (prereqs.get(n) || []).every(done));
    if (next) sendOp(PlayerOperationTypes.SET_CULTURE_TREE_NODE, { ProgressionTreeNodeType: GameInfo.ProgressionTreeNodes.lookup(next).$index });
    safe(() => Players.grantYield(local, YieldTypes.YIELD_CULTURE, 6000));
    await roll(); await sleep(2500);
  }
  emit(`CIVIC ${node} unlocked=${done(node)} depth=${depth(node)} turn=${Game.turn}`);
  return done(node);
}
async function mastery(node) { // depth 2 of the same node; MOD_MO_NATURAL_WONDER_ARCHAEOLOGY sits at UnlockDepth 2
  for (let k = 0; k < 6 && !(depth(node) >= 2); k++) {
    sendOp(PlayerOperationTypes.SET_CULTURE_TREE_NODE, { ProgressionTreeNodeType: GameInfo.ProgressionTreeNodes.lookup(node).$index });
    safe(() => Players.grantYield(local, YieldTypes.YIELD_CULTURE, 6000));
    await roll(); await sleep(2500);
  }
  emit(`MASTERY ${node} depth=${depth(node)} turn=${Game.turn}`);
  return depth(node) >= 2;
}
// The player's research buildings (data-driven: any building with ArchaeologyResearch), complete ones only.
function researchPlots() {
  const out = []; const W = GameplayMap.getGridWidth(), H = GameplayMap.getGridHeight();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (GameplayMap.getOwner(x, y) !== local) continue;
    for (const id of (MapConstructibles.getConstructibles(x, y) || [])) {
      const c = safe(() => Constructibles.getByComponentID(id), null);
      if (c && isResearchBuilding(c.type)) out.push({ x, y, type: ctName(c.type), complete: c.complete !== false, damaged: !!c.damaged, cont: continentOf({ x, y }) });
    }
  }
  return out;
}
async function ensureResearchBuilding() {
  let have = researchPlots().filter((p) => p.complete && !p.damaged);
  emit(`R2 research buildings at start: ${J(researchPlots())}`);
  if (have.length) return { plot: have[0], forced: false };
  const cap = Players.get(local).Cities.getCapital();
  const tries = [cap.location, ...(safe(() => cap.getPurchasedPlots(), []) || []).map(locOf)]
    .filter((l) => safe(() => Districts.getAtLocation(l), null) && !GameplayMap.isWater(l.x, l.y));
  for (const l of tries.slice(0, 8)) {
    sendOp("CREATE_ELEMENT", { Kind: "CONSTRUCTIBLE", Type: "BUILDING_MUSEUM", Location: { x: l.x, y: l.y }, Parent: cap.id, Owner: local });
    await sleep(2500);
    have = researchPlots().filter((p) => p.complete && !p.damaged);
    emit(`R2 forced Museum on ${l.x},${l.y}: occ=${J(occupants(l))}`);
    if (have.length) return { plot: have[0], forced: true };
  }
  return null;
}
async function explorerAt(l) {
  const make = (p) => sendOp("CREATE_ELEMENT", { Kind: "UNIT", Type: "UNIT_EXPLORER", Location: { x: p.x, y: p.y }, Owner: local });
  const mine = (p) => (MapUnits.getUnits(p.x, p.y) || []).find((id) => id.owner === local && safe(() => GameInfo.Units.lookup(Units.get(id).type).UnitType, "") === "UNIT_EXPLORER");
  make(l); await sleep(1500);
  let ex = mine(l); if (ex) return ex;
  for (const n of ring1(l)) { // stack limit on the building's plot: step on from next door
    if (GameplayMap.isWater(n.x, n.y) || GameplayMap.isImpassable(n.x, n.y)) continue;
    make(n); await sleep(1500); ex = mine(n); if (!ex) continue;
    const WI = (await import("/base-standard/ui/world-input/world-input.js")).default;
    safe(() => WI.requestMoveOperation(ex, { X: l.x, Y: l.y })); await sleep(2500);
    if (at(ex) && at(ex).x === l.x && at(ex).y === l.y) return ex;
  }
  return null;
}
async function research(ex, label) {
  const added = []; let fired = 0;
  const onAdd = (d) => { const t = ctName(d?.constructibleType); if (isDigSite(d?.constructibleType)) added.push(`${d.location?.x},${d.location?.y}`); else if (/RUIN/.test(t)) added.push(`${t}@${d.location?.x},${d.location?.y}`); };
  const onRes = () => { fired++; };
  safe(() => engine.on("ConstructibleAddedToMap", onAdd)); safe(() => engine.on("RuinSitesResearched", onRes));
  const can = op(ex, "UNITOPERATION_RESEARCH_ARTIFACTS");
  emit(`${label} canStart RESEARCH_ARTIFACTS ${J(can)} at ${J(at(ex))}`);
  const sent = can && can.ok ? safe(() => Game.UnitOperations.sendRequest(ex, "UNITOPERATION_RESEARCH_ARTIFACTS", NOARGS()), "ERR") : "not sent";
  await sleep(4000);
  safe(() => engine.off("ConstructibleAddedToMap", onAdd)); safe(() => engine.off("RuinSitesResearched", onRes));
  emit(`${label} sent=${J(sent)} RuinSitesResearched x${fired} ConstructibleAddedToMap(dig site) ${J(added)} after=${J(op(ex, "UNITOPERATION_RESEARCH_ARTIFACTS"))}`);
  return { can, fired, added };
}
async function run() {
  local = GameContext.localPlayerID;
  await drainCinematics("start"); await clearScreens();
  const cap = Players.get(local).Cities.getCapital(); const home = continentOf(cap.location);
  emit(`R0 map ${GameplayMap.getGridWidth()}x${GameplayMap.getGridHeight()} size=${safe(() => GameInfo.Maps.lookup(GameplayMap.getMapSize()).MapSizeType, "?")} capital ${J(cap.location)} on ${contName(home)}`);
  emit(`R0 globals ${J([...GameInfo.GlobalParameters].filter((r) => /ARCHAEOLOGY|ARTIFACT/.test(r.Name)).map((r) => `${r.Name}=${r.Value}`))}`);
  const s0 = scanSites();
  emit(`R0 before Natural History: ${s0.sites.length} dig sites of ${s0.constructibles} constructibles; ${J(status(home))}`);
  check("R0 no dig site before Natural History", s0.sites.length === 0, J(s0.sites.slice(0, 6)));

  await civic("NODE_CIVIC_MO_MAIN_NATURAL_HISTORY");
  const s1 = scanSites();
  emit(`R1 after Natural History (turn ${Game.turn}): ${s1.sites.length} dig sites; ${J(status(home))}`);
  check("R1 Natural History alone places no dig site", s1.sites.length === 0, J(s1.sites.slice(0, 6)));

  const rb = await ensureResearchBuilding();
  if (!check("R2 a research building (ArchaeologyResearch)", !!rb, J(rb))) return finishNow("no research building");
  const rcont = rb.plot.cont;
  emit(`R2 using ${rb.plot.type} at ${rb.plot.x},${rb.plot.y} forced=${rb.forced}; ${J(status(rcont))}`);
  const ex = await explorerAt(rb.plot);
  if (!check("R3 an Explorer on the research building", !!ex, J(rb.plot))) return finishNow("no explorer");
  const r1 = await research(ex, "R3");
  const s2 = scanSites();
  emit(`R3 after research: ${s2.sites.length} dig sites in ${s2.ms} ms: ${J(s2.sites.slice(0, 12))}; ${J(status(rcont))}`);
  check("R3 the game accepted Research Artifacts", !!(r1.can && r1.can.ok), J(r1.can));
  check("R3 dig sites appear after Research Artifacts (H)", s2.sites.length > 0, String(s2.sites.length));
  check("R3 every new site is on the researched continent", s2.sites.length > 0 && s2.sites.every((s) => s.cont === contName(rcont)), J([...new Set(s2.sites.map((s) => s.cont))]));
  check("R3 the same continent can't be researched twice for one age", !(op(ex, "UNITOPERATION_RESEARCH_ARTIFACTS") || {}).ok, J(op(ex, "UNITOPERATION_RESEARCH_ARTIFACTS")));

  // --- dig-site-design.md "The probe" ---------------------------------------------------------------------------
  if (OPTS.mastery !== false) await mastery("NODE_CIVIC_MO_MAIN_NATURAL_HISTORY");
  safe(() => Visibility.revealAllPlots(local)); await sleep(4000); await drainCinematics("reveal"); await clearScreens();
  const s3 = scanSites();
  emit(`P1 ${s3.sites.length} dig sites, scan ${s3.ms} ms over ${s3.constructibles} constructibles`);
  check("P1 the dig sites can be listed from script", s3.sites.length > 0, String(s3.sites.length));
  const W = GameplayMap.getGridWidth(), H = GameplayMap.getGridHeight();
  const nw = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (safe(() => GameplayMap.isNaturalWonder(x, y), false) && safe(() => Players.get(local).Stats.hasNaturalWonderArtifact(GameplayMap.getFeatureType(x, y)), false)) nw.push(`${x},${y}`);
  emit(`P2 natural wonders with an artifact (mastery depth ${depth("NODE_CIVIC_MO_MAIN_NATURAL_HISTORY")}): ${J(nw)}`);

  const from = at(ex);
  const near = s3.sites.filter((r) => r.owner === local || r.owner < 0).map((r) => ({ ...r, d: GameplayMap.getPlotDistance(from.x, from.y, r.x, r.y) })).sort((a, b) => a.d - b.d).slice(0, 4);
  const paths = near.map((r) => { const p = safe(() => Units.getPathTo(ex, { x: r.x, y: r.y }), null); return { at: `${r.x},${r.y}`, d: r.d, plots: p && p.plots ? p.plots.length : null, turns: p && p.turns ? (Array.isArray(p.turns) ? p.turns[p.turns.length - 1] : p.turns) : null }; });
  emit(`P3 paths ${J(paths)}`);
  const target = near.find((r, i) => paths[i].plots > 0 && r.d >= 3) || near.find((r, i) => paths[i].plots > 0);
  if (check("P3 a reachable dig site", !!target, J(paths))) {
    emit(`P5 excavate before the move ${J(op(ex, "UNITOPERATION_EXCAVATE"))}`);
    const WI = (await import("/base-standard/ui/world-input/world-input.js")).default;
    const sent = safe(() => WI.requestMoveOperation(ex, { X: target.x, Y: target.y }), "ERR"); await sleep(3000);
    const track = [J(at(ex))];
    for (let t = 0; t < 8 && !(at(ex) && at(ex).x === target.x && at(ex).y === target.y); t++) { await roll(); await sleep(2500); track.push(J(at(ex))); }
    emit(`P4 move to ${target.x},${target.y} sent=${J(sent)} track ${track.join(" -> ")}`);
    const arrived = !!at(ex) && at(ex).x === target.x && at(ex).y === target.y;
    check("P4 the Explorer arrived across turns", arrived, track.join(" "));
    if (arrived) {
      const ce = op(ex, "UNITOPERATION_EXCAVATE"); const ceXY = op(ex, "UNITOPERATION_EXCAVATE", { X: target.x, Y: target.y });
      emit(`P5 excavate at arrival ${J(ce)} (with X,Y ${J(ceXY)}) on ${J(occupants(target))}`);
      check("P5 Excavate can start on the site", !!(ce && ce.ok) || !!(ceXY && ceXY.ok), J(ce));
      let gw = 0; const onGW = () => { gw++; }; safe(() => engine.on("GreatWorkCreated", onGW));
      if (ce && ce.ok) safe(() => Game.UnitOperations.sendRequest(ex, "UNITOPERATION_EXCAVATE", NOARGS()));
      const turns = Number(safe(() => [...GameInfo.GlobalParameters].find((r) => r.Name === "UNIT_EXTRACT_ARTIFACT_TURNS").Value, 4)) || 4;
      for (let t = 0; t <= turns + 1 && occupants(target).some((o) => /RUINS/.test(o.type)); t++) { await roll(); await sleep(2500); }
      safe(() => engine.off("GreatWorkCreated", onGW));
      emit(`P5 after ${turns}+ turns of excavating: site ${J(occupants(target))} GreatWorkCreated x${gw} explorer ${J(at(ex))}`);
      check("P5 the dig finishes and clears the site", !occupants(target).some((o) => /RUINS/.test(o.type)), J(occupants(target)));
    }
  }
  const foreign = s3.sites.find((r) => r.owner >= 0 && r.owner !== local && Players.get(r.owner)?.isMajor);
  if (foreign) {
    sendOp("CREATE_ELEMENT", { Kind: "UNIT", Type: "UNIT_EXPLORER", Location: { x: foreign.x, y: foreign.y }, Owner: local }); await sleep(1500);
    const ex2 = (MapUnits.getUnits(foreign.x, foreign.y) || []).find((id) => id.owner === local);
    emit(`P5 inside player ${foreign.owner}'s borders at ${foreign.x},${foreign.y}: explorer=${!!ex2} excavate ${J(ex2 ? op(ex2, "UNITOPERATION_EXCAVATE") : null)} war=${safe(() => Players.get(local).Diplomacy.isAtWarWith(foreign.owner))}`);
  } else emit("P5 no dig site inside another major's borders");

  // --- Antiquity ruins: Hegemony opens the second research on the same continent ---------------------------------
  if (OPTS.hegemony !== false) {
    const before = scanSites().sites.length;
    await civic("NODE_CIVIC_MO_MAIN_HEGEMONY");
    const mid = scanSites().sites.length;
    emit(`H1 after Hegemony: ${mid} dig sites (was ${before}); ${J(status(rcont))}`);
    check("H1 Hegemony alone places no dig site", mid === before, `${before} -> ${mid}`);
    const ex3 = await explorerAt(rb.plot);
    if (ex3) {
      await research(ex3, "H2");
      const after = scanSites();
      emit(`H2 after the second research: ${after.sites.length} dig sites (was ${mid}); ${J(status(rcont))}`);
      check("H2 the second research adds Antiquity sites", after.sites.length > mid, `${mid} -> ${after.sites.length}`);
    } else emit("H2 no Explorer on the research building");
  }
  finishNow("dig3");
}
