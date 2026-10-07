#!/usr/bin/env bash
# release.sh: produce a clean zip + Steam Workshop manifest for Universal Auto Explore.
#
# Usage:  ./release.sh
# Output: dist/universal-auto-explore-vX.Y.Z.zip   (X.Y.Z from the modinfo <Version>)
#         dist/universal_auto-explore/             (upload content folder for steamcmd)
#         dist/workshop_item.vdf                   (steamcmd build manifest)
#         dist/preview.png                         (rendered from docs/workshop-preview.svg)
#
# One SQL patch, one Civilopedia page, localized text and a few plain UI scripts (the Options rows), so there is
# no build step. The quality gate is lint, the SQL validator and the Node tests, run through
# `npm run release:gate` like every other tower mod. Then it mirrors, audits and packages.
# It never uploads: it prints the steamcmd command for you to run with your login.

set -euo pipefail
cd "$(dirname "$0")"

MOD_SLUG="universal_auto-explore"          # source dir + zip root
MODINFO="universal-auto-explore.modinfo"   # modinfo filename
TITLE="Universal Auto Explore"             # Workshop item title
APPID="1295660"                            # Sid Meier's Civilization VII

DIST_DIR="dist"

# Locate the modinfo (run from here or from the parent)
if [ -f "$MODINFO" ]; then
    SRC_DIR="."
elif [ -f "$MOD_SLUG/$MODINFO" ]; then
    SRC_DIR="$MOD_SLUG"
else
    echo "error: no $MODINFO in $(pwd) or $(pwd)/$MOD_SLUG/"
    exit 1
fi

# Version + author gates
VERSION="$(grep -oE '<Version>[^<]+</Version>' "$SRC_DIR/$MODINFO" \
    | head -1 | sed -E 's|</?Version>||g')"
[ -n "$VERSION" ] || { echo "error: could not parse <Version> from $MODINFO"; exit 1; }

AUTHORS="$(grep -oE '<Authors>[^<]+</Authors>' "$SRC_DIR/$MODINFO" \
    | head -1 | sed -E 's|</?Authors>||g')"
case "$AUTHORS" in
    ""|"Your Name"|"TODO")
        echo "error: <Authors> in $MODINFO is '$AUTHORS'; set a release author name first."
        exit 1 ;;
esac

# Quality gate: `release:gate` runs lint, the SQL validator and the tests; a red build is not packaged.
# Set SKIP_VERIFY=1 to bypass, for a hotfix when the gate is known to be red.
if [ "${SKIP_VERIFY:-0}" != "1" ] && [ -f "$SRC_DIR/package.json" ]; then
    echo "release: running 'npm run release:gate' (set SKIP_VERIFY=1 to skip)..."
    ( cd "$SRC_DIR" && npm run release:gate ) \
        || { echo "release: 'npm run release:gate' FAILED — aborting."; exit 1; }
fi

# Workshop published file id, kept outside dist/ so it survives rm -rf
WORKSHOP_ID_FILE="$SRC_DIR/steam_workshop_id.txt"
PUBLISHED_FILE_ID="${WORKSHOP_PUBLISHED_FILE_ID:-}"
SAVED_PUBLISHED_FILE_ID=""
if [ -f "$WORKSHOP_ID_FILE" ]; then
    SAVED_PUBLISHED_FILE_ID="$(tr -dc '0-9' < "$WORKSHOP_ID_FILE")"
fi
if [ -n "$PUBLISHED_FILE_ID" ] && [ -n "$SAVED_PUBLISHED_FILE_ID" ] \
    && [ "$PUBLISHED_FILE_ID" != "$SAVED_PUBLISHED_FILE_ID" ]; then
    echo "error: WORKSHOP_PUBLISHED_FILE_ID ($PUBLISHED_FILE_ID) conflicts with"
    echo "       steam_workshop_id.txt ($SAVED_PUBLISHED_FILE_ID). Refusing to override."
    exit 1
fi
if [ -z "$PUBLISHED_FILE_ID" ] && [ -n "$SAVED_PUBLISHED_FILE_ID" ]; then
    PUBLISHED_FILE_ID="$SAVED_PUBLISHED_FILE_ID"
fi

ZIP_NAME="universal-auto-explore-v${VERSION}.zip"
TARGET_DIR="$DIST_DIR/$MOD_SLUG"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"

echo "==> Cleaning $DIST_DIR/"
rm -rf "$DIST_DIR"
mkdir -p "$TARGET_DIR"

echo "==> Mirroring $SRC_DIR/ → $TARGET_DIR/ (excluding dev/release-only files)"
rsync -a \
    --exclude='CHANGELOG.steam.txt' --exclude='.git' --exclude='.gitignore' --exclude='.DS_Store' --exclude='dist' \
    --exclude='release.sh' --exclude='steam_workshop_id.txt' --exclude='docs' \
    --exclude='images' --exclude='scripts' --exclude='reports' --exclude='*.bak' \
    --exclude='CONTRIBUTING.md' --exclude='README.pdf' --exclude='tests' --exclude='text/README.md' \
    --exclude='package.json' --exclude='package-lock.json' \
    --exclude='node_modules' --exclude='eslint.config.*' \
    "$SRC_DIR"/ "$TARGET_DIR"/

echo "==> Verifying modinfo at zip root"
[ -f "$TARGET_DIR/$MODINFO" ] || { echo "error: $TARGET_DIR/$MODINFO missing"; exit 1; }

echo "==> Sanity-checking shipped XML/modinfo is well-formed"
find "$TARGET_DIR" \( -name '*.xml' -o -name '*.modinfo' \) -print0 \
    | xargs -0 -n1 python3 -c 'import sys,xml.dom.minidom as m; m.parse(sys.argv[1])'

echo "==> Zipping $ZIP_PATH"
( cd "$DIST_DIR" && zip -qr "$ZIP_NAME" "$MOD_SLUG" )

# Allow-list audit: fail on any shipped file that isn't expected, so a loose rsync exclude can't ship docs/dev
# files unnoticed.
echo "==> Verifying zip contents against allow-list"
ALLOW="^${MOD_SLUG}/(${MODINFO}|README\.md|CHANGELOG\.md|LICENSE)$"
ALLOW="$ALLOW"'|^'"${MOD_SLUG}"'/data/.+\.(xml|sql)$'
ALLOW="$ALLOW"'|^'"${MOD_SLUG}"'/text/[a-z_]+/ModuleText\.xml$'
ALLOW="$ALLOW"'|^'"${MOD_SLUG}"'/ui/uae-[a-z-]+\.js$'
UNEXPECTED="$(unzip -Z1 "$ZIP_PATH" | grep -vE '/$' | grep -vE "$ALLOW" || true)"
if [ -n "$UNEXPECTED" ]; then
    echo "error: zip contains entries not on the allow-list:"
    echo "$UNEXPECTED" | sed 's/^/    /'
    echo "  → tighten the rsync --exclude list, or update ALLOW in release.sh if intended."
    exit 1
fi
echo "    OK: every shipped entry matches the allow-list."

echo "==> Zip contents:"
unzip -l "$ZIP_PATH" | sed -n '1,40p' || true
SIZE="$(du -h "$ZIP_PATH" | cut -f1)"

# Workshop preview card: rendered from docs/workshop-preview.svg to a 1024x1024 PNG and uploaded separately
# via the .vdf, so it lives outside the zip and never trips the allow-list.
PREVIEW_SRC="$SRC_DIR/docs/workshop-preview.svg"
PREVIEW_OUT="$DIST_DIR/preview.png"
ABS_PREVIEW=""
if [ -f "$PREVIEW_SRC" ]; then
    if command -v rsvg-convert >/dev/null 2>&1; then
        rsvg-convert -w 1024 -h 1024 "$PREVIEW_SRC" -o "$PREVIEW_OUT"
        ABS_PREVIEW="$(cd "$DIST_DIR" && pwd)/preview.png"
        echo "==> Workshop preview rendered: $PREVIEW_OUT"
    elif command -v magick >/dev/null 2>&1; then
        magick -background none -density 96 "$PREVIEW_SRC" -resize 1024x1024 "$PREVIEW_OUT"
        ABS_PREVIEW="$(cd "$DIST_DIR" && pwd)/preview.png"
        echo "==> Workshop preview rendered via ImageMagick: $PREVIEW_OUT"
    else
        echo "==> No SVG renderer found; preview.png NOT generated (brew install librsvg)."
    fi
fi

# Steam Workshop manifest (.vdf)
VDF_PATH="$DIST_DIR/workshop_item.vdf"
ABS_CONTENT="$(cd "$TARGET_DIR" && pwd)"

# Change note: this release's block from CHANGELOG.steam.txt, which scripts/steam-changelog.mjs keeps in step with
# CHANGELOG.md (that script documents Steam's change-note formatting rules). The block is VDF-safe: no straight
# double quotes, no backslashes. Edit CHANGELOG.steam.txt to reword a note; a hand-edited block is kept.
CHANGENOTE="Initial release."
if [ -n "$PUBLISHED_FILE_ID" ]; then
    CHANGENOTE="$(node scripts/steam-changelog.mjs note "$VERSION")" \
        || { echo "error: could not build the Steam change note (see above)"; exit 1; }
fi

{
    echo '"workshopitem"'
    echo '{'
    echo "    \"appid\"          \"$APPID\""
    [ -n "$PUBLISHED_FILE_ID" ] && echo "    \"publishedfileid\" \"$PUBLISHED_FILE_ID\""
    echo "    \"contentfolder\"  \"$ABS_CONTENT\""
    # No "previewfile": Steam rejects a preview image sent through steamcmd and the upload fails. Set the image by
    # hand on the Workshop page (dist/preview.png is still rendered for that).
    echo '    "visibility"     "0"'
    echo "    \"title\"          \"$TITLE\""
    # No "description", so steamcmd keeps the description set on the Workshop page instead of overwriting it.
    echo "    \"changenote\"     \"${CHANGENOTE}\""
    echo '}'
} > "$VDF_PATH"

if [ -n "$PUBLISHED_FILE_ID" ]; then
    printf '%s\n' "$PUBLISHED_FILE_ID" > "$WORKSHOP_ID_FILE"
fi

echo "==> Workshop manifest written: $VDF_PATH"
echo ""
echo "✓ Release built:  $ZIP_PATH  ($SIZE)"
echo "  Version:        $VERSION"
echo "  Authors:        $AUTHORS"
if [ -n "$PUBLISHED_FILE_ID" ]; then
    echo "  UPDATE mode:    publishedfileid $PUBLISHED_FILE_ID (existing item)"
else
    echo "  NEW-ITEM mode:  no publishedfileid yet (first upload creates one;"
    echo "                  then: echo <publishedfileid> > steam_workshop_id.txt)"
fi
echo ""
echo "── Upload (from Mac) ──"
echo "  ~/steamcmd/steamcmd.sh +login <yourSteamLogin> \\"
echo "      +workshop_build_item $(cd "$DIST_DIR" && pwd)/workshop_item.vdf +quit"
