# TODO - Feature
- Settings:
    - Be able to select what presets you want to see

- Edge Gap: In settings, there should be a Window Padding / border distance,  setting, that will set how many pixels from the edge there should be a gap.

- Touchscreen: I need to verify that it works here. And maybe there should be some alternative way to activate the popup. When there is a touchscreen (on screen keyboard - I dont think you can trigger keyboard hotkeys like Super+z)

# TODO - BuG
- Press-and-hold
    - When activated with hotkey, user should be able to:
        - 1. Press mouse down on a zone
        - 2. Hold the mouse down and expand the zone to a adjacent zone, without modifier keys.
        - See ref: https://www.reddit.com/r/unixporn/comments/1t5woya/cinnamon_cyberpunk_aesthetic_on_linux_mint/
    


---
# DONE - Feature


# DONE - BuG
- Title Click Protection: Clicking on a title, the popup panel will show up. The popup panel should first be shown when it has been moved more than 5 pixels.
- Bug: Use CTRL instad of Ctrl - The Ctrl key tries to snap the window (Cinnamon default feature)
- Bug:
    - 1. CTRL is pressed down
    - 2. A few Zones is selected (Ctrl still pressed)
    - 3. mouse is moved outside the panel
    - 4. Try release the Ctrl while dragging outside panel, then press Ctrl again.
    - 5. The selected zones is stuck. This is a bug. When the mouse leaves the panel, nothing should be selected
