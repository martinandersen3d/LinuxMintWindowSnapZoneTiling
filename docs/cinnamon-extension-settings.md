# How to Add Settings to a Cinnamon Extension

Lessons learned from building `snappy-window-tiling@martinandersen`.

---

## File Structure

```
UUID/
  extension.js
  settingsManager.js   ← settings logic in a separate file (optional but clean)
  settings-schema.json
  metadata.json
  stylesheet.css
  icon.png
```

---

## settings-schema.json

The schema defines the settings UI shown in **System Settings → Extensions → gear icon**.

### Critical rule: sections must be nested inside `layout`

The Python settings parser (`xlet-settings.py`) does `layout[section_key]`, so **pages and sections must be defined inside the `layout` object**. Setting definitions (the actual keys) stay at the top level.

```json
{
    "layout": {
        "type": "layout",
        "pages": ["main"],
        "main": {
            "type": "page",
            "title": "My Extension",
            "sections": ["features-section", "shortcuts-section"]
        },
        "features-section": {
            "type": "section",
            "title": "Features",
            "keys": ["enable-feature-a", "enable-feature-b"]
        },
        "shortcuts-section": {
            "type": "section",
            "title": "Keyboard Shortcuts",
            "keys": ["my-hotkey"]
        }
    },
    "enable-feature-a": {
        "type": "switch",
        "description": "Enable feature A",
        "default": true
    },
    "enable-feature-b": {
        "type": "switch",
        "description": "Enable feature B",
        "default": true
    },
    "my-hotkey": {
        "type": "keybinding",
        "description": "Hotkey to trigger action",
        "default": "<Super>z"
    }
}
```

### Common setting types

| Type          | Widget shown        |
|---------------|---------------------|
| `switch`      | Toggle switch       |
| `checkbox`    | Checkbox (older)    |
| `keybinding`  | Key binding picker  |
| `entry`       | Text input          |
| `spinbutton`  | Number spinner      |
| `combobox`    | Dropdown            |
| `colorchooser`| Colour picker       |

---

## metadata.json

Cinnamon warns if `url` is missing. Include both `website` and `url`:

```json
{
  "uuid": "my-extension@author",
  "name": "My Extension",
  "description": "What it does.",
  "url": "https://github.com/author/repo",
  "website": "https://github.com/author/repo",
  "author": "Author Name",
  "cinnamon-version": ["5.0", "5.2", "5.4", "5.6", "5.8", "6.0", "6.2", "6.4", "6.6", "6.8"]
}
```

---

## Importing a Sibling JS File

`imports['my-extension@author']['my-module']` is **unreliable** because the `@` character in the UUID breaks GJS's property lookup.

### Correct pattern — push to `imports.searchPath` in `init()`

```js
// extension.js

let MyModule = null;  // declared at top level, assigned lazily

function init(metadata) {
    // Add the extension's own directory so 'imports.myModule'
    // resolves to myModule.js in the same folder.
    imports.searchPath.push(metadata.path);
    MyModule = imports.myModule;
    MyModule.init(metadata.uuid);
}
```

The module file must use a **valid JS identifier** as the filename (no hyphens).
- ✅ `settingsManager.js`  → `imports.settingsManager`
- ❌ `settings-manager.js` → `imports['settings-manager']` (unreliable)

---

## Reading Settings in Code — `Settings.ExtensionSettings`

```js
// settingsManager.js
const Settings = imports.ui.settings;

let _settings = null;
let _uuid = "";

function init(uuid) {
    _uuid = uuid;
}

// Call once from enable()
function createSettings(extensionObject) {
    _settings = new Settings.ExtensionSettings(extensionObject, _uuid);
}

function getValue(key) {
    return _settings ? _settings.getValue(key) : null;
}

// Listen for a setting change
function connectChanged(key, callback) {
    if (_settings) {
        _settings.connect("changed::" + key, callback);
    }
}

// Call from disable()
function destroy() {
    if (_settings) {
        _settings.finalize();   // ← correct cleanup method
        _settings = null;
    }
}
```

### Methods that DO and DO NOT exist on `ExtensionSettings`

| Method                    | Exists? | Notes                                      |
|---------------------------|---------|--------------------------------------------|
| `getValue(key)`           | ✅      | Read a setting value                       |
| `setValue(key, value)`    | ✅      | Write a setting value                      |
| `connect("changed::key")` | ✅      | Listen for a specific key change           |
| `finalize()`              | ✅      | Disconnect all bindings — use in `disable()`|
| `bindProperty(...)`       | ✅      | Two-way bind to a GObject property         |
| `unbindKeybinding(key)`   | ❌      | Does **not** exist — use `finalize()` instead |

---

## Wiring Up a Keybinding

The schema stores the hotkey string; the extension registers it manually.

```js
// extension.js

function enable() {
    MyModule.createSettings(this);

    function refreshHotkey() {
        Main.keybindingManager.removeHotKey("my-hotkey");
        if (MyModule.getValue("enable-keyboard")) {
            Main.keybindingManager.addHotKey(
                "my-hotkey",
                MyModule.getValue("my-hotkey"),
                onHotkeyTriggered
            );
        }
    }

    refreshHotkey();

    // Re-register when the user changes the hotkey or the keyboard toggle
    MyModule.connectChanged("my-hotkey", refreshHotkey);
    MyModule.connectChanged("enable-keyboard", refreshHotkey);
}

function disable() {
    Main.keybindingManager.removeHotKey("my-hotkey");
    MyModule.destroy();
}
```

---

## Debugging Tips

### Looking Glass (in-session JS console)
Press `Alt+F2`, type `lg`, press Enter. Errors tab shows runtime errors.

### File logger
Write a `log()` helper that appends to `/tmp/my-extension.log`:

```js
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const ByteArray = imports.byteArray;

const LOG_PATH = GLib.build_filenamev([GLib.get_tmp_dir(), 'my-extension.log']);

function log(message) {
    try {
        let line = '[' + new Date().toISOString() + '] ' + message + '\n';
        let file = Gio.File.new_for_path(LOG_PATH);
        let stream = file.append_to(Gio.FileCreateFlags.NONE, null);
        stream.write(ByteArray.fromString(line), null);
        stream.close(null);
    } catch (e) {}
}
```

Then on Linux: `tail -f /tmp/my-extension.log`

### Restarting Cinnamon from terminal
```bash
cinnamon --replace &
```

### Opening the settings panel directly
```bash
cinnamon-settings extensions
```
Then click the extension row and click the gear icon that appears.

---

## Common Gotchas

| Problem | Cause | Fix |
|---|---|---|
| Settings window does nothing | `settings-schema.json` sections at top level | Move sections inside `layout` object |
| Extension won't load | Hyphen in imported module filename | Rename to camelCase (`settingsManager.js`) |
| Extension won't load | UUID-based `imports['uuid']['module']` fails | Use `imports.searchPath.push(metadata.path)` + `imports.module` |
| `unbindKeybinding is not a function` | Method doesn't exist | Use `finalize()` instead |
| Configure button not appearing | Cinnamon cached extension without settings | Run `cinnamon --replace &` after adding `settings-schema.json` |
| Gear icon not visible | Must click the extension row first | Select the row — the gear appears per-row on selection |
