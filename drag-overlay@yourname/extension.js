const St = imports.gi.St;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;

let grabBeginId = 0;
let grabEndId = 0;
let hideTimerId = 0;
let activeWindow = null;

let overlayContainer = null;
let activeMonitor = null; // Tracks the monitor where overlay was spawned
let zones = [];
let activeZoneIndex = -1;
let initialZoneIndex = -1; // Locks the starting tile when Shift is held
let selectedZoneIndices = [];

// Helper generator for equal-width vertical split layouts (full height)
function createEqualVerticalLayout(count) {
    let layout = [];
    let width = 1.0 / count;
    for (let i = 0; i < count; i++) {
        layout.push({
            name: `Col ${i + 1}`,
            x: i * width,
            y: 0.0,
            w: width,
            h: 1.0
        });
    }
    return layout;
}

// Helper generator for equal-width vertical columns split horizontally in half (2 rows per column)
function createSplitVerticalLayout(count) {
    let layout = [];
    let width = 1.0 / count;
    for (let i = 0; i < count; i++) {
        layout.push({
            name: `Top ${i + 1}`,
            x: i * width,
            y: 0.0,
            w: width,
            h: 0.5
        });
        layout.push({
            name: `Bottom ${i + 1}`,
            x: i * width,
            y: 0.5,
            w: width,
            h: 0.5
        });
    }
    return layout;
}

// Helper to determine which monitor currently contains the mouse pointer
function getMonitorAtPointer() {
    let [x, y] = global.get_pointer();
    let monitors = Main.layoutManager.monitors;
    
    for (let i = 0; i < monitors.length; i++) {
        let m = monitors[i];
        if (x >= m.x && x < (m.x + m.width) && y >= m.y && y < (m.y + m.height)) {
            return m;
        }
    }
    return Main.layoutManager.primaryMonitor;
}

// Defines 15 distinct layout groups with specific tile geometries
const LAYOUT_GROUPS = [
    // Group 1: Left / Right vertical (50% / 50%)
    [
        { name: "Left",  x: 0.0, y: 0.0, w: 0.5, h: 1.0 },
        { name: "Right", x: 0.5, y: 0.0, w: 0.5, h: 1.0 }
    ],
    // Group 2: 3 vertical, equal width
    createEqualVerticalLayout(3),

    // Group 3: 4 quadrants
    [
        { name: "Top Left",     x: 0.0, y: 0.0, w: 0.5, h: 0.5 },
        { name: "Top Right",    x: 0.5, y: 0.0, w: 0.5, h: 0.5 },
        { name: "Bottom Left",  x: 0.0, y: 0.5, w: 0.5, h: 0.5 },
        { name: "Bottom Right", x: 0.5, y: 0.5, w: 0.5, h: 0.5 }
    ],
    // Group 4: Left / Right vertical (75% / 25%)
    [
        { name: "Wide Left",   x: 0.0,  y: 0.0, w: 0.75, h: 1.0 },
        { name: "Narrow Right",x: 0.75, y: 0.0, w: 0.25, h: 1.0 }
    ],
    // Group 5: 3 vertical (25% / 50% / 25%)
    [
        { name: "Left",   x: 0.0,  y: 0.0, w: 0.25, h: 1.0 },
        { name: "Center", x: 0.25, y: 0.0, w: 0.50, h: 1.0 },
        { name: "Right",  x: 0.75, y: 0.0, w: 0.25, h: 1.0 }
    ],
    // Group 6: Left / Right vertical (25% / 75%)
    [
        { name: "Narrow Left", x: 0.0,  y: 0.0, w: 0.25, h: 1.0 },
        { name: "Wide Right",  x: 0.25, y: 0.0, w: 0.75, h: 1.0 }
    ],
    // Group 7: Left / Right vertical (80% / 20%)
    [
        { name: "Wide Left",   x: 0.0,  y: 0.0, w: 0.80, h: 1.0 },
        { name: "Narrow Right",x: 0.80, y: 0.0, w: 0.20, h: 1.0 }
    ],
    // Group 8: 3 vertical (20% / 60% / 20%)
    [
        { name: "Left",   x: 0.0,  y: 0.0, w: 0.20, h: 1.0 },
        { name: "Center", x: 0.20, y: 0.0, w: 0.60, h: 1.0 },
        { name: "Right",  x: 0.80, y: 0.0, w: 0.20, h: 1.0 }
    ],
    // Group 9: Left / Right vertical (20% / 80%)
    [
        { name: "Narrow Left", x: 0.0,  y: 0.0, w: 0.20, h: 1.0 },
        { name: "Wide Right",  x: 0.20, y: 0.0, w: 0.80, h: 1.0 }
    ],
    // Group 10: 4 vertical, equal width
    createEqualVerticalLayout(4),

    // Group 11: 5 vertical, equal width
    createEqualVerticalLayout(5),

    // Group 12: 6 vertical, equal width
    createEqualVerticalLayout(6),

    // Group 13: 4 vertical, equal width, split in horizontal middle
    createSplitVerticalLayout(4),

    // Group 14: 5 vertical, equal width, split in horizontal middle
    createSplitVerticalLayout(5),

    // Group 15: 6 vertical, equal width, split in horizontal middle
    createSplitVerticalLayout(6)
];

function init(metadata) {}

function enable() {
    try {
        grabBeginId = global.display.connect('grab-op-begin', onGrabBegin);
        grabEndId = global.display.connect('grab-op-end', onGrabEnd);
    } catch (e) {
        global.logError("[drag-overlay] Error in enable: " + e.message);
    }
}

function disable() {
    try {
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
        destroyOverlay();
    } catch (e) {
        global.logError("[drag-overlay] Error in disable: " + e.message);
    }
}

function onGrabBegin(display, screen, window, op) {
    if (op === Meta.GrabOp.MOVING || op === Meta.GrabOp.KEYBOARD_MOVING) {
        activeWindow = window;

        if (hideTimerId > 0) {
            Mainloop.source_remove(hideTimerId);
            hideTimerId = 0;
        }

        showOverlay();
        startMouseTracking();
    }
}

function onGrabEnd(display, screen, window, op) {
    stopMouseTracking();

    if (activeWindow && selectedZoneIndices.length > 0) {
        snapWindowToSelectedZones(activeWindow, selectedZoneIndices);
    }

    if (overlayContainer) {
        hideTimerId = Mainloop.timeout_add(300, () => {
            destroyOverlay();
            hideTimerId = 0;
            return false;
        });
    }
}

function showOverlay() {
    if (overlayContainer) return;

    // Detect the monitor where the mouse pointer currently is
    activeMonitor = getMonitorAtPointer();

    const groupCols = 3;
    const groupRows = Math.ceil(LAYOUT_GROUPS.length / groupCols);
    const cardWidth = 140;
    const cardHeight = 85;
    const gap = 10;
    const padding = 14;

    const footerHeight = 65;

    const gridWidth = (groupCols * cardWidth) + ((groupCols - 1) * gap);
    const gridHeight = (groupRows * cardHeight) + ((groupRows - 1) * gap);

    const popupWidth = gridWidth + (padding * 2);
    const popupHeight = gridHeight + (padding * 2) + footerHeight;

    // Position overlay relative to activeMonitor offset and dimensions
    const popupX = Math.floor(activeMonitor.x + (activeMonitor.width - popupWidth) / 2);
    const popupY = Math.floor(activeMonitor.y + (activeMonitor.height * 0.15));

    overlayContainer = new St.Widget({
        reactive: false,
        can_focus: false,
        x: popupX,
        y: popupY,
        width: popupWidth,
        height: popupHeight
    });

    overlayContainer.set_style(`
        background-color: rgba(20, 20, 20, 0.92);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
    `);

    zones = [];
    selectedZoneIndices = [];
    initialZoneIndex = -1;

    // Layout Grid
    const gridOffsetY = padding;

    LAYOUT_GROUPS.forEach((layout, groupIdx) => {
        let col = groupIdx % groupCols;
        let row = Math.floor(groupIdx / groupCols);

        let groupX = padding + col * (cardWidth + gap);
        let groupY = gridOffsetY + row * (cardHeight + gap);

        let groupCard = new St.Widget({
            reactive: false,
            can_focus: false,
            x: groupX,
            y: groupY,
            width: cardWidth,
            height: cardHeight
        });

        groupCard.set_style(`
            background-color: rgba(40, 40, 40, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
        `);

        overlayContainer.add_actor(groupCard);

        let innerPad = 4;
        let innerW = cardWidth - (innerPad * 2);
        let innerH = cardHeight - (innerPad * 2);

        layout.forEach((def) => {
            let localX = innerPad + Math.floor(def.x * innerW);
            let localY = innerPad + Math.floor(def.y * innerH);
            let tileW = Math.max(2, Math.floor(def.w * innerW) - 2);
            let tileH = Math.max(2, Math.floor(def.h * innerH) - 2);

            let screenX = popupX + groupX + localX;
            let screenY = popupY + groupY + localY;

            let tileWidget = new St.BoxLayout({
                reactive: false,
                can_focus: false,
                x: localX,
                y: localY,
                width: tileW,
                height: tileH
            });

            applyZoneStyle(tileWidget, false);

            groupCard.add_actor(tileWidget);

            zones.push({
                groupIdx: groupIdx,
                widget: tileWidget,
                bounds: { x: screenX, y: screenY, w: tileW, h: tileH },
                def: def
            });
        });
    });

    // Bottom Instructions (3 Lines, Center-Aligned)
    const footerOffsetY = gridOffsetY + gridHeight + 12;

    let footerBox = new St.BoxLayout({
        vertical: true,
        x: padding,
        y: footerOffsetY,
        width: gridWidth,
        height: footerHeight
    });

    let titleLine = new St.Label({
        text: "Brand Title Ver 1.0"
    });
    titleLine.set_style(`
        font-weight: bold;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.95);
        text-align: center;
    `);

    let helpLine = new St.Label({
        text: "Drag a window onto a zone to snap."
    });
    helpLine.set_style(`
        font-size: 11px;
        color: rgba(230, 230, 230, 0.9);
        font-weight: 500;
        text-align: center;
    `);

    let optionalLine = new St.Label({
        text: "(Optional) Hold Shift to expand selection."
    });
    optionalLine.set_style(`
        font-size: 10px;
        color: rgba(170, 170, 170, 0.8);
        text-align: center;
    `);

    footerBox.add_actor(titleLine);
    footerBox.add_actor(helpLine);
    footerBox.add_actor(optionalLine);

    overlayContainer.add_actor(footerBox);

    Main.uiGroup.add_actor(overlayContainer);
}

let mouseTrackingTimer = 0;

function startMouseTracking() {
    mouseTrackingTimer = Mainloop.timeout_add(30, () => {
        let [mouseX, mouseY] = global.get_pointer();
        
        // Check Shift key state using Clutter modifier mask
        let [x, y, mods] = global.get_pointer();
        let isShiftPressed = (mods & Clutter.ModifierType.SHIFT_MASK) !== 0;

        updateZoneHover(mouseX, mouseY, isShiftPressed);
        return true;
    });
}

function stopMouseTracking() {
    if (mouseTrackingTimer > 0) {
        Mainloop.source_remove(mouseTrackingTimer);
        mouseTrackingTimer = 0;
    }
}

function updateZoneHover(mx, my, isShiftPressed) {
    let hoveredIndex = -1;

    // Find tile currently under mouse
    zones.forEach((zone, index) => {
        let b = zone.bounds;
        if (mx >= b.x && mx <= (b.x + b.w) && my >= b.y && my <= (b.y + b.h)) {
            hoveredIndex = index;
        }
    });

    let newSelectedIndices = [];

    // If mouse is outside all zones, clear selection state completely
    if (hoveredIndex === -1) {
        activeZoneIndex = -1;
        initialZoneIndex = -1;
    } else if (isShiftPressed) {
        // Lock initial tile if Shift was just pressed
        if (initialZoneIndex < 0) {
            initialZoneIndex = hoveredIndex;
        }

        let targetGroup = zones[initialZoneIndex].groupIdx;

        // Only update active tile if hovering in the same group
        if (zones[hoveredIndex].groupIdx === targetGroup) {
            activeZoneIndex = hoveredIndex;
        }

        // Calculate rectangular bounding box containing initial tile and active tile
        let initDef = zones[initialZoneIndex].def;
        let activeDef = zones[activeZoneIndex >= 0 ? activeZoneIndex : initialZoneIndex].def;

        let minX = Math.min(initDef.x, activeDef.x);
        let minY = Math.min(initDef.y, activeDef.y);
        let maxX = Math.max(initDef.x + initDef.w, activeDef.x + activeDef.w);
        let maxY = Math.max(initDef.y + initDef.h, activeDef.y + activeDef.h);

        // Select all tiles in the SAME group enclosed by this bounding rectangle
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
    } else {
        // Normal single hover (Shift released)
        initialZoneIndex = -1;
        activeZoneIndex = hoveredIndex;
        newSelectedIndices = [hoveredIndex];
    }

    // Update visuals if selection changed
    if (!arraysEqual(selectedZoneIndices, newSelectedIndices)) {
        // Reset unselected
        selectedZoneIndices.forEach(idx => {
            if (zones[idx] && !newSelectedIndices.includes(idx)) {
                applyZoneStyle(zones[idx].widget, false);
            }
        });

        // Highlight selected in Twitter Blue
        newSelectedIndices.forEach(idx => {
            if (zones[idx]) {
                applyZoneStyle(zones[idx].widget, true);
            }
        });

        selectedZoneIndices = newSelectedIndices;
    }
}

function applyZoneStyle(widget, isHighlighted) {
    if (isHighlighted) {
        widget.set_style(`
            background-color: rgba(29, 161, 242, 0.85);
            border: 1px solid #1DA1F2;
            border-radius: 4px;
        `);
    } else {
        widget.set_style(`
            background-color: rgba(80, 80, 80, 0.50);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
        `);
    }
}

function snapWindowToSelectedZones(window, indices) {
    if (indices.length === 0) return;

    let monitor = activeMonitor || getMonitorAtPointer();

    // Calculate combined bounding area across all selected tiles
    let minX = 1.0, minY = 1.0, maxX = 0.0, maxY = 0.0;

    indices.forEach(idx => {
        let def = zones[idx].def;
        if (def.x < minX) minX = def.x;
        if (def.y < minY) minY = def.y;
        if ((def.x + def.w) > maxX) maxX = def.x + def.w;
        if ((def.y + def.h) > maxY) maxY = def.y + def.h;
    });

    let targetX = Math.floor(monitor.x + (minX * monitor.width));
    let targetY = Math.floor(monitor.y + (minY * monitor.height));
    let targetW = Math.floor((maxX - minX) * monitor.width);
    let targetH = Math.floor((maxY - minY) * monitor.height);

    if (window.get_maximized()) {
        window.unmaximize(Meta.MaximizeFlags.BOTH);
    }

    // Step 1: Initial move and resize frame
    window.move_resize_frame(true, targetX, targetY, targetW, targetH);

    // Step 2: Queue an idle frame correction for grid-constrained apps (like gnome-terminal)
    Mainloop.idle_add(() => {
        if (window && window.get_compositor_private()) {
            // Re-enforce top-left position after terminal adjusts to character grids
            window.move_frame(true, targetX, targetY);
        }
        return false; // Run once
    });
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function destroyOverlay() {
    if (overlayContainer) {
        Main.uiGroup.remove_actor(overlayContainer);
        overlayContainer.destroy();
        overlayContainer = null;
        activeMonitor = null;
        zones = [];
        activeZoneIndex = -1;
        initialZoneIndex = -1;
        selectedZoneIndices = [];
        activeWindow = null;
    }
}