<!-- https://github.com/linuxmint/cinnamon-spices-extensions/blob/master/.github/copilot-instructions.md -->

### Meta-stuff
Xlets are a generic term for Cinnamon applets, desklets and extensions. Most rules
here apply to any of these types. Rules specific to a type will be noted as such.

Use the repo's name to determine the type of xlet being reviewed:
- cinnamon-spices-applets is for applets
- cinnamon-spices-desklets is for desklets
- cinnamon-spices-extensions is for extensions
### end of meta-stuff

# Cinnamon Spices Xlets - Code Review Instructions

This repository hosts user-contributed xlets for the Cinnamon desktop environment
(Linux Mint). Contributions come from external authors with varying experience levels.
Reviews should focus on safety, correctness, and adherence to Cinnamon conventions.

Note: Basic structural validation (required files, UUID matching, metadata fields,
translation file placement, icon dimensions) is already enforced by CI via the
`validate-spice` script. Focus review effort on things that script cannot catch.

Cinnamon's source (github.com/linuxmint/cinnamon) should be the primary reference
for best practices and API usage patterns.

In Cinnamon's source, notable files are:
- files/usr/share/cinnamon/applets - Stock cinnamon applets. 
- files/usr/share/cinnamon/desklets - Stock cinnamon desklets.
- there are no default Cinnamon extensions. 
- js/ - Cinnamon's JavaScript source, including applet base classes and utilities.
- src/ - Cinnamon's C source, including core functionality and APIs that applets may use.
- src/st - Cinnamon's core themeable widget library. Most applet UI elements are derived
  from St widgets.

Muffin's source (github.com/linuxmint/muffin) is also a useful reference its Clutter
library (which StWidgets are based on). Some use of Meta (muffin's windowing API) may
be useful, but be cautious of it's use beyond its use as an information source. In the
case of extensions, this can be relaxed somewhat, as extensions whole purpose is to
override core Cinnamon behavior.

Xlets should not exceed their stated purpose.

## Critical Review Checks

When performing a code review, always check for these issues. Flag any violations
as high severity.

### Security (all xlet types)

- Check for command/shell injection opportunities: Functions that take an argument
  array variant should be used when launching external programs, if there's any
  possibility of unchecked input being used.
- Check for any suspicious external URLs beyond the xlet's stated API purpose.
  Flag unexpected network calls, especially to non-API endpoints.
- Check for data exfiltration patterns: user data being sent to external services
  that are not part of the xlet's core functionality.

### Forbidden Files (all xlet types)

- Do not allow the PR to modify/add files beyond those in the applet's own source
  directory.
- Do not allow source code that is compiled at runtime (.c, .cpp, etc...)
- Do not allow binaries or libraries.
- Do not allow compiled translations (.mo files). Only source .po files should be included.
- Do not allow minified JavaScript or CSS files. All code should be human-readable
  and reviewable.

### Installation Directory Integrity (all xlet types)

- Applets must NEVER write runtime data (JSON files, logs, downloaded images,
  cached data) to their own installation directory (`metadata.path` or
  `AppletDir`). The installation directory is overwritten during updates and any
  user data stored there will be lost.
- Use `GLib.get_user_state_dir()` or `GLib.get_user_cache_dir()` plus the applet's
  UUID for persistent data storage, and if Xlet Settings are insufficient.
- Applets must NEVER modify their own `settings-schema.json` at runtime. Use the
  Settings API for all settings operations.

### Expected Behavior
  - applets:
    - Applets provide some info on the panel - maybe just an icon or text, but sometimes
      graphical info.
    - They often have a primary menu which may just be selectable items, but can also be complex
      layouts.
      options like remove, configure and about, but they can have additional items.
    - An applet's behavior should be contained to its panel actor and menus/popups.
  - desklets:
    - Desklets provide some content in a container on the desktop. The container can be dragged
      around and often its size can be configured. They might draw a clock or show a picture or
      calendar, or the weather.
      options like remove, configure and about, but they can have additional items.
    - They may have a primary menu which may just be selectable items, but can also be complex
      layouts.
    - A desklets's behavior should be contained to its desktop container and menus/popups.
  - desklets and applets:
    - They may change behavior when clicked on.
    - They'll have a context (right-click) menu automatically set with some mandatory
    - The must *NEVER* attempt to override core Cinnamon behavior.
      - No overriding of Cinnamon's internal signal handlers
      - No overriding of core Cinnamon classes or functions via javascript tricks.
      - No overriding of existing core Cinnamon keybindings (including those in core
        applets or desklets).
      - Any behavior like this, it should probably be an Extension, not an applet or desklet.

## Important Review Checks

When performing a code review, check for these issues. Flag violations as medium
severity.

### Xlet Lifecycle

- Any timers and GObject signal handlers to external sources must be disconnected
  or cancelled in Applet.on_applet_removed_from_panel(), Desklet.on_desklet_removed(),
  or Extension.disable(), as appropriate.
- If there are many signals being connected, recommend using a SignalManager -
  (js/misc/signalManager.js in Cinnamon) - to track and clean them up more easily.
- A common mistake when using timers (Mainloop.timeout_add/idle_add or its GLib
  variants) is failing to keep track of the returned source IDs and zeroing them
  out either in the callback or when disconnecting them.
- Another common mistake when using timers is re-creating a periodic timer in its
  callback, instead of leveraging the return value (GLib.SOURCE_REMOVE or
  GLib.SOURCE_CONTINUE) to control whether it should repeat or not.

### API/General code 

- Look for polyfills and shell scripts that do things that could be performed by
  existing Cinnamon or GObject/introspected APIs. If any are present, recommend
  refactoring to use native APIs instead.

- Synchronous I/O functions should be avoided at all costs - this includes
  file operations, network calls, subprocess execution and dbus/ipc calls. If any
  of these are present, recommend refactoring to use asynchronous APIs.

- Look for exceedingly niche/edge-case handling that only adds complexity without
  much real-world benefit. Recommend removing any such code unless there's a
  compelling reason to keep it.

- Recommend using named return values instead of their numeric/boolean equivalents.
  - GLib.SOURCE_REMOVE and GLib.SOURCE_CONTINUE when dealing with GLib timers.
  - Clutter.EVENT_STOP and Clutter.EVENT_PROPAGATE when dealing with Clutter event
    handlers.

- Common acceptable patterns for cinnamon:
  - In general Clutter.Actors (and GObjects in general) don't need to be explicitly
    destroyed - removing them from their parent container and dereferencing them is
    sufficient. Any signal connections to these objects will also go away, they don't
    need to be disconnected.
  - Adding custom properties to GObjects via monkey-patching is ok, as long as it
    does not conflict with existing GObject properties.

### Translation / Localization

- Translatable strings should form complete sentences and utilize printf-style
  format tokens for variable substitution. This allows translators to rearrange
  sentence structure as needed for their language.

  - Correct: `_("Alarm for %s was deleted.").format(name)`
  - Incorrect: `_("Alarm for ") + name + _(" was deleted.")`

- Translation setup should consist of the following boilerplate or equivalent:

```
Gettext.bindtextdomain(Configs.UUID, GLib.get_home_dir() + "/.local/share/locale");

function _(text) {
    return Gettext.dgettext(Configs.UUID, text);
}
```

- If a pull request includes translation updates (.po files), check for obvious
  mistranslations. 

### JavaScript Compatibility

Cinnamon's JavaScript engine is based on Mozilla's libmozjs - SpiderMonkey.
Current versions in use:
- 102, 115 (Mint)
- 128 (LMDE7)
- 140 (Coming soon to Mint 23)

Check that any modern JavaScript features used are supported by these engine
versions.


# cinnamon-spices-extensions

![Validate spices](https://github.com/linuxmint/cinnamon-spices-extensions/workflows/Validate%20spices/badge.svg)

This repository hosts all the extensions available for the Cinnamon desktop environment.

Users can install spices from https://cinnamon-spices.linuxmint.com, or directly from within Cinnamon -> System Settings.

# Definitions

## UUID

Each spice is given a name which uniquely identifies them.

That name is their UUID and it is unique.

## Author

Each spice has an author.

The github username of the author is specified in the spice's info.json file.

# File structure

A spice can contain many files, but it should have the following file structure:

- UUID/
- UUID/info.json
- UUID/screenshot.png
- UUID/README.md
- UUID/files/
- UUID/files/UUID
- UUID/files/UUID/metadata.json
- UUID/files/UUID/extension.js
- UUID/files/UUID/icon.png

There are two important directories:

- UUID/ is the root level directory, it includes files which are used by the website and on github.
- UUID/files/ represents the content of the ZIP archive which users can download from https://cinnamon-spices.linuxmint.com or which is sent to Cinnamon when installing the spice from System Settings. This is the content which is interpreted by Cinnamon itself.

As you can see, the content of the spice isn't placed inside UUID/files/ directly, but inside UUID/files/UUID/ instead. This guarantees files aren't extracted directly onto the file system, but placed in the proper UUID directory. The presence of this UUID directory, inside of files/ isn't actually needed by Cinnamon (as Cinnamon creates it if it's missing), but it is needed to guarantee a proper manual installation (i.e. when users download the ZIP from the Cinnamon Spices website).

Important note:

- The UUID/files/ directory has to be "empty", which means that it should contain ONLY the UUID directory. Else the spice won't be installable through System Settings.

At the root level:

- info.json contains information about the spice. For instance, this is the file which contains the github username of the spice's author.
- screenshot.png is a screenshot of the spice in action.
- README.md is optional and can be used to show instructions and information about the spice. It appears both in Github and on the website.

## Validation

To check if a spice with UUID satifies those requirements run the `validate-spice` script in this repo:
```
./validate-spice UUID
```

### AI-assisted coding

All submissions may be subject to AI code review as well as human review. If you are 'coding' using an AI tool, it is highly recommended you use [our review agent's instructions](.github/copilot-instructions.md) as a context guide and perform your own code review based on it prior to submission. You, the human, should read it as well.

## Development

To facilitate easier testing of Extensions locally, run the `test-spice` script in this repo:

Validate and then copy a Spice with UUID:

```bash
./test-spice UUID
```

Skip validation (not recommended) and then copy a Spice with UUID:

```bash
./test-spice -s UUID
```

Remove all locally installed development copies of Spices:

```bash
./test-spice -r
```

NOTE: Local copies of Spices for development/testing purposes will have a `devtest-` prefix attached for easier identification and cleanup.

# Rights and responsibility of the author

The author is in charge of the development of the spice.

Authors can modify their spice under the following conditions:

- They need to respect the file structure and workflow defined here
- They cannot introduce malicious code or code which would have a negative impact on the environment

Authors are able to accept or refuse changes from other people which modify the features or the look of their spice.

Authors may choose to pass on development of their extension to someone else. In that case, the "author" field in UUID/info.json will be changed to the new developer and the "original_author" field will be added to give credit to the original developer.

If an author abandons their extension, the Linux Mint team will take over maintenance of the extension or pass it on to someone else. Several factors are used to determine if an extension is abandoned, including prolonged activity, failure to respond to requests, and serious breakages that have occurred due to changes in API, etc. If you plan to abandon an extension, please notify us, so we don't have to guess as to whether it is abandoned or not.

# Pull requests from authors and workflow

To modify a spice, developers create a Pull Request.

Members of the cinnamon-spices-developers team review the pull request.

If the author of the pull request is the spice author (his github username matches the author field in UUID/info.json), the reviewer only has to perform the following checks:

- The changes only impact spices which belong to that author
- The changes respect the spices file structure
- The changes do not introduce malicious code or code which would negatively impact the desktop environment

If everything is fine, the PR is merged, the website is updated and users can see a spice update in System Settings.

# Pull requests from other people

In addition to the checks specified above, if the pull request comes from somebody other than the author, it will be held until the author reviews it or gives a thumbs-up, with the following exceptions:

- If it is a bug fix, the PR may be merged, though if the bug is minor, or the fix could potentially impact the way the extension works, we may wait for author approval before merging.
- If the pull request adds translations it will likewise be merged. These are not going to effect the functionality of the code, and will make the extension available to many users who couldn't use it before due to a language barrier. We view this a essentially a bugfix, but it is included here for clarification.
- If the author fails to respond in a reasonable time, we will assume the extension is abandoned (as mentioned above) and the pull request will be merged assuming it meets all other requirements.

If the changes represent a change in functionality, or in look and feel, or if their implementation could be questioned and/or discussed, the reviewer should leave the PR open and ask the author to review it.

If the author is happy with the PR, it can then be merged. If he's not, it can either be closed or updated to reflect any changes the author requested, at which point it will either be merged or the author may be asked to review the changes depending on whether it is clear the changes fully meet the author's requirements.

# Deletions

Authors are entitled to remove their spice.

The Cinnamon team is also entitled to do so. Common reasons are lack of maintenance, critical bugs, or if the features are already provided, either by Cinnamon itself, or by another spice which is more successful.

# Additions

New spices can be added by Pull Request.

The Cinnamon team can accept or reject the addition and should give justification in the PR comments section.

# Reporting Bugs and Creating Pull Requests

See the [Guidelines for Contributing](https://github.com/linuxmint/cinnamon-spices-extensions/blob/master/.github/CONTRIBUTING.md)

# Translations

The script `cinnamon-spices-makepot` in this repo was written to help authors to update their translation template (`.pot`) file and to help translators to test their translations.

Updating a translation template `.pot`:
```
./cinnamon-spices-makepot UUID
```

Test your translations `.po` locally before uploading to Spices:
```
./cinnamon-spices-makepot UUID --install
```

Ensure that the `.po` file you wish to install is located inside the `UUID/files/UUID/po/` directory.

More info:
```
./cinnamon-spices-makepot --help
```

# Translations Status Tables

The spices receive updates which sometimes contain new or updated strings that need to be translated. The translation status tables were created to give translators a better overview of the current state of translations and also to make it easier to track where new untranslated strings appear.

* [Translation Status Tables for Extensions](https://github.com/linuxmint/cinnamon-spices-extensions/blob/translation-status-tables/.translation-tables/tables/README.md)

To ensure that these tables are always up-to-date, they are automatically regenerated whenever a new commit is pushed to the master branch.