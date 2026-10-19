#!/bin/zsh
# Puts a new OptHelper.dmg on the site: copies it to releases/ and writes releases/latest.json
# (version, date, size) for the line under the download buttons. The version is read from the app inside the DMG.
# Usage: ./release.sh [path/to/OptHelper.dmg]   (defaults to ../opt_helper/OptHelper.dmg)
set -euo pipefail
cd "$(dirname "$0")"
SRC=${1:-../opt_helper/OptHelper.dmg}
[[ -f "$SRC" ]] || { echo "No DMG at $SRC" >&2; exit 1; }

MNT=$(mktemp -d)
hdiutil attach -nobrowse -readonly -mountpoint "$MNT" "$SRC" >/dev/null
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$MNT/OptHelper.app/Contents/Info.plist")
hdiutil detach "$MNT" >/dev/null
rmdir "$MNT"

cp "$SRC" releases/OptHelper.dmg
SIZE=$(stat -f %z releases/OptHelper.dmg)
printf '{\n  "version": "%s",\n  "date": "%s",\n  "size": %s\n}\n' "$VERSION" "$(date +%F)" "$SIZE" > releases/latest.json
echo "releases/ now has OptHelper $VERSION ($SIZE bytes). Commit it, then deploy with: netlify deploy --prod"
