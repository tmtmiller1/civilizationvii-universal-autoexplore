// uae-mod-options.js
//
// Shared "Mods" category bootstrap for the Civ VII Options screen.
// Idempotent and safe to load alongside other mods that define the same
// category (e.g. demographics ships an identical bootstrap).

import { CategoryType } from "/core/ui/options/model-options.js";
import { CategoryData } from "/core/ui/options/options-helpers.js";

// This module runs at shell scope (the main menu), so an exception here bubbles into the FrontEnd UI context and
// can take the whole main menu down. The writes below mutate engine-owned objects imported from /core/ui/options;
// a later game patch could freeze or reshape them (ES modules are strict mode, so writing a frozen object throws)
// or leave either one null. The try/catch swallows a write that throws, and the else branch reports a missing
// Options model. Either way the worst outcome is the mod's options not appearing under "Mods", never a broken menu.
try {
  if (!CategoryType || !CategoryData) {
    console.warn(
      "[UniversalAutoExplore.mod-options] Options model unavailable; Mods category not registered."
    );
  } else {
    if (!CategoryType.Mods) {
      CategoryType.Mods = "mods";
    }
    if (!CategoryData[CategoryType.Mods]) {
      CategoryData[CategoryType.Mods] = {
        title: "LOC_UI_CONTENT_MGR_SUBTITLE",
        description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION"
      };
    }
  }
} catch (e) {
  console.warn("[UniversalAutoExplore.mod-options] Mods-category bootstrap skipped:", e);
}
