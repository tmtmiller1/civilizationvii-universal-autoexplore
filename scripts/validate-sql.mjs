import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = join(root, "data", "grant-autoexplore.sql");
const sql = readFileSync(sqlPath, "utf8");

function mustMatch(re, message) {
  if (!re.test(sql)) {
    throw new Error(message);
  }
}

mustMatch(/INSERT\s+OR\s+IGNORE\s+INTO\s+TypeTags\s*\(\s*Type\s*,\s*Tag\s*\)/i,
  "Missing INSERT OR IGNORE INTO TypeTags (Type, Tag) statement");
mustMatch(/SELECT\s+\w+\.UnitType\s*,\s*'UNIT_CLASS_AUTOEXPLORE'\s+FROM\s+Units/i,
  "Missing SELECT <alias>.UnitType, 'UNIT_CLASS_AUTOEXPLORE' FROM Units projection");
// The combat grant is scoped by formation class; non-combat units come in only
// through the separate CoreClass grant below, which the Options screen's
// Civilian group gates (off by default).
mustMatch(/FORMATION_CLASS_RECON/i, "Missing FORMATION_CLASS_RECON in scope");
mustMatch(/FORMATION_CLASS_LAND_COMBAT/i, "Missing FORMATION_CLASS_LAND_COMBAT in scope");
mustMatch(/FORMATION_CLASS_NAVAL/i, "Missing FORMATION_CLASS_NAVAL in scope");
for (const banned of ["CIVILIAN", "COMMAND", "AIR"]) {
  if (new RegExp(`FORMATION_CLASS_${banned}`, "i").test(sql)) {
    throw new Error(`Scope must NOT include FORMATION_CLASS_${banned} (crashes explore AI)`);
  }
}
mustMatch(/FoundCity\s*=\s*0/i, "Missing FoundCity = 0 civilian guard");
mustMatch(/CoreClass\s+IN\s*\(\s*'CORE_CLASS_CIVILIAN'\s*,\s*'CORE_CLASS_SUPPORT'\s*\)/i,
  "Missing the non-combat (CoreClass) grant for the Civilian group");
// Aircraft must never be tagged.
mustMatch(/Domain\s+IN\s*\(\s*'DOMAIN_LAND'\s*,\s*'DOMAIN_SEA'\s*\)/i,
  "The non-combat grant must be limited to DOMAIN_LAND and DOMAIN_SEA");
if (/DOMAIN_AIR/i.test(sql)) throw new Error("Scope must NOT include DOMAIN_AIR");
mustMatch(/UnitType\s+NOT\s+LIKE\s*'%SANDBOX%'/i,
  "Missing SANDBOX exclusion");

// The lens marker. Its Tags row has to come before any TypeTags row that uses it (TypeTags.Tag has a foreign key to
// Tags, and a failed key at game creation stops every mod loading), and each marker statement must skip units that
// already carry the game's tag, so the game's own explorers keep the Discovery lens.
const MARKER = "UNIT_CLASS_UAE_GRANTED";
const tagsRow = sql.search(/INSERT\s+OR\s+IGNORE\s+INTO\s+Tags\s*\(\s*Tag\s*,\s*Category\s*\)\s*SELECT\s+'UNIT_CLASS_UAE_GRANTED'/i);
if (tagsRow < 0) throw new Error(`Missing the ${MARKER} Tags row (INSERT OR IGNORE INTO Tags ... SELECT)`);
if (!/FROM\s+TagCategories\s+\w+\s+WHERE\s+\w+\.Category\s*=\s*'UNIT_CLASS'/i.test(sql)) {
  throw new Error(`The ${MARKER} Tags row must select through TagCategories`);
}
const statements = sql.replace(/--[^\n]*/g, "").split(";").map((st) => st.trim()).filter(Boolean);
const markerRows = statements.filter((st) => /INTO\s+TypeTags/i.test(st) && st.includes(MARKER));
if (markerRows.length !== 2) throw new Error(`Expected 2 ${MARKER} marker statements, found ${markerRows.length}`);
for (const st of markerRows) {
  if (sql.indexOf(st) < tagsRow) throw new Error(`A ${MARKER} TypeTags row comes before its Tags row`);
  if (!/JOIN\s+Tags\s+\w+\s+ON\s+\w+\.Tag\s*=\s*'UNIT_CLASS_UAE_GRANTED'/i.test(st)) {
    throw new Error(`Each ${MARKER} marker statement must select through Tags`);
  }
  if (!/NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+TypeTags[^)]*'UNIT_CLASS_AUTOEXPLORE'/i.test(st)) {
    throw new Error(`Each ${MARKER} marker statement must skip units that already carry UNIT_CLASS_AUTOEXPLORE`);
  }
}
// Each marker sits right before the grant it marks for.
const grants = statements.filter((st) => /INTO\s+TypeTags/i.test(st) && !st.includes(MARKER));
for (const [i, st] of markerRows.entries()) {
  if (statements.indexOf(grants[i]) !== statements.indexOf(st) + 1) {
    throw new Error(`${MARKER} marker statement ${i + 1} must come right before grant ${i + 1}`);
  }
}

console.log("validate-sql: PASS");
