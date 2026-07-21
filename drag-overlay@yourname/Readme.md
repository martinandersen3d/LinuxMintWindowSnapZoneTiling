Here is a complete, polished `README.md` for your GitHub repository, complete with project badges, setup steps, feature highlights, and a quick architecture overview.

---

```markdown
# Brand Title Ver 1.0 — Desktop Layout Snapper

An interactive window-snapping utility overlay for desktop window managers. Built to give power users instant layout tiling—drag any application window to open the overlay visualizer, drop it into a tile, or hold `Shift` to combine adjacent layout zones seamlessly.

---

## 🚀 Features

- **15 Pre-Configured Layout Presets**: Ranging from simple 50/50 splits and 3-column layouts to complex multi-row grid splitters.
- **Dynamic Multi-Zone Snapping**: Hold `Shift` while hovering to expand your selection across adjacent tiles within a group to create custom window spans.
- **Non-Intrusive Overlay**: Automatically appears when a window move/drag operation begins and vanishes immediately after dropping.
- **Accurate Pixel Snapping**: Calculates precise display boundary ratios for single and multi-monitor setups.

---

## 🛠 Usage & Controls

1. **Triggering the Overlay**: Click and drag any application window. The layout picker overlay will appear automatically near the top of your screen.
2. **Basic Snap**: Drag your cursor over any highlighted layout tile and release the window.
3. **Multi-Zone Expand**: Hold **`Shift`** while hovering over a zone to expand the highlight box across adjacent tiles within the same layout preset. Release the mouse button to snap the window across the combined layout bounds.

---

## 📸 Interface Layout

The overlay displays a 3×5 grid of layout presets with centered bottom instruction guidelines:

```text
+-------------------------------------------------------------+
|                      [ Layout Grid ]                        |
|   [ 50/50 ]      [ 3 Col ]      [ 4 Quadrants ]             |
|   [ 75/25 ]      [ 25/50/25 ]  [ 25/75 ]                    |
|   [ 80/20 ]      [ 20/60/20 ]  [ 20/80 ]                    |
|   [ 4 Col ]      [ 5 Col ]      [ 6 Col ]                   |
|   [ 4 Col 2x2 ]  [ 5 Col 2x2 ]  [ 6 Col 2x2 ]               |
|                                                             |
|                    Brand Title Ver 1.0                      |
|            Drag a window onto a zone to snap.               |
|        (Optional) Hold Shift to expand selection.           |
+-------------------------------------------------------------+

```

---

## 🔧 Installation

### Prerequisites

* **GNOME Shell** (compatible with modern GNOME Shell versions)
* `St`, `Clutter`, `Meta`, and `Mainloop` JavaScript bindings available.

### Quick Install (Manual)

1. Clone this repository into your local GNOME Shell extensions directory:
```bash
mkdir -p ~/.local/share/gnome-shell/extensions/
cd ~/.local/share/gnome-shell/extensions/
git clone [https://github.com/your-username/brand-title-layout-snapper.x.org.git](https://github.com/your-username/brand-title-layout-snapper.x.org.git)

```


2. Restart GNOME Shell:
* **Wayland**: Log out and log back in (or restart session).
* **X11**: Press `Alt + F2`, type `r`, and press `Enter`.


3. Enable the extension:
```bash
gnome-extensions enable brand-title-layout-snapper.x.org

```



---

## 🏗 Architecture & Mechanics

For developers looking to port this extension to other desktop environments (KDE, Windows, macOS, or Hyprland/Wayland compositors):

* **Event Listeners**: Hooks into global window move triggers (`grab-op-begin` and `grab-op-end`).
* **Hit Testing Loop**: Uses a `~30ms` polling loop reading screen pointer coordinates `(x, y)` and modifier key bitmasks (`Clutter.ModifierType.SHIFT_MASK`).
* **Multi-Tile Selection Bounding**: Calculates normalized minimum and maximum coordinates ($minX, minY, maxX, maxY$) when holding `Shift` to draw composite target geometry.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

```

```