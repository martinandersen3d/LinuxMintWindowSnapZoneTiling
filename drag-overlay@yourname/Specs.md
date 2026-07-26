Here is the full technical specification document for recreating this layout snapper utility on another platform or desktop environment.

---

# Technical Specification: Desktop Layout Snapper Utility

## 1. Overview

A lightweight desktop utility that displays an interactive layout overlay when a user drags any application window. The overlay presents 15 distinct screen-layout presets organized in a 3-column grid. Hovering over a tile highlights it, and releasing the mouse snaps the active window to the target zone. Users can optionally hold the `Shift` key to expand their selection across adjacent tiles within the same layout preset.

---

## 2. Global State & Architecture

### State Variables

* **`activeWindow`**: Reference/handle to the window currently being dragged.
* **`overlayContainer`**: The primary UI window/canvas containing the layout picker overlay.
* **`zones`**: Flat array of all interactive zone tiles rendered across all layout groups. Each item contains:
* `groupIdx` (Integer: 0–14)
* `widget` / `actor` (UI reference)
* `bounds` (Absolute screen bounding box `{ x, y, w, h }` for hit-testing)
* `def` (Relative geometry `{ x, y, w, h }` expressed as fractions `0.0`–`1.0`)


* **`activeZoneIndex`**: Index of the tile currently under the mouse pointer (`-1` if none).
* **`initialZoneIndex`**: Index of the tile where multi-selection initiated (`-1` when inactive).
* **`selectedZoneIndices`**: Array of tile indices currently active/highlighted.

---

## 3. UI Layout & Visual Design

### Overlay Container

* **Position**: Centered horizontally on the primary display (`X = ScreenWidth/2 - OverlayWidth/2`), offset vertically near the top (`Y = ScreenHeight * 0.15`).
* **Background Styling**: Dark semi-transparent background (`rgba(20, 20, 20, 0.92)`), rounded corners (`16px`), light border (`2px solid rgba(255, 255, 255, 0.2)`).
* **Padding**: Internal padding of `14px`.

### Grid Structure

* **Grid**: 3 columns × 5 rows of Layout Group Cards.
* **Group Card Dimensions**: Width = `140px`, Height = `85px`, Gap = `10px`.
* **Group Card Style**: Dark gray fill (`rgba(40, 40, 40, 0.6)`), subtle border (`1px solid rgba(255, 255, 255, 0.15)`), rounded corners (`8px`).

### Tile Styling within Cards

* **Inner Margin**: `4px` padding around card contents.
* **Default Tile**: Medium gray fill (`rgba(80, 80, 80, 0.50)`), light border (`1px solid rgba(255, 255, 255, 0.2)`), rounded corners (`4px`).
* **Highlighted Tile**: Bright blue fill (`rgba(29, 161, 242, 0.85)`), solid border (`#1DA1F2`), rounded corners (`4px`).

### Footer Section

Positioned at the bottom inside the overlay, center-aligned stacked text (`65px` height budget):

1. **Title Line**: Bold, 13px, White (`rgba(255, 255, 255, 0.95)`) — *"Brand Title Ver 1.0"*
2. **Help Line**: Regular, 11px, Off-white (`rgba(230, 230, 230, 0.9)`) — *"Drag a window onto a zone to snap."*
3. **Optional Line**: Regular, 10px, Muted Gray (`rgba(170, 170, 170, 0.8)`) — *"(Optional) Hold Shift to expand selection."*

---

## 4. Layout Presets Definition

All layouts use normalized relative coordinates (`0.0` to `1.0`) relative to the group container width/height:

1. **Group 1 (50/50 Split)**: Left (`w: 0.5`), Right (`w: 0.5`)
2. **Group 2 (Equal 3 Cols)**: 3 columns (`w: 0.333` each)
3. **Group 3 (4 Quadrants)**: Top-Left, Top-Right, Bottom-Left, Bottom-Right (`w: 0.5, h: 0.5` each)
4. **Group 4 (75/25 Split)**: Wide Left (`w: 0.75`), Narrow Right (`w: 0.25`)
5. **Group 5 (25/50/25 Split)**: Left (`w: 0.25`), Center (`w: 0.50`), Right (`w: 0.25`)
6. **Group 6 (25/75 Split)**: Narrow Left (`w: 0.25`), Wide Right (`w: 0.75`)
7. **Group 7 (80/20 Split)**: Wide Left (`w: 0.80`), Narrow Right (`w: 0.20`)
8. **Group 8 (20/60/20 Split)**: Left (`w: 0.20`), Center (`w: 0.60`), Right (`w: 0.20`)
9. **Group 9 (20/80 Split)**: Narrow Left (`w: 0.20`), Wide Right (`w: 0.80`)
10. **Group 10 (Equal 4 Cols)**: 4 vertical columns (`w: 0.25` each)
11. **Group 11 (Equal 5 Cols)**: 5 vertical columns (`w: 0.20` each)
12. **Group 12 (Equal 6 Cols)**: 6 vertical columns (`w: 0.166` each)
13. **Group 13 (4 Cols Split 2x2)**: 4 columns split horizontally in half (8 tiles total)
14. **Group 14 (5 Cols Split 2x2)**: 5 columns split horizontally in half (10 tiles total)
15. **Group 15 (6 Cols Split 2x2)**: 6 columns split horizontally in half (12 tiles total)

---

## 5. System Event Handling & Lifecycle

### 1. Window Drag Begin (`onGrabBegin`)

* **Trigger**: Detect when a window move/drag operation starts via OS window manager hooks.
* **Action**:
* Store reference to `activeWindow`.
* Cancel any pending destruction timers.
* Render `overlayContainer` on screen.
* Start polling mouse position and modifier keys (`~30ms` interval).



### 2. Mouse Tracking & Multi-Selection Logic (`updateZoneHover`)

During mouse tracking:

1. Fetch mouse pointer screen coordinates `(mx, my)` and modifier status (`isShiftPressed`).
2. Identify `hoveredIndex` by checking if `(mx, my)` falls within any tile’s screen bounding box.
3. **Single Selection (`Shift` released)**:
* Reset `initialZoneIndex = -1`.
* If hovering a tile, set `activeZoneIndex = hoveredIndex` and `selectedZoneIndices = [hoveredIndex]`.


4. **Multi-Selection (`Shift` pressed)**:
* If `initialZoneIndex == -1`, lock `initialZoneIndex = activeZoneIndex` (or `hoveredIndex`).
* If mouse is over a tile in the **same group** as `initialZoneIndex`, update `activeZoneIndex = hoveredIndex`.
* Compute bounding box enclosing relative area from `initialZoneIndex` tile to `activeZoneIndex` tile:
* $minX = \min(init.x, active.x)$, $minY = \min(init.y, active.y)$
* $maxX = \max(init.x + init.w, active.x + active.w)$
* $maxY = \max(init.y + init.h, active.y + active.h)$


* Select all tiles belonging to the same `groupIdx` whose center points fall within $[minX, maxX]$ and $[minY, maxY]$.


5. Update Visuals: Re-apply background colors (Default vs Highlighted) only when `selectedZoneIndices` contents change.

### 3. Window Drag End (`onGrabEnd`)

* **Trigger**: Window release/drop event.
* **Action**:
* Stop mouse tracking polling loop.
* If `selectedZoneIndices` is non-empty and `activeWindow` is valid:
* Execute snapping algorithm.


* Schedule overlay destruction after a short delay (e.g., `300ms`).



---

## 6. Snapping Execution Algorithm (`snapWindowToSelectedZones`)

1. Retrieve target display resolution and origin (`monitor.x, monitor.y, monitor.width, monitor.height`).
2. Iterate through `selectedZoneIndices` to calculate bounding box extremes in normalized scale ($0.0$–$1.0$):
* $minX = \min(tile.x)$
* $minY = \min(tile.y)$
* $maxX = \max(tile.x + tile.w)$
* $maxY = \max(tile.y + tile.h)$


3. Convert normalized bounding box to target absolute screen dimensions:
* $TargetX = \lfloor monitor.x + (minX \times monitor.width) \rfloor$
* $TargetY = \lfloor monitor.y + (minY \times monitor.height) \rfloor$
* $TargetW = \lfloor (maxX - minX) \times monitor.width \rfloor$
* $TargetH = \lfloor (maxY - minY) \times monitor.height \rfloor$


4. If window is maximized, unmaximize it first.
5. Move and resize `activeWindow` to `(TargetX, TargetY, TargetW, TargetH)`.

---


Next feature:
- When pressing super+z, the popup window should actually get focus.
- Only when activated with hotkey: Each of the groups should have a labed with a number from 1-0 (1,2,3,4,5,6,7,8,9,0), just like the windows 11 win+z, where the user can use the keyboard to pick a zone. When a zone is selected, then use have a label in each zone to pick the final zone. 
- the zone that the user picked, is where the program will end

do you have questions?