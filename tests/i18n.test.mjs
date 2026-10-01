// i18n.test.mjs - Universal Auto Explore: every string a player sees can be translated.
//
// text/en_us is the source of truth (see text/README.md). This checks that every LOC_ key the data and modinfo use
// has English text; that no tag is defined twice (a duplicate tag makes the game drop the whole file); that each
// translation folder holds exactly the English tags, under the right Language, with the same {placeholders} and
// [icon:...] tags and [B]/[BLIST]/[LI] markup as the English, and page titles that fit the Civilopedia sidebar; and
// that each one is registered in the modinfo.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(p, "utf8");
const files = (dir, ext) => fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
const MODINFO = "universal-auto-explore.modinfo";

/** The folder name and the Language attribute the game expects for it. */
export const LANGUAGES = {
  de_de: "de_DE", es_es: "es_ES", fr_fr: "fr_FR", it_it: "it_IT", ja_jp: "ja_JP", ko_kr: "ko_KR",
  pl_pl: "pl_PL", pt_br: "pt_BR", ru_ru: "ru_RU", zh_cn: "zh_Hans_CN",
};

/** Base-game keys the mod uses without defining. */
const BASE_KEYS = new Set(["LOC_MODULE_BASE_STANDARD_NAME"]);

/** tag -> text, for every Row (English) or Replace (translation) in the given files. */
function textsIn(paths) {
  const out = new Map();
  const dups = [];
  for (const p of paths) {
    for (const m of read(p).matchAll(/<(?:Row|Replace)\s+Tag="([A-Z0-9_]+)"[^>]*>\s*<Text>([\s\S]*?)<\/Text>/g)) {
      if (out.has(m[1])) dups.push(m[1]);
      out.set(m[1], m[2]);
    }
  }
  return { texts: out, dups };
}

const english = textsIn(files("text/en_us", ".xml"));
const translations = () => fs.readdirSync("text", { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "en_us");

test("i18n: no English tag is defined twice", () => {
  assert.deepEqual(english.dups, []);
});

test("i18n: every key the data and modinfo use has English text", () => {
  const missing = new Set();
  for (const p of [...files("data", ".sql"), ...files("data", ".xml"), MODINFO]) {
    const body = read(p).replace(/<!--[\s\S]*?-->/g, "").replace(/--.*$/gm, "");
    for (const m of body.matchAll(/LOC_[A-Z0-9_]*[A-Z0-9]/g)) {
      if (!BASE_KEYS.has(m[0]) && !english.texts.has(m[0])) missing.add(`${m[0]} (${p})`);
    }
  }
  assert.deepEqual([...missing], []);
});

const markup = (s) => ["[B]", "[/B]", "[BLIST]", "[LI]", "[/LIST]"].map((t) => s.split(t).length - 1).join(",");
// The Civilopedia sidebar cuts page titles longer than this.
const MAX_TAB_CHARS = 24;
const marks = (s) => [...s.matchAll(/\{[0-9]+_[A-Za-z]+[^}]*\}|\[icon:[A-Z0-9_]+\]/g)].map((m) => m[0].replace(/:.*\}$/, "}")).sort();

test("i18n: each translation has exactly the English tags, its Language, and the same placeholders", () => {
  assert.equal(translations().length, Object.keys(LANGUAGES).length, "every language the game ships has a folder");
  for (const d of translations()) {
    const lang = LANGUAGES[d.name];
    assert.ok(lang, `text/${d.name}: not a folder the game knows (use one of ${Object.keys(LANGUAGES).join(", ")})`);
    const paths = files(path.join("text", d.name), ".xml");
    for (const p of paths) {
      for (const m of read(p).matchAll(/<Replace\s+Tag="[A-Z0-9_]+"\s+Language="([^"]+)"/g)) {
        assert.equal(m[1], lang, `${p}: Language="${m[1]}", expected "${lang}"`);
      }
      assert.ok(!/<Row\s+Tag=/.test(read(p)), `${p}: translations use <Replace Tag=... Language=...>, not <Row>`);
    }
    const { texts, dups } = textsIn(paths);
    assert.deepEqual(dups, [], `text/${d.name}: tags defined twice`);
    const want = [...english.texts.keys()].filter((k) => !texts.has(k));
    const extra = [...texts.keys()].filter((k) => !english.texts.has(k));
    assert.deepEqual({ missing: want, extra }, { missing: [], extra: [] }, `text/${d.name}`);
    for (const [k, v] of texts) {
      assert.ok(v.trim(), `text/${d.name} ${k}: empty`);
      assert.deepEqual(marks(v), marks(english.texts.get(k)), `text/${d.name} ${k}: placeholders or icons differ`);
      assert.equal(markup(v), markup(english.texts.get(k)), `text/${d.name} ${k}: [B]/[BLIST]/[LI] markup differs`);
      if (/^LOC_PEDIA_[A-Z]+_PAGE_[A-Z0-9_]+_TITLE$/.test(k) && !k.includes("_CHAPTER_")) {
        assert.ok([...v].length <= MAX_TAB_CHARS, `text/${d.name} ${k}: "${v}" is longer than the sidebar's ${MAX_TAB_CHARS} characters`);
      }
    }
  }
});

test("i18n: each translation is registered in the modinfo for the menu and the game", () => {
  const modinfo = read(MODINFO);
  for (const d of translations()) {
    const lang = LANGUAGES[d.name];
    const count = modinfo.split(`<Item locale="${lang}">text/${d.name}/ModuleText.xml</Item>`).length - 1;
    assert.equal(count, 2, `text/${d.name}/ModuleText.xml: register it in the shell group and the game group`);
  }
  for (const m of modinfo.matchAll(/<Item locale="([^"]+)">text\/([a-z_]+)\//g)) {
    assert.ok(fs.existsSync(path.join("text", m[2])), `modinfo names text/${m[2]}, which does not exist`);
    assert.equal(LANGUAGES[m[2]], m[1], `modinfo: text/${m[2]} registered as ${m[1]}`);
  }
  assert.equal(modinfo.split("<Item>text/en_us/ModuleText.xml</Item>").length - 1, 2, "English in both groups");
});
