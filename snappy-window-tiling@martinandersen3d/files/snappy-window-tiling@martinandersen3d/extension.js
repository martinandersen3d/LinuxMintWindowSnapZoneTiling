const St = imports.gi.St;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
// settingsManager is loaded lazily inside init() once the extension path is
// on imports.searchPath — the UUID-based import path is unreliable in Cinnamon.
let SettingsManager = null;

// ---------------------------------------------------------------------------
// Layout grid geometry (used for both rendering and Step 1 arrow navigation)
// ---------------------------------------------------------------------------
const GROUP_GRID_COLS = 3;

let grabBeginId = 0;
let grabEndId = 0;
let hideTimerId = 0;
let activeWindow = null;

let overlayContainer = null;
let activeMonitor = null;
let zones = [];
let groupCards = [];
let activeZoneIndex = -1;
let initialZoneIndex = -1;
let selectedZoneIndices = [];

let isHotkeyActivated = false;
let modalGrabbed = false;
let navStep = 1;
let selectedGroupIdx = 0;   // Confirmed group (Step 2 context)
let focusedGroupIdx = 0;    // Arrow-key focus cursor while in Step 1
let focusedTileInGroup = 0; // Arrow-key focus cursor while in Step 2
let keyEventId = 0;
let mouseButtonEventId = 0;

let lastMouseX = -1;
let lastMouseY = -1;
let lastCtrlState = false;

const DRAG_SHOW_THRESHOLD = 5;
let pendingDragShow = false;
let dragStartX = -1;
let dragStartY = -1;

let extensionUuid = "";

function createEqualVerticalLayout(count) {
    try {
        let layout = [];
        let width = 1.0 / count;
        for (let i = 0; i < count; i++) {
            layout.push({ name: `Col ${i + 1}`, x: i * width, y: 0.0, w: width, h: 1.0 });
        }
        return layout;
    } catch (e) {
        global.logError("[drag-overlay] Error in createEqualVerticalLayout: " + e.message);
        return [];
    }
}

function createSplitVerticalLayout(count) {
    try {
        let layout = [];
        let width = 1.0 / count;
        for (let i = 0; i < count; i++) {
            layout.push({ name: `Top ${i + 1}`, x: i * width, y: 0.0, w: width, h: 0.5 });
            layout.push({ name: `Bottom ${i + 1}`, x: i * width, y: 0.5, w: width, h: 0.5 });
        }
        return layout;
    } catch (e) {
        global.logError("[drag-overlay] Error in createSplitVerticalLayout: " + e.message);
        return [];
    }
}

function createGrid3x3Layout() {
    try {
        let layout = [];
        let rows = 3, cols = 3;
        let width = 1.0 / cols;
        let height = 1.0 / rows;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                layout.push({
                    name: `R${r + 1}C${c + 1}`,
                    x: c * width,
                    y: r * height,
                    w: width,
                    h: height
                });
            }
        }
        return layout;
    } catch (e) {
        global.logError("[drag-overlay] Error in createGrid3x3Layout: " + e.message);
        return [];
    }
}

function createGrid4x4Layout() {
    try {
        let layout = [];
        let rows = 4, cols = 4;
        let width = 1.0 / cols;
        let height = 1.0 / rows;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                layout.push({
                    name: `R${r + 1}C${c + 1}`,
                    x: c * width,
                    y: r * height,
                    w: width,
                    h: height
                });
            }
        }
        return layout;
    } catch (e) {
        global.logError("[drag-overlay] Error in createGrid4x4Layout: " + e.message);
        return [];
    }
}

function createGrid5x4Layout() {
    try {
        let layout = [];
        let rows = 4, cols = 5;
        let width = 1.0 / cols;
        let height = 1.0 / rows;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                layout.push({
                    name: `R${r + 1}C${c + 1}`,
                    x: c * width,
                    y: r * height,
                    w: width,
                    h: height
                });
            }
        }
        return layout;
    } catch (e) {
        global.logError("[drag-overlay] Error in createGrid5x4Layout: " + e.message);
        return [];
    }
}

function getMonitorAtPointer() {
    try {
        let [x, y] = global.get_pointer();
        let monitors = Main.layoutManager.monitors;
        for (let i = 0; i < monitors.length; i++) {
            let m = monitors[i];
            if (x >= m.x && x < (m.x + m.width) && y >= m.y && y < (m.y + m.height)) {
                return m;
            }
        }
        return Main.layoutManager.primaryMonitor;
    } catch (e) {
        global.logError("[drag-overlay] Error in getMonitorAtPointer: " + e.message);
        return Main.layoutManager.primaryMonitor;
    }
}

const LAYOUT_GROUPS = [
    [
        { name: "Left",  x: 0.0, y: 0.0, w: 0.5, h: 1.0 },
        { name: "Right", x: 0.5, y: 0.0, w: 0.5, h: 1.0 }
    ],
    createEqualVerticalLayout(3),
    [
        { name: "Top Left",     x: 0.0, y: 0.0, w: 0.5, h: 0.5 },
        { name: "Top Right",    x: 0.5, y: 0.0, w: 0.5, h: 0.5 },
        { name: "Bottom Left",  x: 0.0, y: 0.5, w: 0.5, h: 0.5 },
        { name: "Bottom Right", x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
    ],
    [
        { name: "Wide Left",   x: 0.0,  y: 0.0, w: 0.75, h: 1.0 },
        { name: "Narrow Right",x: 0.75, y: 0.0, w: 0.25, h: 1.0 }
    ],
    [
        { name: "Left",   x: 0.0,  y: 0.0, w: 0.25, h: 1.0 },
        { name: "Center", x: 0.25, y: 0.0, w: 0.50, h: 1.0 },
        { name: "Right",  x: 0.75, y: 0.0, w: 0.25, h: 1.0 }
    ],
    [
        { name: "Narrow Left", x: 0.0,  y: 0.0, w: 0.25, h: 1.0 },
        { name: "Wide Right",  x: 0.25, y: 0.0, w: 0.75, h: 1.0 }
    ],
    [
        { name: "Wide Left",   x: 0.0,  y: 0.0, w: 0.80, h: 1.0 },
        { name: "Narrow Right",x: 0.80, y: 0.0, w: 0.20, h: 1.0 }
    ],
    [
        { name: "Left",   x: 0.0,  y: 0.0, w: 0.20, h: 1.0 },
        { name: "Center", x: 0.20, y: 0.0, w: 0.60, h: 1.0 },
        { name: "Right",  x: 0.80, y: 0.0, w: 0.20, h: 1.0 }
    ],
    [
        { name: "Narrow Left", x: 0.0,  y: 0.0, w: 0.20, h: 1.0 },
        { name: "Wide Right",  x: 0.20, y: 0.0, w: 0.80, h: 1.0 }
    ],
    createEqualVerticalLayout(4),
    createEqualVerticalLayout(5),
    createEqualVerticalLayout(6),
    createSplitVerticalLayout(4),
    createSplitVerticalLayout(5),
    createSplitVerticalLayout(6),
    createGrid3x3Layout(),
    createGrid4x4Layout(),
    createGrid5x4Layout()
];

function init(metadata) {
    try {
        extensionUuid = metadata.uuid;
        // Add the extension's own directory to the GJS search path so that
        // 'imports.settingsManager' resolves to settingsManager.js next to
        // extension.js without needing the UUID-based path.
        imports.searchPath.push(metadata.path);
        SettingsManager = imports.settingsManager;
        SettingsManager.init(extensionUuid);
    } catch (e) {
        global.logError("[drag-overlay] Init error: " + e.message);
    }
}

function enable() {
    try {
        SettingsManager.log("enable() called");
        buildOverlayUIOnce();

        SettingsManager.createSettings(this);

        function refreshHotkey() {
            try {
                Main.keybindingManager.removeHotKey("toggle-snappy-window-tiling");
                if (SettingsManager.isKeyboardEnabled()) {
                    Main.keybindingManager.addHotKey(
                        "toggle-snappy-window-tiling",
                        SettingsManager.getHotkey(),
                        onHotkeyTriggered
                    );
                    SettingsManager.log("refreshHotkey() registered: " + SettingsManager.getHotkey());
                } else {
                    SettingsManager.log("refreshHotkey() keyboard disabled, hotkey not registered");
                }
            } catch (err) {
                SettingsManager.log("refreshHotkey() ERROR: " + err.message);
                global.logError("[drag-overlay] Keybinding refresh error: " + err.message);
            }
        }

        refreshHotkey();

        SettingsManager.connectChanged("toggle-snappy-window-tiling", refreshHotkey);
        SettingsManager.connectChanged("enable-keyboard-snapping", refreshHotkey);

        grabBeginId = global.display.connect('grab-op-begin', onGrabBegin);
        grabEndId = global.display.connect('grab-op-end', onGrabEnd);
        SettingsManager.log("enable() done  grabBeginId=" + grabBeginId + "  grabEndId=" + grabEndId);
    } catch (e) {
        SettingsManager.log("enable() ERROR: " + e.message);
        global.logError("[drag-overlay] Enable error: " + e.message);
    }
}

function disable() {
    try {
        SettingsManager.log("disable() called");
        Main.keybindingManager.removeHotKey("toggle-snappy-window-tiling");
        SettingsManager.destroy();
        if (grabBeginId > 0) {
            global.display.disconnect(grabBeginId);
            grabBeginId = 0;
        }
        if (grabEndId > 0) {
            global.display.disconnect(grabEndId);
            grabEndId = 0;
        }
        if (hideTimerId > 0) {
            Mainloop.source_remove(hideTimerId);
            hideTimerId = 0;
        }
        destroyOverlayUI();
    } catch (e) {
        global.logError("[drag-overlay] Error in disable: " + e.message);
    }
}

function buildOverlayUIOnce() {
    try {
        if (overlayContainer) return;

        const groupRows = Math.ceil(LAYOUT_GROUPS.length / GROUP_GRID_COLS);
        const cardWidth = 140;
        const cardHeight = 85;
        const gap = 10;
        const padding = 14;
        const footerHeight = 65;

        const gridWidth = (GROUP_GRID_COLS * cardWidth) + ((GROUP_GRID_COLS - 1) * gap);
        const gridHeight = (groupRows * cardHeight) + ((groupRows - 1) * gap);

        const popupWidth = gridWidth + (padding * 2);
        const popupHeight = gridHeight + (padding * 2) + footerHeight;

        overlayContainer = new St.Widget({
            reactive: true,
            can_focus: true,
            width: popupWidth,
            height: popupHeight,
            style_class: 'drag-overlay-container',
            visible: false
        });

        zones = [];
        groupCards = [];

        const gridOffsetY = padding;

        LAYOUT_GROUPS.forEach((layout, groupIdx) => {
            let col = groupIdx % GROUP_GRID_COLS;
            let row = Math.floor(groupIdx / GROUP_GRID_COLS);

            let groupX = padding + col * (cardWidth + gap);
            let groupY = gridOffsetY + row * (cardHeight + gap);

            let groupCard = new St.Widget({
                reactive: false,
                can_focus: false,
                x: groupX,
                y: groupY,
                width: cardWidth,
                height: cardHeight,
                style_class: 'drag-group-card'
            });

            overlayContainer.add_actor(groupCard);

            let innerPad = 4;
            let innerW = cardWidth - (innerPad * 2);
            let innerH = cardHeight - (innerPad * 2);

            let groupZoneIndices = [];

            layout.forEach((def, localIdx) => {
                let localX = innerPad + Math.floor(def.x * innerW);
                let localY = innerPad + Math.floor(def.y * innerH);
                let tileW = Math.max(2, Math.floor(def.w * innerW) - 2);
                let tileH = Math.max(2, Math.floor(def.h * innerH) - 2);

                let tileWidget = new St.Widget({
                    reactive: false,
                    can_focus: false,
                    x: localX,
                    y: localY,
                    width: tileW,
                    height: tileH,
                    style_class: 'drag-zone-tile'
                });

                let badgeLabel = new St.Label({
                    text: "",
                    x: 2,
                    y: 2,
                    style_class: 'drag-badge-zone',
                    visible: false
                });

                tileWidget.add_actor(badgeLabel);
                groupCard.add_actor(tileWidget);

                let globalIdx = zones.length;
                groupZoneIndices.push(globalIdx);

                zones.push({
                    groupIdx: groupIdx,
                    localIdx: localIdx,
                    widget: tileWidget,
                    badgeLabel: badgeLabel,
                    groupX: groupX,
                    groupY: groupY,
                    localX: localX,
                    localY: localY,
                    bounds: { x: 0, y: 0, w: tileW, h: tileH },
                    def: def,
                    isHighlighted: false
                });
            });

            let groupBadgeLabel = new St.Label({
                text: "",
                x: 6,
                y: 6,
                style_class: 'drag-badge-group',
                visible: false
            });

            groupCard.add_actor(groupBadgeLabel);

            groupCards.push({
                widget: groupCard,
                groupBadgeLabel: groupBadgeLabel,
                zoneIndices: groupZoneIndices,
                isFocused: false
            });
        });

        const footerOffsetY = gridOffsetY + gridHeight + 12;

        let footerBox = new St.BoxLayout({
            vertical: true,
            x: padding,
            y: footerOffsetY,
            width: gridWidth,
            height: footerHeight
        });

        let titleLine = new St.Label({
            text: "Snappy Window Tiling Ver 1.0",
            style: "font-weight: bold; font-size: 16px; color: rgba(255,255,255,0.95); text-align: center;"
        });

        let helpLine = new St.Label({
            text: "Press a number, or use the arrow keys, to select a zone.",
            style: "font-size: 13px; color: rgba(230,230,230,0.9); font-weight: 500; text-align: center;"
        });

        let optionalLine = new St.Label({
            text: "(Optional) Hold Ctrl to expand selection.",
            style: "font-size: 12px; color: rgba(170,170,170,0.8); text-align: center;"
        });

        footerBox.add_actor(titleLine);
        footerBox.add_actor(helpLine);
        footerBox.add_actor(optionalLine);

        overlayContainer.add_actor(footerBox);
        Main.uiGroup.add_actor(overlayContainer);
    } catch (e) {
        global.logError("[drag-overlay] Error in buildOverlayUIOnce: " + e.message);
    }
}

function showOverlay() {
    try {
        if (!overlayContainer) buildOverlayUIOnce();
        if (overlayContainer.visible) return;

        activeMonitor = getMonitorAtPointer();

        const popupX = Math.floor(activeMonitor.x + (activeMonitor.width - overlayContainer.width) / 2);
        var popupY = Math.floor(activeMonitor.y + (activeMonitor.height * 0.15));
        if(activeMonitor.height  < 1000){
            popupY = Math.floor(activeMonitor.y + (activeMonitor.height * 0.05));
        }
        

        overlayContainer.set_position(popupX, popupY);

        zones.forEach(z => {
            z.bounds.x = popupX + z.groupX + z.localX;
            z.bounds.y = popupY + z.groupY + z.localY;
        });

        selectedZoneIndices = [];
        initialZoneIndex = -1;
        activeZoneIndex = -1;
        navStep = 1;
        selectedGroupIdx = 0;
        focusedGroupIdx = 0;
        focusedTileInGroup = 0;
        lastMouseX = -1;
        lastMouseY = -1;

        overlayContainer.show();

        if (isHotkeyActivated) {
            // Take a real compositor-level modal grab (keyboard + pointer)
            // so key events stop going to whatever window/app currently
            // holds focus and start coming to us instead. This is the same
            // mechanism Cinnamon itself uses for the Overview/Expo, and is
            // the correct replacement for manually calling
            // Clutter.grab_keyboard()/display.set_input_focus(), which does
            // not reliably steal focus away from the underlying window.
            modalGrabbed = Main.pushModal(overlayContainer);
            if (!modalGrabbed) {
                global.logError("[drag-overlay] Failed to acquire modal grab; keyboard nav will not work this time.");
            }

            // Make sure the overlay actor itself is the key-focused actor,
            // and listen on the stage so all key events (regardless of
            // exactly which actor is focused) reach our handler.
            global.stage.set_key_focus(overlayContainer);

            if (keyEventId === 0) {
                keyEventId = global.stage.connect('key-press-event', onKeyPress);
            }
            if (mouseButtonEventId === 0) {
                mouseButtonEventId = global.stage.connect('button-press-event', onButtonPress);
            }

            // Also support point-and-click zone selection while the
            // hotkey-activated overlay is open, reusing the same hover
            // highlighting used during a mouse-drag.
            startMouseTracking();
            renderKeyboardUI();
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in showOverlay: " + e.message);
    }
}

function resetAllVisualSelections() {
    try {
        zones.forEach(zone => {
            if (zone.isHighlighted) {
                zone.widget.remove_style_class_name('drag-zone-tile-focused');
                zone.isHighlighted = false;
            }
            if (zone.badgeLabel) {
                zone.badgeLabel.hide();
            }
        });

        groupCards.forEach(card => {
            if (card.isFocused) {
                card.widget.remove_style_class_name('drag-group-card-focused');
                card.isFocused = false;
            }
            if (card.groupBadgeLabel) {
                card.groupBadgeLabel.hide();
            }
        });
    } catch (e) {
        global.logError("[drag-overlay] Error resetting visual selections: " + e.message);
    }
}

function hideOverlay() {
    try {
        if (overlayContainer && overlayContainer.visible) {
            if (modalGrabbed) {
                Main.popModal(overlayContainer);
                modalGrabbed = false;
            }

            if (keyEventId > 0) {
                global.stage.disconnect(keyEventId);
                keyEventId = 0;
            }

            if (mouseButtonEventId > 0) {
                global.stage.disconnect(mouseButtonEventId);
                mouseButtonEventId = 0;
            }

            stopMouseTracking();

            global.stage.set_key_focus(null);

            resetAllVisualSelections();

            activeMonitor = null;
            activeZoneIndex = -1;
            initialZoneIndex = -1;
            selectedZoneIndices = [];
            activeWindow = null;
            isHotkeyActivated = false;
            navStep = 1;
            selectedGroupIdx = 0;
            focusedGroupIdx = 0;
            focusedTileInGroup = 0;

            overlayContainer.hide();
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in hideOverlay: " + e.message);
    }
}

function destroyOverlayUI() {
    try {
        if (overlayContainer) {
            hideOverlay();
            Main.uiGroup.remove_actor(overlayContainer);
            overlayContainer.destroy();
            overlayContainer = null;
            zones = [];
            groupCards = [];
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in destroyOverlayUI: " + e.message);
    }
}

function onHotkeyTriggered() {
    try {
        SettingsManager.log("onHotkeyTriggered() overlayVisible=" + (overlayContainer ? overlayContainer.visible : 'no-container'));
        if (overlayContainer && overlayContainer.visible) {
            hideOverlay();
        } else {
            activeWindow = global.display.get_focus_window();
            isHotkeyActivated = true;
            showOverlay();
        }
    } catch (e) {
        SettingsManager.log("onHotkeyTriggered() ERROR: " + e.message);
        global.logError("[drag-overlay] Error in onHotkeyTriggered: " + e.message);
    }
}

function onGrabBegin(display, screen, window, op) {
    try {
        if (op === Meta.GrabOp.MOVING || op === Meta.GrabOp.KEYBOARD_MOVING) {
            SettingsManager.log("onGrabBegin() dragEnabled=" + SettingsManager.isDragEnabled());
            if (!SettingsManager.isDragEnabled()) return;

            activeWindow = window;

            if (hideTimerId > 0) {
                Mainloop.source_remove(hideTimerId);
                hideTimerId = 0;
            }

            isHotkeyActivated = false;
            let [sx, sy] = global.get_pointer().slice(0, 2);
            dragStartX = sx;
            dragStartY = sy;
            pendingDragShow = true;
            startMouseTracking();
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in onGrabBegin: " + e.message);
    }
}

function onGrabEnd(display, screen, window, op) {
    try {
        stopMouseTracking();
        pendingDragShow = false;
        dragStartX = -1;
        dragStartY = -1;

        if (activeWindow && selectedZoneIndices.length > 0) {
            snapWindowToSelectedZones(activeWindow, selectedZoneIndices);
        }

        if (overlayContainer && overlayContainer.visible) {
            hideTimerId = Mainloop.timeout_add(300, () => {
                hideOverlay();
                hideTimerId = 0;
                return false;
            });
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in onGrabEnd: " + e.message);
    }
}

function applyGroupCardStyle(card, isFocused) {
    try {
        if (card.isFocused !== isFocused) {
            card.isFocused = isFocused;
            if (isFocused) {
                card.widget.add_style_class_name('drag-group-card-focused');
            } else {
                card.widget.remove_style_class_name('drag-group-card-focused');
            }
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in applyGroupCardStyle: " + e.message);
    }
}

function renderKeyboardUI() {
    try {
        zones.forEach(z => {
            if (z.badgeLabel) z.badgeLabel.hide();
        });
        groupCards.forEach(c => {
            if (c.groupBadgeLabel) c.groupBadgeLabel.hide();
        });

        if (navStep === 1) {
            groupCards.forEach((card, idx) => {
                // Highlight whichever group currently has arrow-key focus
                applyGroupCardStyle(card, idx === focusedGroupIdx);

                if (idx < 10) {
                    let badgeText = (idx === 9) ? "0" : (idx + 1).toString();
                    card.groupBadgeLabel.set_text(badgeText);
                    card.groupBadgeLabel.show();
                    card.groupBadgeLabel.raise_top();
                }
            });

            updateSelectedZones([]);
        } else if (navStep === 2) {
            groupCards.forEach((card, idx) => {
                applyGroupCardStyle(card, idx === selectedGroupIdx);
            });

            let card = groupCards[selectedGroupIdx];

            card.zoneIndices.forEach((globalIdx, localIdx) => {
                let zone = zones[globalIdx];
                if (zone && zone.badgeLabel && localIdx < 10) {
                    let badgeText = (localIdx === 9) ? "0" : (localIdx + 1).toString();
                    zone.badgeLabel.set_text(badgeText);
                    zone.badgeLabel.show();
                    zone.badgeLabel.raise_top();
                }
            });

            updateKeyboardTileSelection(false);
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in renderKeyboardUI: " + e.message);
    }
}

function updateKeyboardTileSelection(isCtrlPressed) {
    try {
        let card = groupCards[selectedGroupIdx];
        let activeGlobalIdx = card.zoneIndices[focusedTileInGroup];

        if (isCtrlPressed) {
            if (initialZoneIndex < 0) {
                initialZoneIndex = activeGlobalIdx;
            }

            let initDef = zones[initialZoneIndex].def;
            let activeDef = zones[activeGlobalIdx].def;

            let minX = Math.min(initDef.x, activeDef.x);
            let minY = Math.min(initDef.y, activeDef.y);
            let maxX = Math.max(initDef.x + initDef.w, activeDef.x + activeDef.w);
            let maxY = Math.max(initDef.y + initDef.h, activeDef.y + activeDef.h);

            let newIndices = [];
            card.zoneIndices.forEach(idx => {
                let d = zones[idx].def;
                let centerX = d.x + (d.w / 2);
                let centerY = d.y + (d.h / 2);

                if (centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY) {
                    newIndices.push(idx);
                }
            });

            updateSelectedZones(newIndices);
        } else {
            initialZoneIndex = activeGlobalIdx;
            updateSelectedZones([activeGlobalIdx]);
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in updateKeyboardTileSelection: " + e.message);
    }
}

function updateSelectedZones(newIndices) {
    try {
        selectedZoneIndices.forEach(idx => {
            if (zones[idx] && !newIndices.includes(idx)) {
                applyZoneStyle(zones[idx], false);
            }
        });

        newIndices.forEach(idx => {
            if (zones[idx]) {
                applyZoneStyle(zones[idx], true);
            }
        });

        selectedZoneIndices = newIndices;
    } catch (e) {
        global.logError("[drag-overlay] Error in updateSelectedZones: " + e.message);
    }
}

// ---------------------------------------------------------------------------
// Arrow-key spatial navigation helpers
// ---------------------------------------------------------------------------

/**
 * Moves the Step 1 group focus cursor by one grid cell in the given
 * direction. Grid is GROUP_GRID_COLS columns wide, row-major, matching the
 * layout used in buildOverlayUIOnce().
 */
function moveGroupFocus(dx, dy) {
    try {
        let newIdx = focusedGroupIdx;
        let total = LAYOUT_GROUPS.length;

        if (dx !== 0) {
            let currentRow = Math.floor(focusedGroupIdx / GROUP_GRID_COLS);
            let candidate = focusedGroupIdx + dx;
            let candidateRow = Math.floor(candidate / GROUP_GRID_COLS);
            if (candidate >= 0 && candidate < total && candidateRow === currentRow) {
                newIdx = candidate;
            }
        }

        if (dy !== 0) {
            let candidate = focusedGroupIdx + (dy * GROUP_GRID_COLS);
            if (candidate >= 0 && candidate < total) {
                newIdx = candidate;
            }
        }

        if (newIdx !== focusedGroupIdx) {
            focusedGroupIdx = newIdx;
            renderKeyboardUI();
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in moveGroupFocus: " + e.message);
    }
}

/**
 * Finds the nearest tile (by fractional-def center point) in the requested
 * direction from currentLocalIdx, restricted to the given list of global
 * zone indices (i.e. tiles belonging to one group). Returns -1 if there is
 * no candidate in that direction.
 */
function findSpatialNeighbor(currentLocalIdx, zoneIndices, dx, dy) {
    try {
        let currentDef = zones[zoneIndices[currentLocalIdx]].def;
        let curCx = currentDef.x + (currentDef.w / 2);
        let curCy = currentDef.y + (currentDef.h / 2);

        let bestLocalIdx = -1;
        let bestScore = Infinity;
        const EPSILON = 0.001;

        zoneIndices.forEach((globalIdx, localIdx) => {
            if (localIdx === currentLocalIdx) return;

            let d = zones[globalIdx].def;
            let cx = d.x + (d.w / 2);
            let cy = d.y + (d.h / 2);
            let ddx = cx - curCx;
            let ddy = cy - curCy;

            if (dx !== 0) {
                if (Math.sign(ddx) !== dx) return;
            } else if (Math.abs(ddx) > EPSILON) {
                return;
            }

            if (dy !== 0) {
                if (Math.sign(ddy) !== dy) return;
            } else if (Math.abs(ddy) > EPSILON) {
                return;
            }

            let score = Math.abs(ddx) + Math.abs(ddy);
            if (score < bestScore) {
                bestScore = score;
                bestLocalIdx = localIdx;
            }
        });

        return bestLocalIdx;
    } catch (e) {
        global.logError("[drag-overlay] Error in findSpatialNeighbor: " + e.message);
        return -1;
    }
}

/**
 * Moves the Step 2 tile focus cursor within the currently selected group.
 * When isCtrlPressed is true, the selection is expanded (range-select)
 * instead of moved.
 */
function moveTileFocus(dx, dy, isCtrlPressed) {
    try {
        let card = groupCards[selectedGroupIdx];
        let newLocalIdx = findSpatialNeighbor(focusedTileInGroup, card.zoneIndices, dx, dy);

        if (newLocalIdx !== -1) {
            focusedTileInGroup = newLocalIdx;
            updateKeyboardTileSelection(isCtrlPressed);
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in moveTileFocus: " + e.message);
    }
}

/**
 * Maps a digit keysym (top-row 0-9 OR numpad KP_0-KP_9) to the 0-9 target
 * index used to pick a group/tile, where '1' -> 0, '9' -> 8, '0' -> 9.
 * Returns -1 if the keysym isn't a digit at all.
 */
function getNumericTargetIndex(symbol) {
    let digit = -1;

    if (symbol >= Clutter.KEY_0 && symbol <= Clutter.KEY_9) {
        digit = symbol - Clutter.KEY_0;
    } else if (symbol >= Clutter.KEY_KP_0 && symbol <= Clutter.KEY_KP_9) {
        digit = symbol - Clutter.KEY_KP_0;
    } else {
        return -1;
    }

    return (digit === 0) ? 9 : (digit - 1);
}

function onKeyPress(actor, event) {
    try {
        let symbol = event.get_key_symbol();
        let state = event.get_state();
        let isCtrlPressed = (state & Clutter.ModifierType.CONTROL_MASK) !== 0;

        if (symbol === Clutter.KEY_Escape) {
            if (navStep === 2) {
                navStep = 1;
                focusedTileInGroup = 0;
                initialZoneIndex = -1;
                renderKeyboardUI();
            } else {
                hideOverlay();
            }
            return true;
        }

        if (symbol === Clutter.KEY_BackSpace) {
            if (navStep === 2) {
                navStep = 1;
                focusedTileInGroup = 0;
                initialZoneIndex = -1;
                renderKeyboardUI();
                return true;
            } else {
                hideOverlay();
                return true;
            }
        }

        const totalGroups = LAYOUT_GROUPS.length;
        const isArrowKey = (symbol === Clutter.KEY_Left || symbol === Clutter.KEY_Right ||
                            symbol === Clutter.KEY_Up || symbol === Clutter.KEY_Down);

        if (navStep === 1) {
            if (isArrowKey) {
                let dx = (symbol === Clutter.KEY_Left) ? -1 : (symbol === Clutter.KEY_Right) ? 1 : 0;
                let dy = (symbol === Clutter.KEY_Up) ? -1 : (symbol === Clutter.KEY_Down) ? 1 : 0;
                moveGroupFocus(dx, dy);
                return true;
            }

            let targetGroupIdx = getNumericTargetIndex(symbol);
            if (targetGroupIdx !== -1) {
                if (targetGroupIdx < totalGroups) {
                    selectedGroupIdx = targetGroupIdx;
                    focusedGroupIdx = targetGroupIdx;
                    navStep = 2;
                    focusedTileInGroup = 0;
                    initialZoneIndex = -1;
                    renderKeyboardUI();
                }
                return true;
            }

            if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter || symbol === Clutter.KEY_space) {
                selectedGroupIdx = focusedGroupIdx;
                navStep = 2;
                focusedTileInGroup = 0;
                initialZoneIndex = -1;
                renderKeyboardUI();
                return true;
            }
        }
        else if (navStep === 2) {
            let currentCard = groupCards[selectedGroupIdx];
            let tileCount = currentCard.zoneIndices.length;

            if (isArrowKey) {
                let dx = (symbol === Clutter.KEY_Left) ? -1 : (symbol === Clutter.KEY_Right) ? 1 : 0;
                let dy = (symbol === Clutter.KEY_Up) ? -1 : (symbol === Clutter.KEY_Down) ? 1 : 0;
                moveTileFocus(dx, dy, isCtrlPressed);
                return true;
            }

            let targetTileIdx = getNumericTargetIndex(symbol);
            if (targetTileIdx !== -1) {
                if (targetTileIdx < tileCount) {
                    focusedTileInGroup = targetTileIdx;
                    updateKeyboardTileSelection(isCtrlPressed);
                    if (!isCtrlPressed) {
                        confirmKeyboardSnap();
                    }
                }
                return true;
            } else if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter || symbol === Clutter.KEY_space) {
                confirmKeyboardSnap();
                return true;
            }
        }

        return false;
    } catch (e) {
        global.logError("[drag-overlay] Error in onKeyPress: " + e.message);
        return false;
    }
}

function confirmKeyboardSnap() {
    try {
        if (activeWindow && selectedZoneIndices.length > 0) {
            snapWindowToSelectedZones(activeWindow, selectedZoneIndices);
        }
        hideOverlay();
    } catch (e) {
        global.logError("[drag-overlay] Error in confirmKeyboardSnap: " + e.message);
    }
}

/**
 * Handles mouse clicks while the hotkey-activated overlay is open, letting
 * the user click a zone (optionally holding Ctrl for a multi-tile range,
 * same as hovering) to snap the captured window and close the overlay.
 * Not used for the drag-to-snap path, which confirms on grab-op-end instead.
 */
function onButtonPress(actor, event) {
    try {
        if (!isHotkeyActivated) return false;
        if (event.get_button() !== 1) return false;

        let [mx, my] = event.get_coords();
        let mods = event.get_state();
        let isCtrlPressed = (mods & Clutter.ModifierType.CONTROL_MASK) !== 0;

        // Make sure hover state reflects the exact click position before
        // reading selectedZoneIndices.
        updateZoneHover(mx, my, isCtrlPressed);

        if (selectedZoneIndices.length > 0) {
            if (activeWindow) {
                snapWindowToSelectedZones(activeWindow, selectedZoneIndices);
            }
            hideOverlay();
            return true;
        }

        return false;
    } catch (e) {
        global.logError("[drag-overlay] Error in onButtonPress: " + e.message);
        return false;
    }
}

let mouseTrackingTimer = 0;

function startMouseTracking() {
    try {
        if (mouseTrackingTimer > 0) return;

        mouseTrackingTimer = Mainloop.timeout_add(40, () => {
            let [mouseX, mouseY, mods] = global.get_pointer();
            let isCtrlPressed = (mods & Clutter.ModifierType.CONTROL_MASK) !== 0;

            if (pendingDragShow) {
                let dx = mouseX - dragStartX;
                let dy = mouseY - dragStartY;
                if ((dx * dx + dy * dy) >= (DRAG_SHOW_THRESHOLD * DRAG_SHOW_THRESHOLD)) {
                    pendingDragShow = false;
                    showOverlay();
                }
                return true;
            }

            if (mouseX === lastMouseX && mouseY === lastMouseY && isCtrlPressed === lastCtrlState) {
                return true;
            }

            lastMouseX = mouseX;
            lastMouseY = mouseY;
            lastCtrlState = isCtrlPressed;

            updateZoneHover(mouseX, mouseY, isCtrlPressed);
            return true;
        });
    } catch (e) {
        global.logError("[drag-overlay] Error in startMouseTracking: " + e.message);
    }
}

function stopMouseTracking() {
    try {
        if (mouseTrackingTimer > 0) {
            Mainloop.source_remove(mouseTrackingTimer);
            mouseTrackingTimer = 0;
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in stopMouseTracking: " + e.message);
    }
}

function updateZoneHover(mx, my, isCtrlPressed) {
    try {
        let hoveredIndex = -1;

        for (let i = 0; i < zones.length; i++) {
            let b = zones[i].bounds;
            if (mx >= b.x && mx <= (b.x + b.w) && my >= b.y && my <= (b.y + b.h)) {
                hoveredIndex = i;
                break;
            }
        }

        let newSelectedIndices = [];

        if (hoveredIndex !== -1) {
            activeZoneIndex = hoveredIndex;
        }

        if (isCtrlPressed) {
            if (hoveredIndex === -1) {
                // Mouse left the panel — reset multi-select so zones don't stay stuck
                initialZoneIndex = -1;
                activeZoneIndex = -1;
            } else {
                if (initialZoneIndex < 0) {
                    initialZoneIndex = activeZoneIndex >= 0 ? activeZoneIndex : hoveredIndex;
                }

                if (initialZoneIndex >= 0) {
                    let targetGroup = zones[initialZoneIndex].groupIdx;
                    let activeDef = zones[activeZoneIndex >= 0 ? activeZoneIndex : initialZoneIndex].def;
                    let initDef = zones[initialZoneIndex].def;

                    let minX = Math.min(initDef.x, activeDef.x);
                    let minY = Math.min(initDef.y, activeDef.y);
                    let maxX = Math.max(initDef.x + initDef.w, activeDef.x + activeDef.w);
                    let maxY = Math.max(initDef.y + initDef.h, activeDef.y + activeDef.h);

                    zones.forEach((zone, idx) => {
                        if (zone.groupIdx === targetGroup) {
                            let d = zone.def;
                            let centerX = d.x + (d.w / 2);
                            let centerY = d.y + (d.h / 2);

                            if (centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY) {
                                newSelectedIndices.push(idx);
                            }
                        }
                    });
                }
            }
        } else {
            if (hoveredIndex !== -1) {
                initialZoneIndex = hoveredIndex;
                newSelectedIndices = [hoveredIndex];
            }
            // hoveredIndex === -1 means the mouse is outside the overlay —
            // leave newSelectedIndices empty so nothing is highlighted and
            // releasing the window here does not snap it anywhere.
        }

        if (!arraysEqual(selectedZoneIndices, newSelectedIndices)) {
            updateSelectedZones(newSelectedIndices);
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in updateZoneHover: " + e.message);
    }
}

function applyZoneStyle(zone, isHighlighted) {
    try {
        if (zone.isHighlighted !== isHighlighted) {
            zone.isHighlighted = isHighlighted;
            if (isHighlighted) {
                zone.widget.add_style_class_name('drag-zone-tile-focused');
            } else {
                zone.widget.remove_style_class_name('drag-zone-tile-focused');
            }
        }
    } catch (e) {
        global.logError("[drag-overlay] Error in applyZoneStyle: " + e.message);
    }
}

/**
 * Returns the usable work area for a monitor, excluding panels/docks.
 *
 * Primary:  Meta/Muffin workspace work-area API — the compositor already
 *           tracks every panel's strut reservation, including auto-hide panels
 *           (which report a zero strut when hidden, so the full screen is
 *           returned, matching the desired behaviour).
 *
 * Fallback: Walk Cinnamon's panelManager to measure panel actors manually.
 *           Auto-hiding panels are skipped (same logic as the primary path).
 *
 * Last resort: raw monitor geometry (original behaviour).
 */
function getWorkAreaForMonitor(monitor) {
    // --- Primary: Meta work area API ---
    try {
        let monitors = Main.layoutManager.monitors;
        let monitorIndex = -1;
        for (let i = 0; i < monitors.length; i++) {
            if (monitors[i] === monitor) { monitorIndex = i; break; }
        }

        if (monitorIndex >= 0) {
            let workspace = global.screen
                ? global.screen.get_active_workspace()
                : global.display.get_workspace_manager().get_active_workspace();

            if (workspace) {
                let area = workspace.get_work_area_for_monitor(monitorIndex);
                if (area) {
                    return { x: area.x, y: area.y, width: area.width, height: area.height };
                }
            }
        }
    } catch (e) {
        global.logError("[drag-overlay] Primary work area detection failed, using fallback: " + e.message);
    }

    // --- Fallback: Cinnamon panelManager ---
    try {
        let wx = monitor.x, wy = monitor.y, ww = monitor.width, wh = monitor.height;

        let panels = Main.panelManager
            ? Main.panelManager.getPanels()
            : (Main.panel ? [Main.panel] : []);

        panels.forEach(panel => {
            if (!panel || !panel.actor) return;
            // Skip auto-hiding panels — they don't obstruct windows when hidden
            if (panel.isHideable && panel._hidden) return;

            let ph = panel.actor.height;
            let pos = panel.panelPosition; // 0=top 1=bottom 2=left 3=right

            if      (pos === 0) { wy += ph; wh -= ph; }
            else if (pos === 1) { wh -= ph; }
            else if (pos === 2) { wx += ph; ww -= ph; }
            else if (pos === 3) { ww -= ph; }
        });

        return { x: wx, y: wy, width: ww, height: wh };
    } catch (e2) {
        global.logError("[drag-overlay] Fallback work area detection failed: " + e2.message);
    }

    // --- Last resort: raw monitor geometry ---
    return { x: monitor.x, y: monitor.y, width: monitor.width, height: monitor.height };
}

function snapWindowToSelectedZones(window, indices) {
    try {
        if (indices.length === 0) return;

        let monitor = activeMonitor || getMonitorAtPointer();

        let minX = 1.0, minY = 1.0, maxX = 0.0, maxY = 0.0;

        indices.forEach(idx => {
            let def = zones[idx].def;
            if (def.x < minX) minX = def.x;
            if (def.y < minY) minY = def.y;
            if ((def.x + def.w) > maxX) maxX = def.x + def.w;
            if ((def.y + def.h) > maxY) maxY = def.y + def.h;
        });

        let workArea = getWorkAreaForMonitor(monitor);
        let targetX = Math.floor(workArea.x + (minX * workArea.width));
        let targetY = Math.floor(workArea.y + (minY * workArea.height));
        let targetW = Math.floor((maxX - minX) * workArea.width);
        let targetH = Math.floor((maxY - minY) * workArea.height);

        if (window.get_maximized()) {
            window.unmaximize(Meta.MaximizeFlags.BOTH);
        }

        window.move_resize_frame(true, targetX, targetY, targetW, targetH);

        Mainloop.idle_add(() => {
            try {
                if (window && window.get_compositor_private()) {
                    window.move_frame(true, targetX, targetY);
                }
            } catch (err) {
                global.logError("[drag-overlay] Idle callback snap error: " + err.message);
            }
            return false;
        });
    } catch (e) {
        global.logError("[drag-overlay] Error in snapWindowToSelectedZones: " + e.message);
    }
}

function arraysEqual(a, b) {
    try {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    } catch (e) {
        global.logError("[drag-overlay] Error in arraysEqual: " + e.message);
        return false;
    }
}