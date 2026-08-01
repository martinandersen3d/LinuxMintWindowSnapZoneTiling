#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="/mnt/hgfs/LinuxMintWindowSnapZoneTiling/snappy-window-tiling@martinandersen3d/files/snappy-window-tiling@martinandersen3d"
DEST_ROOT="${HOME}/.local/share/cinnamon/extensions"
DEST_DIR="${DEST_ROOT}/snappy-window-tiling@martinandersen3d"
APPLET_UUID="snappy-window-tiling@martinandersen3d"
EXTENSION_KIND="APPLET"

if [ ! -d "${SRC_DIR}" ]; then
	echo "Source folder not found: ${SRC_DIR}" >&2
	exit 1
fi

mkdir -p "${DEST_ROOT}"
rm -rf "${DEST_DIR}"
cp -a "${SRC_DIR}" "${DEST_DIR}"

echo "Installed applet to: ${DEST_DIR}"

# if command -v dbus-send >/dev/null 2>&1; then
# 	dbus-send --session \
# 		--dest=org.Cinnamon.LookingGlass \
# 		--type=method_call \
# 		/org/Cinnamon/LookingGlass \
# 		org.Cinnamon.LookingGlass.ReloadExtension \
# 		string:"${APPLET_UUID}" \
# 		string:"${EXTENSION_KIND}" >/dev/null
# 	echo "Reloaded applet: ${APPLET_UUID}"
# elif command -v gdbus >/dev/null 2>&1; then
# 	gdbus call \
# 		--session \
# 		--dest org.Cinnamon.LookingGlass \
# 		--object-path /org/Cinnamon/LookingGlass \
# 		--method org.Cinnamon.LookingGlass.ReloadExtension \
# 		"${APPLET_UUID}" \
# 		"${EXTENSION_KIND}" >/dev/null
# 	echo "Reloaded applet: ${APPLET_UUID}"
# else
# 	echo "Neither dbus-send nor gdbus found; applet copied but not reloaded." >&2
# 	echo "Install dbus-x11 or libglib2.0-bin (or equivalent) and run the script again." >&2
# 	exit 1
# fi

xdotool key alt+F2 sleep 0.5 type r; xdotool key Return
