const Settings = imports.ui.settings;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const ByteArray = imports.byteArray;

let _settings = null;
let _uuid = "";

// ---------------------------------------------------------------------------
// File logger — writes to /tmp/snappy-window-tiling.log
// ---------------------------------------------------------------------------
const LOG_PATH = GLib.build_filenamev([GLib.get_tmp_dir(), 'snappy-window-tiling.log']);

function log(message) {
    try {
        let timestamp = new Date().toISOString();
        let line = '[' + timestamp + '] ' + message + '\n';
        let file = Gio.File.new_for_path(LOG_PATH);
        let stream = file.append_to(Gio.FileCreateFlags.NONE, null);
        stream.write(ByteArray.fromString(line), null);
        stream.close(null);
    } catch (e) {
        global.logError("[snappy] File log error: " + e.message);
    }
}

function clearLog() {
    try {
        let file = Gio.File.new_for_path(LOG_PATH);
        if (file.query_exists(null)) {
            file.delete(null);
        }
        log("=== Snappy Window Tiling started ===");
    } catch (e) {
        global.logError("[snappy] clearLog error: " + e.message);
    }
}

// ---------------------------------------------------------------------------

function init(uuid) {
    _uuid = uuid;
    clearLog();
    log("init() uuid=" + uuid);
}

/**
 * Creates the ExtensionSettings instance. Call once from enable().
 * @param {Object} extensionObject - the extension's 'this' context (module global)
 */
function createSettings(extensionObject) {
    try {
        log("createSettings() uuid=" + _uuid);
        _settings = new Settings.ExtensionSettings(extensionObject, _uuid);
        log("createSettings() OK  drag=" + isDragEnabled() + "  keyboard=" + isKeyboardEnabled() + "  hotkey=" + getHotkey());
    } catch (e) {
        log("createSettings() ERROR: " + e.message);
        global.logError("[drag-overlay] SettingsManager.createSettings error: " + e.message);
    }
}

function isDragEnabled() {
    try {
        return _settings ? _settings.getValue("enable-drag-snapping") : true;
    } catch (e) {
        return true;
    }
}

function isKeyboardEnabled() {
    try {
        return _settings ? _settings.getValue("enable-keyboard-snapping") : true;
    } catch (e) {
        return true;
    }
}

function getHotkey() {
    try {
        return _settings ? _settings.getValue("toggle-snappy-window-tiling") : "<Super>z";
    } catch (e) {
        return "<Super>z";
    }
}

function getOuterScreenPadding() {
    try {
        return _settings ? _settings.getValue("outer-screen-padding") : 0;
    } catch (e) {
        return 0;
    }
}

function getInnerWindowPadding() {
    try {
        return _settings ? _settings.getValue("inner-window-padding") : 0;
    } catch (e) {
        return 0;
    }
}

function isLayoutEnabled(key) {
    try {
        return _settings ? _settings.getValue(key) : true;
    } catch (e) {
        return true;
    }
}

function isWorkspaceSwitcherEnabled() {
    try {
        return _settings ? _settings.getValue("enable-workspace-switcher") : true;
    } catch (e) {
        return true;
    }
}

/**
 * Connect a callback to a settings key change.
 * @param {string} key - settings key name
 * @param {Function} callback
 */
function connectChanged(key, callback) {
    try {
        if (_settings) {
            _settings.connect("changed::" + key, callback);
            log("connectChanged() listening on " + key);
        }
    } catch (e) {
        log("connectChanged() ERROR key=" + key + " : " + e.message);
        global.logError("[drag-overlay] SettingsManager.connectChanged error: " + e.message);
    }
}

function destroy() {
    try {
        log("destroy() called");
        if (_settings) {
            _settings.finalize();
            _settings = null;
        }
        log("destroy() OK");
    } catch (e) {
        log("destroy() ERROR: " + e.message);
        global.logError("[drag-overlay] SettingsManager.destroy error: " + e.message);
    }
}
