# Snappy Window Tiling - Linux Mint Cinnamon Extension
**Snappy Window Tiling** is a powerful grid-based window management extension for Linux Mint (Cinnamon Desktop). 
Effortlessly organize your workspace using fast keyboard navigation or seamless mouse-drag overlay zones.

![Snappy Window Tiling](../media/snappy-window-tiling.png)




![alt text](../media/SnappyWindowsTiling.gif)
---

## Features

* **Grid & Split Layouts:** Choose from classic half-splits, 3-column layouts, 3x3 grids, 4x4 grids, ultra-wide 5x4 grids, and equal vertical columns.
* **Dual Navigation Modes:** 
  * **Hotkey Overlay:** Trigger with a configurable keyboard shortcut to snap the focused window step-by-step using digit keys or arrow keys.
  * **Mouse Drag Snap:** Hold/drag your window to view visual snap zones dynamically.
* **Multi-Zone Selection:** Hold `Ctrl` to span windows across multiple adjacent grid cells simultaneously.
* **Multi-Monitor Ready:** Automatically detects pointer location to display overlay and target grids on the active monitor.
---

## Usage

### 🖱️ Mouse-Drag Mode
1. Drag any window titlebar.
2. Overlay zones display on screen. Hover over your desired target zone and release the mouse button to snap.
3. *(Optional)* Hold `Ctrl` while hovering to select multiple zones simultaneously.

### ⌨️ Keyboard Mode
1. Press your configured hotkey (e.g., `Super + G` or custom binding).
2. **Step 1:** Select a **Layout Group** using digits `1`–`9` (or `0` for 10th), or navigate with **Arrow Keys** and press `Enter`.
3. **Step 2:** Select a target **Zone Tile** using digit keys or arrow keys.
4. *(Optional)* Hold `Ctrl` while moving arrow keys to select a region spanning multiple tiles. (Hold `Ctrl` down, while you press `Enter` to complete)
5. Press `Enter` to snap!

---

## ⚙️ How to Customize the Hotkey

You can easily change the shortcut key used to trigger the overlay:

1. Open **System Settings** -> **Extensions**.
2. Locate **Snappy Window Tiling** under the **Manage** tab.
3. Click the **Gear icon** (⚙️) next to the extension to open its settings window.
4. Click on the **Toggle Overlay Shortcut** field and press your preferred key combination (e.g., `<Super>z`).
5. The shortcut updates immediately—no system restart required!

---

### Installation

<!-- ### Option 1: Via Cinnamon Spices (Recommended)
1. Open **System Settings** -> **Extensions**.
2. Click the **Download** tab.
3. Search for **Snappy Window Tiling**.
4. Click **Install**, then activate it under the **Manage** tab. -->

### Manual Installation
#### STEP 1:  Paste this into your terminal:
```bash
curl -L https://github.com/USERNAME/REPO/archive/refs/heads/main.zip -o /tmp/ext-swb.zip \
  && unzip /tmp/ext-swb.zip "REPO-main/SnappyWindowBorderResizing@martinandersen/files/SnappyWindowBorderResizing@martinandersen/*" -d /tmp/ext-swb \
  && mv "/tmp/ext-swb/REPO-main/SnappyWindowBorderResizing@martinandersen/files/SnappyWindowBorderResizing@martinandersen" \
        ~/.local/share/cinnamon/extensions/
```


#### STEP 2: Check files is installed at the correct location:
- `~/.local/share/cinnamon/extensions/SnappyWindowBorderResizing@martinandersen3d`
![alt text](media/install-location.png)

#### STEP 3: System Settings → Extensions
1. Open **System Settings → Extensions** and click `Snappy Window Tiling`
2. Click the `+` plus. The `✔️` checkmark should appear.
![alt text](../media/extension-settings.png)


---

## ⚙️ Configuration

Open **System Settings → Extensions**, select **Snappy Window Tiling**, and click the **Gear icon** (⚙️).

### Features

| Setting | Default | Description |
| :--- | :---: | :--- |
| **Enable drag-to-snap** | ✅ On | Show the zone overlay when dragging a window by its titlebar. Disable this if you only want keyboard-based snapping. |
| **Enable keyboard hotkey** | ✅ On | Register the global hotkey that opens the overlay for the focused window. Disable this if you only want drag-to-snap. |

### Keyboard Shortcuts

| Setting | Default | Description |
| :--- | :---: | :--- |
| **Hotkey** | `Super + Z` | The global key combination that triggers the overlay. Click the field and press any key combination to change it. Changes take effect immediately — no restart required. |

---

## Layout Options

Snappy Window Tiling includes built-in configurations for almost any workflow:

| Category | Available Layouts |
| :--- | :--- |
| **Standard Splits** | Left/Right, Split Quarter Grid, Asymmetric Wide/Narrow Splits |
| **Vertical Columns** | 3-Column, 4-Column, 5-Column, 6-Column Equal Layouts |
| **Grid Power-User** | 3x3, 4x4, and 5x4 Precision Grids |

---

