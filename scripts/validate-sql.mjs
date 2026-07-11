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
mustMatch(/SELECT\s+Type\s*,\s*'UNIT_CLASS_AUTOEXPLORE'\s+FROM\s+Types/i,
  "Missing SELECT Type, 'UNIT_CLASS_AUTOEXPLORE' FROM Types projection");
mustMatch(/Kind\s*=\s*'KIND_UNIT'/i,
  "Missing KIND_UNIT filter");
mustMatch(/Type\s+NOT\s+LIKE\s*'%SANDBOX%'/i,
  "Missing SANDBOX exclusion");

console.log("validate-sql: PASS");
