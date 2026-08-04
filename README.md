# Snappy Window Tiling - Linux Mint Cinnamon Extension
**Snappy Window Tiling** is a powerful grid-based window management extension for Linux Mint (Cinnamon Desktop). 
Effortlessly organize your windows with mouse-drag overlay zones or fast keyboard navigation.

![Snappy Window Tiling](media/snappy-window-tiling.png)


![alt text](media/SnappyWindowsTiling.gif)
---

## Features

* **Grid & Split Layouts:** Choose from classic half-splits, 3-column layouts, 3x3 grids, 4x4 grids, ultra-wide 5x4 grids, and equal vertical columns.

* **Mouse Drag Snap:** 
  * Drag your window titlebar
  * **Multi-Zone Selection:** Hold `Ctrl` while hovering to span windows across multiple adjacent grid cells simultaneously.
* **Press-and-Hold Zone Expansion:** When the overlay is open (hotkey mode), press and hold the mouse button on a zone, then drag to an adjacent zone to expand the selection — no modifier key required.
* **Keyboard:** 
  * Open with keyboard  `Win+z` / `Super+z` 
  * Use arrow keys or number keys.
  * **Multi-Zone Selection:** Hold `Ctrl` to span windows across multiple adjacent grid cells simultaneously.
* **Workspace Switcher:** Move the focused window to any workspace directly from the overlay.
  * **Drag mode:** Drag a window and drop it onto a workspace box at the bottom of the overlay.
  * **Hotkey mode:** Press `Shift + workspace number` to move instantly, or click a workspace box.
  * **Create workspace:** Drop onto the `+` box to create a new workspace and move the window there.
* **Multi-Monitor Ready:** Automatically detects pointer location to display overlay and target grids on the active monitor.
* **Window Padding:** Configure outer screen padding (gap from screen edges) and inner window padding (gap between adjacent tiled windows) — both default to 0.
* **Layout Presets:** Choose which of the 18 built-in layouts appear in the overlay. Toggle any preset on or off in Settings — changes take effect immediately.
---

## Usage

### 🖱️ Mouse-Drag Mode
1. Drag any window titlebar.
2. Overlay zones display on screen. Hover over your desired target zone and release the mouse button to snap.
3. *(Optional)* Hold `Ctrl` while hovering to select multiple zones simultaneously.
4. *(Optional)* Hover over a **workspace box** at the bottom of the overlay and release to move the window to that workspace. Hover over `+` to create a new workspace.

### ⌨️ Keyboard Mode
1. Press your configured hotkey (e.g., `Super + z` or custom binding).
2. **Step 1:** Select a **Layout Group** using digits `1`–`9` (or `0` for 10th), or navigate with **Arrow Keys** and press `Enter`.
3. **Step 2:** Select a target **Zone Tile** using digit keys or arrow keys.
4. *(Optional)* Hold `Ctrl` while moving arrow keys to select a region spanning multiple tiles. (Hold `Ctrl` down, while you press `Enter` to complete)
5. *(Optional)* **Press-and-Hold:** Click and hold the mouse button on a zone, then drag to an adjacent zone to expand the selection — no `Ctrl` key needed. Release to snap.
6. Press `Enter` to snap!
7. *(Optional)* **Move to workspace:** Press `Shift + 1`–`9` to move the window instantly to that workspace number, or click any workspace box at the bottom of the overlay.


---

## Installation

<!-- ### Option 1: Via Cinnamon Spices (Recommended)
1. Open **System Settings** -> **Extensions**.
2. Click the **Download** tab.
3. Search for **Snappy Window Tiling**.
4. Click **Install**, then activate it under the **Manage** tab. -->

### Manual Installation
#### STEP 1:  Paste this into your terminal:
```bash
curl -L https://github.com/martinandersen3d/LinuxMintWindowSnapZoneTiling/archive/refs/heads/master.zip -o /tmp/ext-swb.zip \
  && unzip /tmp/ext-swb.zip "LinuxMintWindowSnapZoneTiling-master/snappy-window-tiling@martinandersen3d/files/snappy-window-tiling@martinandersen3d/*" -d /tmp/ext-swb \
  && mv "/tmp/ext-swb/LinuxMintWindowSnapZoneTiling-master/snappy-window-tiling@martinandersen3d/files/snappy-window-tiling@martinandersen3d" \
        ~/.local/share/cinnamon/extensions/ \
  && ls ~/.local/share/cinnamon/extensions/snappy-window-tiling@martinandersen3d \
  && echo "[SUCCES] Installation successful!" || echo "[FAILED] Installation failed — files not found." \
  && cinnamon-settings extensions > /dev/null 2>&1 &
```

#### STEP 2: Check files is installed at the correct location:
- `~/.local/share/cinnamon/extensions/snappy-window-tiling@martinandersen3d`
![alt text](media/install-location.png)

#### STEP 3: System Settings → Extensions
1. Open **System Settings → Extensions** and click `Snappy Window Tiling`
2. Click the `+` plus. The `✔️` checkmark should appear.
![alt text](media/extension-settings.png)


---

# Settings

## ⚙️ How to Customize the Hotkey

You can easily change the shortcut key used to trigger the overlay:

1. Open **System Settings** -> **Extensions**.
2. Locate **Snappy Window Tiling** under the **Manage** tab.
3. Click the **Gear icon** (⚙️) next to the extension to open its settings window.
4. Click on the **Toggle Overlay Shortcut** field and press your preferred key combination (e.g., `<Super>z`).
5. The shortcut updates immediately—no system restart required!

### Features

| Setting | Default | Description |
| :--- | :---: | :--- |
| **Enable drag-to-snap** | ✅ On | Show the zone overlay when dragging a window by its titlebar. Disable this if you only want keyboard-based snapping. |
| **Enable keyboard hotkey** | ✅ On | Register the global hotkey that opens the overlay for the focused window. Disable this if you only want drag-to-snap. |
| **Show workspace switcher** | ✅ On | Show the workspace row at the bottom of the overlay. Disable to hide it and reduce the overlay height. |

### Window Padding

| Setting | Default | Description |
| :--- | :---: | :--- |
| **Outer Screen Padding** | `0 px` | Gap between the window and the screen edge (applies to all 4 sides). |
| **Inner Window Padding** | `0 px` | Gap between two adjacent tiled windows. Each window contributes half, so the total gap equals this value. |

### Layout Presets

Toggle each layout on or off. The overlay rebuilds automatically when you save — no restart needed.

| Preset | Default | Description |
| :--- | :---: | :--- |
| **Full Screen (1x1)** | ✅ On | Single full-screen zone |
| **Half Split (Vertical)** | ✅ On | Left / Right equal halves |
| **2x2 Grid** | ✅ On | Four equal quadrants |
| **3 Column (Equal)** | ✅ On | Three equal vertical columns |
| **3 Column (Wide Center)** | ✅ On | 25 % – 50 % – 25 % |
| **3 Column (Focus Center)** | ✅ On | 20 % – 60 % – 20 % |
| **4 Column (Equal)** | ✅ On | Four equal vertical columns |
| **5 Column (Equal)** | ✅ On | Five equal vertical columns |
| **6 Column (Equal)** | ✅ On | Six equal vertical columns |
| **2x4 Grid** | ✅ On | 2 cols × 4 rows (8 zones) |
| **3x2 Grid** | ✅ On | 3 cols × 2 rows (6 zones) |
| **3x3 Grid** | ✅ On | 9-zone grid |
| **4x2 Grid** | ✅ On | 4 cols × 2 rows (8 zones) |
| **5x2 Grid** | ✅ On | 5 cols × 2 rows (10 zones) |
| **6x2 Grid** | ✅ On | 6 cols × 2 rows (12 zones) |
| **4x4 Grid** | ✅ On | 16-zone grid |
| **5x4 Grid (Ultra Wide)** | ✅ On | 20-zone grid for ultra-wide monitors |
| **6x4 Grid** | ✅ On | 24-zone grid |
| **Golden Ratio (Left/Right)** | ❌ Off | 75 % / 25 % splits |
| **Focus Left/Right (80/20)** | ❌ Off | 80 % / 20 % splits |
| **4–6 Column (Split)** | ❌ Off | Columns each split into top & bottom |
| **Horizontal Strips (3–5)** | ❌ Off | N horizontal bands |
| **Misc grids** | ❌ Off | 2x3, 2x5, 3x4, 4x3, 5x3, and more |

### Keyboard Shortcuts

| Setting | Default | Description |
| :--- | :---: | :--- |
| **Hotkey** | `Super + Z` | The global key combination that triggers the overlay. Click the field and press any key combination to change it. Changes take effect immediately — no restart required. |


---

# Video

### Intro:

<video src="https://github.com/user-attachments/assets/e2b41e14-1913-4e71-a6f9-a2d0c9555e4b" controls width="100%">
  Your browser does not support the video tag.
</video>

### Hold `Ctrl` while you mouse drag to Multi-Select:
<video src="https://github.com/user-attachments/assets/f112f0b4-b67c-4063-8df2-08797c61ba3c" controls width="100%">
  Your browser does not support the video tag.
</video>

### Hotkey Win+z to Activate and use keyboard Digits to Navigate:
<video src="https://github.com/user-attachments/assets/c90b9a84-17af-4a46-bcfc-4dd377a599e9" controls width="100%">
  Your browser does not support the video tag.
</video>

### Hotkey Win+z to Activate and use keyboard Arrows to Navigate:
<video src="https://github.com/user-attachments/assets/f2a2ab83-7ba6-4729-9da3-96bb84b92414" controls width="100%">
  Your browser does not support the video tag.
</video>



# Give Feedback
- Please fill out the Google Form:

[Google Form](https://docs.google.com/forms/d/e/1FAIpQLSe1l6zMp43RCTdPos1klIzashABJXVLgVJUtCyhia7ddoa9RQ/viewform?usp=header)











