# Translating Universal Auto Explore (`text/`)

Every string a player sees from this mod is a `LOC_*` tag defined here: the mod's name and description, shown in the
Additional Content list, and the Civilopedia page "Automate Exploration" (Game Concepts, under Combat). The mod adds
no other UI; the Automate Exploration action it unlocks is the game's own and is already translated by the game. A
translation needs no code change: add the language's file here and two lines to the modinfo.

## Files

| File | Contents |
| --- | --- |
| `en_us/ModuleText.xml` | The source of truth (13 tags): the mod's name and description, and the Civilopedia page's title, chapter titles, paragraphs and two search terms (`LOC_PEDIA_CONCEPTS_PAGE_UAE_AUTOEXPLORE_*`, `LOC_PEDIA_UAE_TERM_*`). The page's structure is in `data/uae-civilopedia.xml`. |
| `<lang>/ModuleText.xml` | The same tags in one language. |

All ten languages ship as machine translations (2026-10-01) that use the game's own words for its terms (the
Automate Exploration action, Scouts, Settlers, Commanders, civilian and naval units, Discoveries, Zone of Control,
Independent Powers), taken from the game's l10n files. Where the Civilopedia page restates the game's own description
of the action, it follows the game's sentence in that language. To correct one, edit its `<Text>`; to change the English, edit the English and update every language.

## Two file shapes

English uses an `EnglishText` block with `Row`:

```xml
<Database>
    <EnglishText>
        <Row Tag="LOC_MOD_UNIVERSAL_AUTO_EXPLORE_NAME"><Text>Universal Auto Explore</Text></Row>
    </EnglishText>
</Database>
```

Every other language uses a `LocalizedText` block with `Replace` and a `Language` attribute:

```xml
<Database>
    <LocalizedText>
        <Replace Tag="LOC_MOD_UNIVERSAL_AUTO_EXPLORE_NAME" Language="de_DE"><Text>Universelle automatische Erkundung</Text></Replace>
    </LocalizedText>
</Database>
```

**The `Language` value is not the folder name.** Use these exactly (note `zh_cn`):

| Folder | `Language=` | Folder | `Language=` |
| --- | --- | --- | --- |
| `de_de` | `de_DE` | `pl_pl` | `pl_PL` |
| `es_es` | `es_ES` | `pt_br` | `pt_BR` |
| `fr_fr` | `fr_FR` | `ru_ru` | `ru_RU` |
| `it_it` | `it_IT` | `zh_cn` | `zh_Hans_CN` |
| `ja_jp` | `ja_JP` | `ko_kr` | `ko_KR` |

## Registering a language in the modinfo

Each file is listed twice in `universal-auto-explore.modinfo`, with a `locale` attribute: once in the shell group
(the Additional Content list in the main menu) and once in the game group (the same list opened from a game in
progress). For German:

```xml
<!-- universal-auto-explore-shell and universal-auto-explore-grant, under <UpdateText> -->
<Item locale="de_DE">text/de_de/ModuleText.xml</Item>
```

## Rules

- **Every tag, in every language.** Each language must hold exactly the English tags. The game loads one language at
  a time, so a tag missing from a translation shows as the raw `LOC_...` key to that language's players.
- **Keep the markup.** `[B]...[/B]` is bold; `[BLIST][LI]...[LI]...[/LIST]` is a bulleted list. Each translation
  must have the same count of each as the English.
- **Page titles stay short.** The Civilopedia sidebar cuts titles longer than 24 characters, so a title may be shorter
  than the action's full name (Russian uses «Автоисследование»).
- **No duplicate tags.** A tag defined twice in one file makes the game drop the whole file.

## Checking a translation

`npm run verify` (`tests/i18n.test.mjs`) fails when a translation is missing a tag or has an extra one, uses the
wrong `Language`, uses `Row` instead of `Replace`, defines a tag twice, is empty, changes the markup, has a page title
too long for the sidebar, or is not registered in both modinfo groups. It also checks that every key the data and
modinfo use has English text. `tests/pedia-pages.test.mjs` checks that the page resolves the way the Civilopedia
looks it up: every chapter finds its text, with no gap in the paragraph numbers.
