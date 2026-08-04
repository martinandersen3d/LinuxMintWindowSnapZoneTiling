# Learnings — Problems & Solutions

Documented issues encountered while building the Snappy Window Tiling Cinnamon extension, and how they were resolved.

---

## Cinnamon Settings Caching

**Problem:** Changing `default` values in `settings-schema.json` has no effect on machines where the extension was already loaded. Cinnamon stores user values in a JSON cache file and never re-reads the schema defaults.

**Cache location:**
```
~/.config/cinnamon/spices/<uuid>/<uuid>.json
```

**Solution:** Delete the cache file and reload Cinnamon:
```bash
rm ~/.config/cinnamon/spices/snappy-window-tiling@martinandersen/snappy-window-tiling@martinandersen.json
cinnamon --replace &
```

> Note: `locate` uses a stale database. Use `find` instead:
> ```bash
> find ~/ -name "*martinandersen*" 2>/dev/null
> ```

---

## Settings Toggle Not Rebuilding the Overlay

**Problem:** Toggling a setting (e.g. `enable-workspace-switcher`) in the Cinnamon Settings UI had no effect because the overlay was built once at startup and never rebuilt when that setting changed.

**Solution:** Connect every setting that affects the overlay structure to `destroyOverlayUI()` via `SettingsManager.connectChanged`:

```js
SettingsManager.connectChanged("enable-workspace-switcher", rebuildOverlay);
```

The layout presets already did this — new feature-flag settings must be wired the same way.

---

## SHIFT + Number Keys Change Key Symbol

**Problem:** Detecting `SHIFT+1` via `event.get_key_symbol()` fails because holding SHIFT transforms the symbol — `KEY_1` becomes `KEY_exclam` (`!`), `KEY_2` becomes `KEY_at` (`@`), etc. This varies by keyboard layout.

**Solution:** Use `event.get_key_code()` (hardware scancode), which is stable regardless of modifiers. On Linux evdev:

| Hardware keycode | Key |
|---|---|
| 10 | `1` |
| 11 | `2` |
| … | … |
| 18 | `9` |

```js
let keycode = event.get_key_code();
if (keycode >= 10 && keycode <= 18) {
    let wsIdx = keycode - 10; // 0-based workspace index
}
```

For numpad keys, the symbol is still reliable (numpad doesn't shift): `symbol >= Clutter.KEY_KP_1 && symbol <= Clutter.KEY_KP_9`.

---

## Grid Naming Convention — cols × rows vs rows × cols

**Problem:** `createGridLayout(rows, cols)` takes rows first. Layout keys were named `layout-2x4-grid` but `createGridLayout(2, 4)` produces a **wide** 2-row × 4-col grid, while users read "2×4" as "2 columns, 4 rows tall" (portrait).

**Rule established:** Key names follow `{cols}x{rows}` (width × height), matching how most users interpret grid notation visually. The reference was `layout-6x4-grid` which correctly uses `createGridLayout(4, 6)` (4 rows, 6 cols).

**Fix pattern:**
```js
// "NxM" name → N cols × M rows → createGridLayout(M, N)
"layout-2x4-grid": createGridLayout(4, 2)  // 4 rows, 2 cols = 2 wide × 4 tall ✓
"layout-4x2-grid": createGridLayout(2, 4)  // 2 rows, 4 cols = 4 wide × 2 tall ✓
```

---

## Overlay Built Before Settings Initialized

**Problem:** `buildOverlayUIOnce()` was called eagerly in `enable()` before `createSettings()` ran. Layout preset toggles defaulted to `true` (fallback), so disabled presets still appeared in the overlay.

**Solution:** Remove the eager `buildOverlayUIOnce()` call from `enable()`. The overlay builds lazily on first `showOverlay()` call, by which point settings are fully initialized.

---

## Absolute Screen Bounds for Hit Testing

**Problem:** Workspace box bounds need absolute screen coordinates for mouse hit testing, but Clutter actor `.x`/`.y` are relative to their parent.

**Solution:** Walk the parent chain and sum positions. Since all positions are set explicitly with `set_position()` or constructor `x`/`y`, the calculation is deterministic:

```js
// overlayContainer is a direct child of Main.uiGroup (at screen coords)
let absX = overlayContainer.x         // screen X of overlay
         + workspaceSectionContainer.x // relative to overlay
         + workspaceBoxesContainer.x;  // relative to section

let absY = overlayContainer.y
         + workspaceSectionContainer.y
         + workspaceBoxesContainer.y;
```

Call this **after** `overlayContainer.set_position(popupX, popupY)` so coordinates are current.

---

## JSON Corruption from Escaped Strings in Editor Tools

**Problem:** When using `replace_string_in_file` with escaped characters (e.g. `\"`) in the `newString`, the literal escape sequences are written into the file instead of the intended characters, corrupting JSON files.

**Solution:** Always use raw (unescaped) strings in replacement tools. If a replacement removes more content than intended (e.g. truncates closing braces), immediately re-read the file and restore the missing structure.

---

## `onGrabEnd` Missing Workspace Logic

**Problem:** A `multi_replace_string_in_file` call reported success but the `onGrabEnd` workspace check was never written — the replacement matched ambiguously and silently failed to apply.

**Lesson:** After any batch replacement, verify critical functions with `grep_search` or `read_file` to confirm the change landed. Don't rely solely on "successfully edited" tool output.

---

## `locate` vs `find` on Linux

**Problem:** `locate snappy-window-tiling@martinandersen3d.json` returned empty even though the file existed.

**Cause:** `locate` searches a pre-built database (`updatedb`) that may be hours old.

**Solution:** Use `find` for real-time results:
```bash
find ~/ -name "*snappy*" 2>/dev/null
find ~/.config/cinnamon -name "*.json" 2>/dev/null
```

---

## Cinnamon Extension Settings File Path

The Cinnamon settings cache for an extension is stored at:
```
~/.config/cinnamon/spices/<uuid>/<uuid>.json
```

Note: the UUID directory name may differ from the extension install directory. In this project, the UUID used in the settings path was `snappy-window-tiling@martinandersen` (without `3d`) while the install directory used the full UUID `snappy-window-tiling@martinandersen3d`.
