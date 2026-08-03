#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="/mnt/hgfs/LinuxMintCinnamon/LinuxMintWindowSnapZoneTiling/snappy-window-tiling@martinandersen3d/files/snappy-window-tiling@martinandersen3d"
DEST_ROOT="${HOME}/.local/share/cinnamon/extensions"
DEST_DIR="${DEST_ROOT}/snappy-window-tiling@martinandersen3d"
APPLET_UUID="snappy-window-tiling@martinandersen3d"
EXTENSION_KIND="APPLET"

if [ ! -d "${SRC_DIR}" ]; then
	echo "Source folder not found: ${SRC_DIR}" >&2
	exit 1
fi

while true; do
	mkdir -p "${DEST_ROOT}"
	rm -rf "${DEST_DIR}"
	cp -a "${SRC_DIR}" "${DEST_DIR}"

	echo "Installed applet to: ${DEST_DIR}"

	xdotool key alt+F2 sleep 0.5 type r
	xdotool key Return

	echo ""
	read -n 1 -s -r -p "Press any key to install and reload Cinnamon..."
	echo ""
done