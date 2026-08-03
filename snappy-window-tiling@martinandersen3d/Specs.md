# Technical Specification: Desktop Layout Snapper Utility

*Version 2 — reflects the current implementation, including full keyboard
navigation and dual-mode mouse support. Written to be platform- and
framework-agnostic so it can be reproduced on another OS or UI toolkit.*

---

## 1. Overview

A lightweight desktop utility that displays an interactive layout-picker
overlay and lets the user snap the active window into a preset screen
zone. It can be invoked two different ways, and **both are first-class,
fully-supported interaction modes**:

1. **Drag-to-snap**: dragging any application window opens the overlay;
   moving the mouse over a tile highlights it; releasing the window over a
   tile snaps it there.
2. **Hotkey-invoke** (e.g. `Super+Z`, Windows-11-style): pressing a global
   hotkey captures whichever window currently has focus, opens the same
   overlay, and grabs keyboard input so the user can navigate and confirm
   a zone entirely by keyboard — **or** by mouse, since hover-highlight and
   click-to-confirm also work in this mode.

The overlay presents 15 distinct layout presets ("groups") arranged in a
3-column grid. Each group contains 2–12 individual tiles. Users can
optionally hold `Ctrl` to expand their selection across adjacent tiles
within the same group, regardless of whether they're using the mouse or
the keyboard.

---

## 2. Global State & Architecture

### Core State

| Variable | Type | Purpose |
|---|---|---|
| `activeWindow` | window handle | The window that will be snapped. Captured at drag-start or at hotkey-press. |
| `overlayContainer` | UI container/widget | The root overlay surface. Built once, shown/hidden/repositioned per invocation. |
| `activeMonitor` | monitor/display record | The monitor the overlay opened on (pointer's monitor at open time); target for the eventual snap. |
| `zones` | array | Flat list of **every** tile across all 15 groups. Each entry: `{ groupIdx (0–14), widget, badgeLabel, bounds: {x,y,w,h} (absolute screen px, computed when shown), def: {x,y,w,h} (fractional 0.0–1.0, relative to its group) }`. |
| `groupCards` | array | One entry per group: `{ widget, badgeLabel, zoneIndices: [...], isFocused }`, where `zoneIndices` lists that group's indices into `zones`. |
| `activeZoneIndex` | int | Tile currently under the mouse pointer, `-1` if none. |
| `initialZoneIndex` | int | Tile where a Ctrl multi-select range began, `-1` when inactive. Shared by both mouse and keyboard Ctrl-selection. |
| `selectedZoneIndices` | array\<int> | Tiles currently highlighted/selected — the set that will be snapped to on confirm. |

### Mode / Navigation State

| Variable | Type | Purpose |
|---|---|---|
| `isHotkeyActivated` | bool | `true` if this invocation came from the global hotkey (enables keyboard grab + badges); `false` for a plain window drag. |
| `modalGrabbed` | bool | Whether the exclusive input grab (see §6) is currently held. Used to guard the matching release call. |
| `navStep` | int (1 or 2) | `1` = Group Selection, `2` = Tile Selection. Only meaningful while `isHotkeyActivated`. |
| `selectedGroupIdx` | int | The **confirmed** group once Step 2 is entered. |
| `focusedGroupIdx` | int | Arrow-key cursor position while in Step 1 (before confirmation). Independent of `selectedGroupIdx` so browsing doesn't commit anything until confirmed. |
| `focusedTileInGroup` | int | Arrow-key/local-index cursor position within the confirmed group while in Step 2. |

### Housekeeping / Handles

| Variable | Purpose |
|---|---|
| `keyEventId` | Handle for the global key-press listener, active only while the hotkey-mode overlay is open. |
| `mouseButtonEventId` | Handle for the global click listener, active only while the hotkey-mode overlay is open (see §7.2). |
| `mouseTrackingTimer` | Handle for the ~40 ms mouse-position poll, active whenever hover-highlighting is needed (both modes). |
| `lastMouseX`, `lastMouseY`, `lastCtrlState` | Last-seen poll values, used to skip redundant hover recalculation when nothing changed. |
| `hideTimerId` | Short delay (~300 ms) before destroying/hiding the overlay after a drag-drop snap, to avoid a visible flash. |

---

## 3. UI Layout & Visual Design

### Overlay Container

- **Position**: Centered horizontally on the monitor the pointer is on at
  open time (`X = MonitorX + (MonitorWidth − OverlayWidth) / 2`); vertical
  offset near the top (`Y = MonitorY + MonitorHeight × 0.15`).
- **Background**: Dark semi-transparent (`rgba(20,20,20,0.92)`), `16px`
  rounded corners, `2px solid rgba(255,255,255,0.2)` border.
- **Padding**: `14px` internal.

### Grid Structure

- **Grid**: 3 columns × 5 rows of Group Cards (15 groups, row-major:
  `col = groupIdx % 3`, `row = floor(groupIdx / 3)`).
- **Card size**: `140×85px`, `10px` gap between cards.
- **Card style**: `rgba(40,40,40,0.6)` fill, `1px solid rgba(255,255,255,0.15)`
  border, `8px` rounded corners.
- **Focused card** (arrow-key cursor in Step 1, or the confirmed group in
  Step 2): distinct highlight border style, applied/removed idempotently
  (only touch the DOM/scene-graph when focus state actually changes).

### Tile Styling (within a card)

- **Inner margin**: `4px`.
- **Default tile**: `rgba(80,80,80,0.50)` fill, `1px solid rgba(255,255,255,0.2)`
  border, `4px` rounded corners.
- **Highlighted/selected tile**: `rgba(29,161,242,0.85)` fill, solid
  `#1DA1F2` border, `4px` rounded corners. This same highlight state is
  used for mouse-hover, keyboard-focus, and multi-select — there is only
  one "selected" visual state, driven by `selectedZoneIndices`.

### Numeric Badges (hotkey mode only)

- Step 1: every group card shows a badge `1`–`9`, then `0` for the 10th
  group. Groups 11–15 show no badge (unreachable by number key — see §7).
- Step 2: every tile in the confirmed group shows a badge `1`–`9`, then
  `0` for its 10th tile, using the same 1-indexed/`0`-wraps-to-10th
  convention.
- Badges are hidden entirely during a plain mouse-drag invocation.

### Footer Section

Bottom-anchored, center-aligned, stacked text (~`65px` height budget):

1. **Title line** — bold, 13px, near-white.
2. **Help line** — regular, 11px, off-white. Wording should reflect that
   *both* number keys and arrow keys work, e.g. *"Press a number, or use
   the arrow keys, to select a zone."*
3. **Optional line** — regular, 10px, muted gray — *"(Optional) Hold Ctrl
   to expand selection."*

---

## 4. Layout Presets Definition

All layouts use normalized coordinates (`0.0`–`1.0`) relative to their
group's card area. 15 groups, 3 columns × 5 rows:

1. **50/50 split** — Left (`w:0.5`), Right (`w:0.5`)
2. **Equal 3 cols** — 3 columns, `w:0.333` each
3. **4 quadrants** — Top-Left/Top-Right/Bottom-Left/Bottom-Right, `w:0.5,h:0.5` each
4. **75/25 split** — Wide Left (`w:0.75`), Narrow Right (`w:0.25`)
5. **25/50/25 split** — Left/Center/Right (`w:0.25/0.50/0.25`)
6. **25/75 split** — Narrow Left (`w:0.25`), Wide Right (`w:0.75`)
7. **80/20 split** — Wide Left (`w:0.80`), Narrow Right (`w:0.20`)
8. **20/60/20 split** — Left/Center/Right (`w:0.20/0.60/0.20`)
9. **20/80 split** — Narrow Left (`w:0.20`), Wide Right (`w:0.80`)
10. **Equal 4 cols** — `w:0.25` each
11. **Equal 5 cols** — `w:0.20` each
12. **Equal 6 cols** — `w:0.166` each
13. **4 cols × 2 rows split** — 8 tiles total
14. **5 cols × 2 rows split** — 10 tiles total
15. **6 cols × 2 rows split** — 12 tiles total

Groups 11–15 (indices 10–14) exist and are fully usable via mouse and
arrow-key navigation, but have **no direct number-key shortcut** (see §7.3).

---

## 5. Activation Modes

### 5.1 Drag-to-Snap

- **Trigger**: OS/window-manager reports a window move (drag) operation
  starting.
- **Action**:
  1. Store the dragged window as `activeWindow`.
  2. Cancel any pending overlay-destruction timer.
  3. Set `isHotkeyActivated = false`.
  4. Show the overlay (no keyboard grab, no numeric badges).
  5. Start the mouse-position polling loop (§7.1).
- **Confirm**: on drag-release (window-manager reports the move operation
  ending):
  1. Stop the polling loop.
  2. If `selectedZoneIndices` is non-empty and `activeWindow` is valid, run
     the snap algorithm (§8).
  3. Hide the overlay after a short delay (~300 ms) to avoid a visual pop.

### 5.2 Hotkey-Invoke

- **Trigger**: global hotkey pressed (e.g. `Super+Z`) while the overlay is
  closed.
- **Action**:
  1. Capture the currently-focused window as `activeWindow`.
  2. Set `isHotkeyActivated = true`.
  3. Show the overlay, reset `navStep = 1`, `selectedGroupIdx = 0`,
     `focusedGroupIdx = 0`, `focusedTileInGroup = 0`,
     `selectedZoneIndices = []`, `initialZoneIndex = -1`.
  4. Acquire an **exclusive input grab** (§6) so key/click events reach the
     overlay instead of whatever previously had focus.
  5. Set explicit keyboard focus onto the overlay's root actor.
  6. Attach the key-press listener (§7.3) and the click listener (§7.2).
  7. Start the mouse-position polling loop (§7.1) — hover-highlighting is
     available immediately, even before any key is pressed.
  8. Render Step 1 badges/focus state.
- **Re-pressing the hotkey while open** closes the overlay (same effect as
  `Escape` at Step 1 — see §7.3).
- **Confirm/cancel** happen via keyboard (§7.3) or mouse click (§7.2); both
  paths converge on the same snap-and-close logic.
- **Close/teardown** (on Escape-at-Step-1, hotkey-toggle-off, successful
  snap, or extension disable) must, in this order:
  1. Release the exclusive input grab if held.
  2. Detach the key-press and click listeners.
  3. Stop the mouse polling loop.
  4. Clear explicit keyboard focus.
  5. Reset all visual highlight/focus state on every tile and card.
  6. Clear `activeMonitor`, `activeZoneIndex`, `initialZoneIndex`,
     `selectedZoneIndices`, `activeWindow`, `isHotkeyActivated`, `navStep`,
     `selectedGroupIdx`, `focusedGroupIdx`, `focusedTileInGroup` back to
     their defaults.
  7. Hide the overlay.

---

## 6. Exclusive Input Grab (Hotkey Mode)

Hotkey mode requires a **real, compositor/window-manager-level modal
input grab** — not merely "connect a key-press listener." Simply
listening for key events without an actual grab is insufficient: on most
desktop stacks, the previously-focused application will continue to
receive (and typically consume) keyboard input, so the overlay never
actually gets the keystrokes.

Porting requirements:

- Use whatever the target platform's compositor/UI-shell exposes as a
  **modal grab primitive** (grabs both keyboard and pointer input to a
  specific actor/window, redirecting all input there until released) —
  e.g. a "push modal" style API, an explicit `XGrabKeyboard`-equivalent
  tied to window-manager cooperation, or the platform's dialog-modal
  mechanism repurposed for an overlay.
- Track whether the grab actually succeeded (it can fail, e.g. if another
  grab is already active) and only attempt to release a grab that was
  actually acquired.
- In addition to the grab, explicitly set **keyboard focus** onto the
  overlay's root UI element so it is the actor that receives events even
  if the grab mechanism is focus-follows-actor rather than blanket
  redirection.
- On teardown, release the grab and clear keyboard focus (see §5.2 step 6)
  even if the overlay is being destroyed for another reason (extension
  disable, error path, etc.) — never leave a grab held with no matching
  release.

---

## 7. Interaction Handling

### 7.1 Mouse Hover Tracking (both modes)

Runs on a fixed poll interval (~40 ms) whenever the overlay is open,
**regardless of which mode opened it**:

1. Read pointer coordinates and modifier-key state.
2. Skip recomputation if neither the coordinates nor the Ctrl state
   changed since the last tick (cheap early-out).
3. Hit-test the pointer against every zone's absolute `bounds` to find
   `hoveredIndex` (`-1` if none).
4. **Ctrl released**: reset `initialZoneIndex = -1`; if hovering a tile,
   `selectedZoneIndices = [hoveredIndex]`.
5. **Ctrl held**:
   - If `initialZoneIndex` is unset, lock it to the current
     `activeZoneIndex` (or `hoveredIndex`).
   - Only tiles in the **same group** as `initialZoneIndex` are eligible.
   - Compute the fractional bounding box spanning the initial tile and
     the current tile (`min`/`max` of `x`, `y`, `x+w`, `y+h`).
   - Select every tile in that group whose **center point** falls inside
     that bounding box.
6. Only touch visual state for tiles/cards whose membership in
   `selectedZoneIndices` actually changed (diff old vs. new selection,
   don't blindly re-render everything every tick).

This is the same routine used by drag-to-snap hovering; hotkey mode reuses
it verbatim rather than having a separate hover implementation.

### 7.2 Mouse Click Confirm (Hotkey Mode Only)

Drag-to-snap confirms on window-release (an OS-level event, not a click).
Hotkey mode additionally supports **click-to-confirm**, since the overlay
is a normal on-screen widget the user can click into:

1. On a left-click (`button == 1`) anywhere while the hotkey-mode overlay
   is open:
2. Re-run the hover hit-test at the exact click coordinates (with current
   Ctrl state) so the selection reflects precisely where the click
   landed, even if the poll loop's last tick is stale.
3. If `selectedZoneIndices` is non-empty and `activeWindow` is valid, run
   the snap algorithm (§8), then close the overlay (§5.2 step "close").
4. If the click landed outside any tile (empty selection), do nothing —
   the overlay stays open. (Closing/canceling remains a keyboard-only
   action, via `Escape`.)
5. Right-clicks and other buttons are ignored.

Note this listener is **only** active in hotkey mode. During a plain
window-drag, the mouse button is already held down for the entire
duration of the drag, and confirmation happens on release, not press —
adding a click listener there would be redundant/incorrect.

### 7.3 Keyboard Navigation (Hotkey Mode Only)

A single global key-press listener, active only while the hotkey-mode
overlay is open, dispatches based on `navStep`.

**Global keys (either step):**

| Key | Step 1 behavior | Step 2 behavior |
|---|---|---|
| `Escape` | Close overlay, restore prior window focus | Step back to Step 1 (keep `initialZoneIndex` cleared) |
| `Backspace` | Close overlay | Step back to Step 1 |

**Step 1 — Group Selection:**

- **Number keys `1`–`9`, `0`** (top-row *and* numeric-keypad variants must
  both be recognized — see note below): jump directly to the
  corresponding group (`1`→group 1 ... `9`→group 9, `0`→group 10) **and**
  immediately confirm, transitioning to Step 2 for that group. Also
  updates the arrow-cursor (`focusedGroupIdx`) to match, so returning via
  `Escape`/`Backspace` shows a consistent focus position.
  - Groups 11–15 have **no** number-key shortcut — number keys simply
    can't address them.
- **Arrow keys** (`Left`/`Right`/`Up`/`Down`): move `focusedGroupIdx` one
  cell in the 3-column grid (row-major). Left/Right are clamped to stay
  within the current row; Up/Down move by one full row (±3 index
  positions), clamped to the valid group range (0–14). This is how groups
  11–15 are reached. Moving focus **does not** confirm — it only updates
  the highlighted card.
- **Enter / Space** (including numeric-keypad Enter): confirm whichever
  group is currently focused (`focusedGroupIdx` → `selectedGroupIdx`),
  transition to Step 2.

**Step 2 — Tile Selection** (operates on tiles within `selectedGroupIdx`):

- **Number keys `1`–`9`, `0`** (top-row and keypad): select that tile
  directly.
  - Without Ctrl: immediately confirm and snap.
  - With Ctrl: extend the selection from the tile where the Ctrl-range
    started (or the currently focused tile if no range is active yet) to
    this tile — same bounding-box-by-center-point rule as mouse
    Ctrl-drag (§7.1 step 5) — but do **not** auto-confirm; the user must
    press Enter to commit a Ctrl-expanded range.
- **Arrow keys**: move `focusedTileInGroup` to the nearest tile in the
  pressed direction, using each tile's fractional center point (not raw
  index order) so this works correctly regardless of how a given layout's
  tiles are arranged (single row, 2×N grid, uneven splits, etc.). A tile
  only counts as a candidate in a given direction if its center is
  strictly on that side (e.g., for `Right`, its center-x must be greater
  than the current tile's); among valid candidates, pick the closest one.
  If Ctrl is held, apply the same Ctrl-range-expansion described above
  instead of a plain focus move.
- **Enter / Space**: confirm and snap using the current
  `selectedZoneIndices` (whether that's a single tile or a Ctrl-expanded
  range).

> **Numeric-keypad caveat**: keypad digit keys only report as literal
> digit key-codes when Num Lock is enabled. With Num Lock off, the same
> physical keys typically report as navigation keys instead (Home, End,
> arrows, etc.) at the OS/toolkit level — this is outside the
> application's control and should be documented as a known limitation
> rather than worked around.

---

## 8. Snapping Execution Algorithm

Identical regardless of which mode/input method triggered it:

1. Determine the target monitor (`activeMonitor`, captured when the
   overlay opened; falls back to the pointer's current monitor if unset).
2. Across all tiles in `selectedZoneIndices`, compute the fractional
   bounding box:
   - `minX = min(tile.x)`, `minY = min(tile.y)`
   - `maxX = max(tile.x + tile.w)`, `maxY = max(tile.y + tile.h)`
3. Convert to absolute target geometry on that monitor:
   - `targetX = floor(monitor.x + minX × monitor.width)`
   - `targetY = floor(monitor.y + minY × monitor.height)`
   - `targetW = floor((maxX − minX) × monitor.width)`
   - `targetH = floor((maxY − minY) × monitor.height)`
4. If the window is currently maximized, un-maximize it first.
5. Move/resize the window to `(targetX, targetY, targetW, targetH)`.
6. (Implementation detail, not strictly required by the algorithm but
   present in the reference implementation as a robustness measure): a
   follow-up move on the next idle tick, to correct for window managers
   that ignore the position portion of a combined move-resize call made
   while the window is still settling from un-maximizing.

---

## 9. Event/State Summary Table

| Event | Mode | Effect |
|---|---|---|
| Window drag starts | Drag | Open overlay (no grab, no badges), start hover polling |
| Window drag ends | Drag | Stop polling, snap if selection non-empty, delayed hide |
| Global hotkey pressed (closed) | Hotkey | Capture focused window, open overlay, acquire grab, start polling, attach key+click listeners |
| Global hotkey pressed (open) | Hotkey | Close overlay (grab release, listener teardown, state reset) |
| Mouse move | Both | Update hover/selection highlight (§7.1) |
| Left click on a tile | Hotkey only | Confirm + snap + close |
| Number key | Hotkey, Step 1 | Jump to group + confirm → Step 2 |
| Number key | Hotkey, Step 2 | Select tile (+ Ctrl-range); confirm+snap unless Ctrl held |
| Arrow key | Hotkey, Step 1 | Move group focus cursor (no confirm) |
| Arrow key | Hotkey, Step 2 | Move tile focus cursor, or Ctrl-expand range if Ctrl held |
| Enter / Space | Hotkey, Step 1 | Confirm focused group → Step 2 |
| Enter / Space | Hotkey, Step 2 | Confirm + snap + close |
| Escape | Hotkey, Step 2 | Back to Step 1 |
| Escape | Hotkey, Step 1 | Close, no snap |
| Backspace | Hotkey | Same as Escape at either step |

---

## 10. Porting Notes

- All geometry that matters for snapping is stored in **fractional
  (0.0–1.0)** form (`def`); absolute pixel `bounds` are only a
  hit-testing cache recomputed whenever the overlay is (re)positioned.
  Keep this separation on any platform — it's what makes multi-monitor
  and multi-DPI support trivial.
- Visual "selected/highlighted" state should be a **single shared concept**
  driven off `selectedZoneIndices`, not three separate hover/focus/select
  states — mouse hover, keyboard focus, and Ctrl-range members should all
  render identically.
- Only mutate visual state (add/remove a highlight class, show/hide a
  badge) when the underlying state actually changed — both the reference
  implementation's hover loop and its render routines diff against
  previous state before touching the scene graph, since this runs on a
  fast poll timer.
- The exclusive-grab requirement in hotkey mode (§6) is the single most
  platform-specific piece of this spec; everything else (layout math,
  hover math, snap math, state machine) is portable pseudocode as written
  above.