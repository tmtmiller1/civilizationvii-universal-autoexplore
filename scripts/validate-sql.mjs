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
// Safety-critical scope: only explore-capable formation classes may carry the
// tag. Civilians (Settlers/Migrants/Merchants), commanders, and aircraft crash
// the base auto-explore pathing AI, so they MUST stay out of this grant.
mustMatch(/FORMATION_CLASS_RECON/i, "Missing FORMATION_CLASS_RECON in scope");
mustMatch(/FORMATION_CLASS_LAND_COMBAT/i, "Missing FORMATION_CLASS_LAND_COMBAT in scope");
mustMatch(/FORMATION_CLASS_NAVAL/i, "Missing FORMATION_CLASS_NAVAL in scope");
for (const banned of ["CIVILIAN", "COMMAND", "AIR"]) {
  if (new RegExp(`FORMATION_CLASS_${banned}`, "i").test(sql)) {
    throw new Error(`Scope must NOT include FORMATION_CLASS_${banned} (crashes explore AI)`);
  }
}
mustMatch(/FoundCity\s*=\s*0/i, "Missing FoundCity = 0 civilian guard");
mustMatch(/UnitType\s+NOT\s+LIKE\s*'%SANDBOX%'/i,
  "Missing SANDBOX exclusion");

console.log("validate-sql: PASS");
