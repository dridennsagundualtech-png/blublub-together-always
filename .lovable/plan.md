# Optional Our Room mascots

## What will change
- Add a Mascots panel in Our Room with separate show/hide controls for the penguin, seal, and cat.
- Save those choices in the shared room data so both partners see the same mascots for each room.
- Keep the shared seed unchanged and preserve existing mascot positions, sizes, and layers when a mascot is hidden.

## Technical details
- Extend each saved room page with mascot visibility settings, defaulting existing rooms to all three visible.
- Pass the visibility settings into the room scene and omit hidden mascots from rendering and selection.
- Add a shared update action with immediate refresh and error feedback.
- Resolve current typecheck errors and verify the Our Room screen and saved controls.
