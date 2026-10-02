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

console.log("validate-sql: PASS");
